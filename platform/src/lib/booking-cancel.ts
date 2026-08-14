// Shared cancel-side-effects (2026-08-14): pulled out of
// bookings/[id]/status/route.ts so the automated duplicate-booking guardrail
// (duplicate-bookings.ts) can cancel a booking with the exact same finance/
// deal-sync correctness the human-initiated cancel path already has, instead
// of a raw status write that would silently skip commission clawback,
// revenue reversal, and deal-stage sync.
import { tenantDb } from './tenant-db'
import { supabaseAdmin } from './supabase'
import { audit, type AuditAction } from './audit'
import { notify } from './notify'
import { isCommEnabled } from './comms-prefs'
import { sendSMS } from './sms'
import { clientSmsTemplatesFor } from './messaging/client-sms'
import { voidCommissionsForBooking } from './finance/post-adjustments'
import { reverseBookingRevenueIfPosted } from './finance/post-revenue'
import { naiveToAnchoredDate } from './naive-time'

export interface BookingForCancel {
  status: string
  client_id: string | null
  start_time: string
  service_type: string | null
  clients: { name?: string | null; phone?: string | null; email?: string | null } | null
}

export interface CancelSideEffectsOptions {
  tenantId: string
  bookingId: string
  fromStatus: string
  toStatus: string
  booking: BookingForCancel
  /** Send the client-facing cancellation email/SMS. False for a system-initiated cancel where the client is still served by a surviving duplicate. */
  notifyClient: boolean
  auditAction?: AuditAction
  auditDetails?: Record<string, unknown>
}

/**
 * Runs every side effect a booking status change needs, beyond the row
 * update itself (caller does the `bookings.update({status})` first). Finance
 * correctness (commission clawback, revenue reversal) and deal-stage sync
 * always run on a transition to 'cancelled' regardless of who/what triggered
 * it; the client-facing notification is the one piece callers can opt out of.
 */
export async function applyStatusChangeSideEffects({
  tenantId,
  bookingId,
  fromStatus,
  toStatus,
  booking,
  notifyClient,
  auditAction = 'booking.status_changed',
  auditDetails,
}: CancelSideEffectsOptions): Promise<void> {
  const db = tenantDb(tenantId)

  if (toStatus === 'cancelled' && booking.client_id && notifyClient) {
    try {
      const { data: tenantData } = await supabaseAdmin
        .from('tenants')
        .select('telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()
      const hasSMS = !!(tenantData?.telnyx_api_key && tenantData?.telnyx_phone)
      const date = naiveToAnchoredDate(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

      await notify({
        tenantId,
        type: 'booking_cancelled',
        title: `Booking Cancelled — ${date}`,
        message: `Your appointment on ${date} has been cancelled.`,
        channel: 'email',
        recipientType: 'client',
        recipientId: booking.client_id,
        bookingId,
        metadata: { clientName: booking.clients?.name, serviceName: booking.service_type },
      })

      if (booking.clients?.phone && hasSMS && (await isCommEnabled(tenantId, 'cancellation', 'sms'))) {
        sendSMS({
          to: booking.clients.phone,
          body: (await clientSmsTemplatesFor(tenantId)).cancellation({ start_time: booking.start_time }),
          telnyxApiKey: tenantData!.telnyx_api_key,
          telnyxPhone: tenantData!.telnyx_phone,
          tenantId,
          bookingId,
          smsType: 'cancellation',
        }).catch((err) => console.error('Cancellation SMS error:', err))
      }
    } catch (notifErr) {
      console.error('Cancellation notification error:', notifErr)
    }
  }

  if (toStatus === 'cancelled') {
    try {
      await voidCommissionsForBooking({ tenantId, bookingId, reason: 'the booking was cancelled' })
    } catch (commErr) {
      console.error('Commission clawback error (non-blocking):', commErr)
    }
    try {
      await reverseBookingRevenueIfPosted(tenantId, bookingId)
    } catch (revErr) {
      console.error('Revenue reversal error (non-blocking):', revErr)
    }
  }

  const dealStage =
    ['scheduled', 'confirmed', 'in_progress', 'completed', 'paid'].includes(toStatus) ? 'sold'
    : ['cancelled', 'no_show'].includes(toStatus) ? 'lost'
    : null
  if (dealStage) {
    try {
      await db.from('deals').update({ stage: dealStage }).eq('booking_id', bookingId).eq('mode', 'booking')
    } catch (dealErr) {
      console.error('Deal sync error (non-blocking):', dealErr)
    }
  }

  await audit({
    tenantId,
    action: auditAction,
    entityType: 'booking',
    entityId: bookingId,
    details: auditDetails ?? { from: fromStatus, to: toStatus },
  })
}
