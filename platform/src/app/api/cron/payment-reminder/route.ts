/**
 * Payment reminder cron — every 5 min, all tenants, one shared cadence
 * (see CLAUDE.md GLOBAL RULE — no per-tenant forks). Logic lives in
 * lib/payment-reminder.ts: nudge the client at 15min/60min/2hr/4hr/6hr past
 * the 30-min-alert, then escalate to the tenant's own admin via Telegram +
 * email once the 6hr stage passes and it's still unpaid.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { runPaymentReminderCadence } from '@/lib/payment-reminder'

export const maxDuration = 60

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  let reminded = 0
  let escalated = 0
  const errors: string[] = []

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone, payment_link, owner_email, telegram_bot_token, telegram_chat_id')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    try {
      const r = await runPaymentReminderCadence(tenant)
      reminded += r.nudged
      escalated += r.escalated
    } catch (e) {
      errors.push(`tenant ${tenant.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'payment_reminder_fired',
    title: 'cron:payment-reminder',
    message: `reminded=${reminded} escalated=${escalated}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, reminded, escalated, errors: errors.length ? errors : undefined })
}
