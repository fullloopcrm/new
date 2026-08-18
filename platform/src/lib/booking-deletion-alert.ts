import { supabaseAdmin } from './supabase'
import { sendEmail } from './email'
import { sendTenantTelegram } from './notify'
import { getAdminContacts } from './admin-contacts'

/**
 * Fires whenever a booking that was still 'scheduled'/'pending' (i.e. an
 * active, not-yet-serviced future appointment) gets HARD-deleted, as opposed
 * to soft-cancelled. A correctly-cancelled booking never reaches this --
 * this is the guardrail for the class of bug that silently erased Simon
 * Dolsten's (2026-08-14) and Liza Bradburn's (2026-08-17) entire future
 * recurring series: a "Cancel" action that fell through to a real DELETE.
 * Deliberately bypasses notify()'s normal Telegram-is-exclusive routing
 * ladder -- Jeff wants both channels, always, for this specific event, since
 * it's a data-loss signal, not a routine operational one.
 */
export async function alertActiveBookingHardDeleted(params: {
  tenantId: string
  bookingId: string
  clientName?: string | null
  startTime: string
  status: string
}): Promise<void> {
  const { tenantId, bookingId, clientName, startTime, status } = params

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, telegram_bot_token, telegram_chat_id, resend_api_key, email_from')
    .eq('id', tenantId)
    .single()
  if (!tenant) return

  const text =
    `⚠️ Active booking permanently deleted\n\n` +
    `Client: ${clientName || 'Unknown'}\n` +
    `Was: ${status}, scheduled ${startTime}\n` +
    `Booking ID: ${bookingId}\n\n` +
    `This was a hard delete of a booking that hadn't been cancelled first. ` +
    `If this wasn't intentional, check the audit log (table_name='bookings', row_id='${bookingId}') to recover it.`

  await Promise.allSettled([
    sendTenantTelegram(tenantId, tenant, text).catch((err) => {
      console.error('[booking-deletion-alert] telegram send failed:', err)
    }),
    (async () => {
      const admins = await getAdminContacts(tenantId)
      const recipients = admins.map((a) => a.email).filter((e): e is string => !!e)
      if (recipients.length === 0) return
      await Promise.allSettled(
        recipients.map((to) =>
          sendEmail({
            to,
            subject: `⚠️ ${tenant.name || 'Booking'} — active booking deleted`,
            html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
            resendApiKey: tenant.resend_api_key,
          }).catch((err) => {
            console.error('[booking-deletion-alert] email send failed:', err)
          })
        )
      )
    })(),
  ])
}
