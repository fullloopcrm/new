/**
 * Dedup for Telegram webhook deliveries.
 *
 * Telegram retries webhook delivery when the handler doesn't ack quickly
 * (documented behavior — a slow or timed-out response is treated as failed
 * and redelivered). All three Telegram routes (platform-owner, jefe,
 * per-tenant) run an LLM agent loop (askSelena/askJefe) that can call
 * side-effecting owner tools — refunds, broadcasts, cron triggers, bookings.
 * A retried delivery re-runs the SAME inbound message through the agent a
 * second time, which can re-trigger those side effects (e.g. a duplicate
 * Stripe refund — see selena/tools.ts's process_stripe_refund idempotency
 * key, a second layer of defense for that specific tool).
 *
 * Every Telegram Update carries a bot-unique `update_id`. Claim it via an
 * insert-first + unique-constraint pattern (same shape as this session's
 * other duplicate-write races — schedule_issues, clients import, journal
 * entries): the first delivery's insert wins, a retry's insert 23505s and is
 * treated as an already-processed no-op. If the dedup table write fails for
 * a reason OTHER than a genuine conflict (table missing pre-migration, a
 * transient DB error), fail OPEN — log and let the message process rather
 * than silently dropping a legitimate owner instruction.
 */
import { supabaseAdmin } from '@/lib/supabase'

export interface TelegramUpdateClaimResult {
  isDuplicate: boolean
}

export async function claimTelegramUpdate(
  botScope: string,
  updateId: number | undefined
): Promise<TelegramUpdateClaimResult> {
  if (!updateId && updateId !== 0) return { isDuplicate: false }

  const result = await supabaseAdmin
    .from('telegram_webhook_events')
    .insert({ bot_scope: botScope, update_id: updateId })
  const error = result?.error

  if (!error) return { isDuplicate: false }

  if (error.code === '23505') {
    return { isDuplicate: true }
  }

  console.warn('[telegram dedup] claim insert failed, processing anyway:', error.message)
  return { isDuplicate: false }
}
