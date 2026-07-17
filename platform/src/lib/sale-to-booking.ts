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

  // Atomic claim: only a still-'accepted', not-yet-converted, not-yet-claimed
  // quote can proceed past this point. Concurrent callers (e.g. the public
  // accept endpoint retried, or an admin re-triggering close) race this
  // UPDATE — the loser gets null back instead of falling through to create a
  // duplicate booking. Shares `converted_at` with createJobFromQuote /
  // createRecurringSeriesFromQuote as the claim marker since it's exclusive
  // per quote regardless of which conversion path wins.
  const { data: claim } = await supabaseAdmin
    .from('quotes')
    .update({ converted_at: new Date().toISOString() })
    .eq('id', quoteId).eq('tenant_id', tenantId)
    .eq('status', 'accepted')
    .is('converted_booking_id', null)
    .is('converted_at', null)
    .select('id')
    .maybeSingle()

  if (!claim) {
    // Already claimed (in flight or finished) by a concurrent call. If the
    // winner already finished, return its booking id; otherwise surface a
    // retryable conflict instead of silently creating a second booking.
    const { data: latest } = await supabaseAdmin
      .from('quotes')
      .select('converted_booking_id')
      .eq('id', quoteId)
      .maybeSingle()
    if (latest?.converted_booking_id) {
      return { booking_id: latest.converted_booking_id as string, already_converted: true }
    }
    throw new Error('Quote conversion already in progress')
  }

  // Tracked outside the try so the catch block can tell whether the booking
  // row itself was already created (see the catch below).
  let bookingId: string | undefined
  try {
    // Resolve or create client (identical to createJobFromQuote / the /convert path).
    // quote.contact_email is raw user input; clients.email is always stored
    // lowercase/trimmed (validate.ts on the clients POST route). Normalize
    // before comparing/inserting or a case difference misses the existing
    // client and creates a duplicate, splitting that person's history.
    let clientId = quote.client_id as string | null
    if (!clientId) {
      const normalizedEmail = quote.contact_email ? String(quote.contact_email).trim().toLowerCase() : null
      const existing = normalizedEmail
        ? await supabaseAdmin
            .from('clients')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('email', normalizedEmail)
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
            email: normalizedEmail,
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
        price: quote.total_cents ? (quote.total_cents as number) : null,
        notes: `Converted from quote ${quote.quote_number} — confirm the date`,
        special_instructions: quote.notes || null,
      })
      .select('id')
      .single()
    if (bErr) throw bErr
    bookingId = booking.id as string

    const { error: linkErr } = await supabaseAdmin
      .from('quotes')
      .update({ status: 'converted', converted_booking_id: bookingId })
      .eq('id', quoteId)
      .eq('tenant_id', tenantId)
    if (linkErr) throw linkErr

    return { booking_id: bookingId, already_converted: false }
  } catch (err) {
    if (bookingId) {
      // The booking already exists (insert succeeded before the link-back
      // update failed). Releasing the claim here would let a retry pass the
      // `.is('converted_at', null)` gate and create a SECOND booking for the
      // same quote, orphaning the first. Instead, best-effort finish linking
      // the quote to the booking we already made so a retry resolves to
      // `already_converted: true` against the real booking instead of
      // duplicating it. If even this fails, leave the claim in place — a
      // quote stuck needing manual reconciliation is safer than a silent
      // duplicate booking. Same pattern as lib/jobs.ts / the /convert route.
      try {
        await supabaseAdmin
          .from('quotes')
          .update({ status: 'converted', converted_booking_id: bookingId })
          .eq('id', quoteId)
          .eq('tenant_id', tenantId)
      } catch {
        // Best-effort — the original `err` below is what the caller sees.
      }
      throw err
    }
    // Nothing was created yet — release the claim so a retry isn't
    // permanently blocked by a stuck "conversion in progress" error.
    await supabaseAdmin
      .from('quotes')
      .update({ converted_at: null })
      .eq('id', quoteId)
      .eq('tenant_id', tenantId)
    throw err
  }
}
