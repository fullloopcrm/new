// Shared waitlist-entry creation — one real `waitlist` row plus (when a
// preferred date is known) a linked pending booking, so a waitlisted lead
// shows up in both the dashboard's Waiting List panel and the Bookings
// "Pending/Waitlist" badge. Used by every entry point that waitlists someone
// (public web form, SMS agent) so none of them fake it through a side-channel
// like sms_conversations.outcome — see src/lib/migrations/051_waitlist.sql.
import { tenantDb } from '@/lib/tenant-db'
import { createPrimaryContact } from '@/lib/client-contacts'
import { broadcastWaitlistBooking } from '@/lib/waitlist-broadcast'

export interface WaitlistEntryInput {
  name: string
  phone: string
  email?: string | null
  serviceType?: string | null
  address?: string | null
  preferredDate?: string | null
  preferredTime?: string | null
  estimatedHours?: number
  hourlyRate?: number | null
  notes?: string | null
  source: 'web' | 'admin' | 'agent'
  clientId?: string | null
}

export interface WaitlistEntryResult {
  waitlistId: string | null
  bookingId: string | null
  /** Raw insert error, e.g. the `waitlist` table not yet migrated on this tenant. */
  error: { message: string } | null
}

export async function createWaitlistEntry(tenantId: string, input: WaitlistEntryInput): Promise<WaitlistEntryResult> {
  const estimatedHours = input.estimatedHours || 2

  const { data: waitlistRow, error } = await tenantDb(tenantId).from('waitlist').insert({
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    service_type: input.serviceType || null,
    address: input.address || null,
    preferred_date: input.preferredDate || null,
    preferred_time: input.preferredTime || null,
    estimated_hours: estimatedHours,
    hourly_rate: input.hourlyRate || null,
    notes: input.notes || null,
    source: input.source,
    client_id: input.clientId || null,
  }).select('id').single()

  if (error || !waitlistRow) return { waitlistId: null, bookingId: null, error: error || { message: 'insert failed' } }
  const waitlistId = waitlistRow.id as string

  // No preferred date: nothing to schedule, entry lives waitlist-table-only.
  if (!input.preferredDate) return { waitlistId, bookingId: null, error: null }

  const startClock = /^\d{1,2}:\d{2}/.test(input.preferredTime || '') ? input.preferredTime! : '09:00'
  const [sh, sm] = startClock.split(':').map(Number)
  const startNaive = `${input.preferredDate}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`
  const endMinutes = sh * 60 + sm + Math.round(estimatedHours * 60)
  const endNaive = `${input.preferredDate}T${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`

  let clientId = input.clientId || null
  if (!clientId && input.phone) {
    const cleanPhone = input.phone.replace(/\D/g, '')
    if (cleanPhone) {
      const { data: existingClient } = await tenantDb(tenantId)
        .from('clients')
        .select('id')
        .ilike('phone', `%${cleanPhone.slice(-10)}%`)
        .limit(1)
        .maybeSingle()
      if (existingClient) {
        clientId = existingClient.id as string
      } else {
        const { data: newClient } = await tenantDb(tenantId)
          .from('clients')
          .insert({ name: input.name, phone: input.phone, email: input.email || null, address: input.address || null })
          .select('id')
          .single()
        if (newClient) {
          clientId = newClient.id as string
          await createPrimaryContact(tenantId, clientId, { name: input.name, phone: input.phone, email: input.email || null }).catch(() => {})
        }
      }
    }
  }

  const { data: booking } = await tenantDb(tenantId)
    .from('bookings')
    .insert({
      client_id: clientId,
      service_type: input.serviceType || null,
      start_time: startNaive,
      end_time: endNaive,
      status: 'pending',
      source: 'waitlist',
      hourly_rate: input.hourlyRate || null,
      price: input.hourlyRate ? Math.round(input.hourlyRate * estimatedHours * 100) : 0,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (!booking) return { waitlistId, bookingId: null, error: null }

  await tenantDb(tenantId).from('waitlist').update({ booking_id: booking.id }).eq('id', waitlistId)

  await broadcastWaitlistBooking({
    tenantId,
    jobDate: input.preferredDate,
    startTime: startClock,
    durationHours: estimatedHours,
    jobAddress: input.address || null,
    hourlyRate: input.hourlyRate || null,
    serviceType: input.serviceType || null,
  }).catch((err) => console.error('[waitlist] broadcast failed:', err))

  return { waitlistId, bookingId: booking.id as string, error: null }
}
