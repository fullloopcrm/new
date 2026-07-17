import { supabaseAdmin } from '@/lib/supabase'
import { sendClientSMS } from '@/lib/nycmaid/client-contacts'
import { smsAdmins } from '@/lib/nycmaid/admin-contacts'
import { notify } from '@/lib/notify'

// NYC Maid payment-reminder — tenant-scoped parity port (gated by isNycMaid in
// the payment-reminder cron; see feedback_nycmaid_copyover_tenant_scoped).
// Faithful 2-stage flow from standalone NYC Maid:
//   STAGE 1 (+15 min after the 30-min alert): nudge the client by SMS.
//   STAGE 2 (+60 min): escalate to admin (admin_task + SMS + notify).
//
// "Still owes us" filter (BOTH stages), which the FL generic reminder got wrong:
//   payment_status NOT IN ('paid','partial')  AND  payment_method IS NULL
// so we NEVER nudge a client who already paid, partially paid, or told the agent
// "paid" (payment_method set). FL's generic reminder only checked != 'paid' and
// escalated at +30 min — this restores nycmaid's exact behavior.
export async function runNycMaidPaymentReminder(
  tenantId: string,
): Promise<{ nudges: number; flagged: number }> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // ── STAGE 1: client nudge at +15 min ──
  const { data: forNudge } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, fifteen_min_alert_time, clients(name, phone)')
    .eq('tenant_id', tenantId)
    .not('fifteen_min_alert_time', 'is', null)
    .lte('fifteen_min_alert_time', fifteenMinAgo)
    .not('payment_status', 'in', '("paid","partial")')
    .is('payment_method', null)
    .is('payment_reminder_sent_at', null)

  let nudges = 0
  for (const booking of forNudge || []) {
    const client = booking.clients as unknown as { name?: string; phone?: string } | null
    if (!client?.phone || !booking.client_id) continue
    const firstName = client.name?.split(' ')[0] || 'there'
    const nudgeText = `Hi ${firstName} — your cleaner will be wrapping up soon and we want to confirm your payment was sent. If you've already paid, please reply "paid" (and a payer name if it's not yours) so we can release your cleaner. Thank you! — The NYC Maid`

    const result = await sendClientSMS(booking.client_id, nudgeText, {
      smsType: 'payment_nudge',
      bookingId: booking.id,
    }).catch(() => ({ sent: 0, skipped: 0 }))
    if (result?.sent && result.sent > 0) nudges++

    // Stamp on ATTEMPT, not just success. A permanently-undeliverable number
    // (e.g. Telnyx 40309 for non-whitelisted regions) must not re-fire every
    // 5 min forever — Stage 2 escalates it to admin instead.
    await supabaseAdmin
      .from('bookings')
      .update({ payment_reminder_sent_at: new Date().toISOString() })
      .eq('id', booking.id)
      .eq('tenant_id', tenantId)
  }

  // ── STAGE 2: admin escalation at +60 min ──
  const { data: stale } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, price, is_emergency, clients(name, phone)')
    .eq('tenant_id', tenantId)
    .not('fifteen_min_alert_time', 'is', null)
    .lte('fifteen_min_alert_time', sixtyMinAgo)
    .not('payment_status', 'in', '("paid","partial")')
    .is('payment_method', null)

  const flaggedNames: string[] = []
  let anyEmergency = false
  for (const booking of stale || []) {
    // Dedup: one payment_overdue task per booking.
    const { count } = await supabaseAdmin
      .from('admin_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('booking_id', booking.id)
      .eq('type', 'payment_overdue')
    if (count && count > 0) continue

    const client = booking.clients as unknown as { name?: string; phone?: string } | null
    if (!client) continue
    const expected = booking.price ? (Number(booking.price) / 100).toFixed(0) : '—'
    const isEmergency = (booking as { is_emergency?: boolean | null }).is_emergency === true
    if (isEmergency) anyEmergency = true

    await supabaseAdmin
      .from('admin_tasks')
      .insert({
        tenant_id: tenantId,
        type: 'payment_overdue',
        priority: 'high',
        title: isEmergency
          ? `🚨 Urgent — ${client.name || 'Client'} — $${expected} payment overdue 60+ min`
          : `${client.name || 'Client'} — $${expected} payment overdue 60+ min`,
        description: `${isEmergency ? '🚨 EMERGENCY — ' : ''}30-min alert fired 60+ min ago. Client has not paid or claimed payment. Phone: ${client.phone || 'none'}. Admin to contact manually.`,
        booking_id: booking.id,
        client_id: booking.client_id,
      })
      .then(() => {}, () => {})

    flaggedNames.push(`${isEmergency ? '🚨 ' : ''}${client.name || 'Client'} ($${expected})`)
  }

  if (flaggedNames.length) {
    await smsAdmins(`Payment overdue — contact these clients manually: ${flaggedNames.join(', ')}`).catch(() => {})
    await notify({
      tenantId,
      type: 'follow_up',
      title: anyEmergency
        ? `🚨 ${flaggedNames.length} overdue payment(s) — admin action required`
        : `${flaggedNames.length} overdue payment(s) — admin action required`,
      message: flaggedNames.join('\n'),
    }).catch(() => {})
  }

  return { nudges, flagged: flaggedNames.length }
}
