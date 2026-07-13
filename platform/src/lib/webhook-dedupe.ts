import { supabaseAdmin } from '@/lib/supabase'

/**
 * Claim a webhook event id in `processed_webhook_events`. Returns true if this
 * call won the claim (first delivery) and the caller should proceed; false if
 * it was already claimed (a replay) and the caller must short-circuit.
 *
 * Fail-CLOSED: a missing/blank id can't be deduped, so we refuse to process
 * (return false) rather than risk a duplicate agent run / SMS send. Atomic via
 * insert-first + catch-unique-violation (23505) — avoids the select-then-insert
 * race where two concurrent redeliveries both see "not present".
 */
export async function claimWebhookEvent(
  provider: string,
  eventId: string | null | undefined,
  tenantId?: string | null,
): Promise<boolean> {
  if (!eventId) return false

  const { error } = await supabaseAdmin
    .from('processed_webhook_events')
    .insert({ provider, event_id: eventId, tenant_id: tenantId ?? null })

  if (!error) return true
  if (error.code === '23505') return false
  throw error
}
