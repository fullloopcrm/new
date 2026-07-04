/**
 * Turn a sold SERVICE quote into a single Booking (→ Bookings, not the Job
 * board). Mirrors POST /api/quotes/[id]/convert, but callable from the accept
 * close path. Creates a dateless 'pending' booking when no time is set — which
 * the schedule-monitor then surfaces as "sold, not scheduled yet."
 *
 * Sibling of createJobFromQuote (projects) and createRecurringSeriesFromQuote
 * (recurring services). Idempotent on quotes.converted_booking_id. Client
 * resolution matches the other two so the sale ties to the same client.
 */
import { supabaseAdmin } from '@/lib/supabase'

export async function createBookingFromQuote(
  tenantId: string,
  quoteId: string,
): Promise<{ booking_id: string; already_converted: boolean }> {
  const { data: quote, error: qErr } = await supabaseAdmin
    .from('quotes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', quoteId)
    .single()
  if (qErr || !quote) throw new Error('Quote not found')

  if (quote.converted_booking_id) {
    return { booking_id: quote.converted_booking_id as string, already_converted: true }
  }
  if (quote.status !== 'accepted') {
    throw new Error(`Can only convert accepted quotes (current: ${quote.status})`)
  }

  // Resolve or create client (identical to createJobFromQuote / the /convert path).
  let clientId = quote.client_id as string | null
  if (!clientId) {
    const existing = quote.contact_email
      ? await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('email', quote.contact_email)
          .maybeSingle()
      : { data: null }
    if (existing.data?.id) {
      clientId = existing.data.id as string
    } else {
      const { data: newClient, error: cErr } = await supabaseAdmin
        .from('clients')
        .insert({
          tenant_id: tenantId,
          name: quote.contact_name || quote.title || 'Quote Client',
          email: quote.contact_email || null,
          phone: quote.contact_phone || null,
          address: quote.service_address || null,
          source: 'quote',
          status: 'active',
        })
        .select('id')
        .single()
      if (cErr) throw cErr
      clientId = newClient.id as string
    }
  }

  // bookings.start_time is NOT NULL, so a sold-but-unscheduled service can't be
  // dateless. Place it on a near-future placeholder slot as 'pending' — the
  // operator confirms/moves the real date. status 'pending' = needs scheduling.
  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  start.setHours(9, 0, 0, 0)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'pending',
      service_type: quote.title || 'Service',
      price: quote.total_cents ? (quote.total_cents as number) / 100 : null,
      notes: `Converted from quote ${quote.quote_number} — confirm the date`,
      special_instructions: quote.notes || null,
    })
    .select('id')
    .single()
  if (bErr) throw bErr
  const bookingId = booking.id as string

  await supabaseAdmin
    .from('quotes')
    .update({ status: 'converted', converted_booking_id: bookingId })
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)

  return { booking_id: bookingId, already_converted: false }
}
