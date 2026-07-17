/**
 * Convert an accepted quote into a booking.
 * Creates the client if the quote was standalone (no client_id).
 * Idempotent — re-calling returns the existing booking.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const { data: quote, error: qErr } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (qErr || !quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // recurring_type quotes must become a recurring_schedules series, not a
    // one-off Booking -- same fulfillment-routing gap already fixed on the
    // Stripe deposit webhook and the manual deal-stage-change close (webhooks/
    // stripe/route.ts, deals/[id]/stage/route.ts). This route -- the staff
    // "Convert to Booking" button -- was the only fulfillment entry point
    // never checking recurring_type: a customer who signed up for a weekly
    // service via a quote got ONE booking and no ongoing series ever
    // generated. createRecurringSeriesFromQuote does its own idempotency
    // check (quotes.converted_schedule_id) and atomic claim, so it's safe to
    // delegate before this route's own converted_booking_id/claim logic
    // below, which only ever applies to the non-recurring path.
    if (quote.recurring_type) {
      try {
        const { createRecurringSeriesFromQuote } = await import('@/lib/sale-to-recurring')
        const result = await createRecurringSeriesFromQuote(tenantId, id)
        return NextResponse.json({
          schedule_id: result.schedule_id,
          bookings_created: result.bookings_created,
          already_converted: result.already_converted,
        })
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
      }
    }

    // Idempotent — return existing conversion
    if (quote.converted_booking_id) {
      return NextResponse.json({ booking_id: quote.converted_booking_id, already_converted: true })
    }

    if (quote.status !== 'accepted') {
      return NextResponse.json({ error: `Can only convert accepted quotes (current: ${quote.status})` }, { status: 400 })
    }

    // Atomic claim: only a still-'accepted', not-yet-converted, not-yet-claimed
    // quote can proceed past this point. A concurrent call (double-click on the
    // convert button) races this UPDATE — the loser gets null back instead of
    // falling through to create a duplicate booking. Shares `converted_at`
    // with the lib/sale-to-booking.ts + lib/sale-to-recurring.ts + lib/jobs.ts
    // conversion paths as the claim marker since it's exclusive per quote.
    const { data: claim } = await supabaseAdmin
      .from('quotes')
      .update({ converted_at: new Date().toISOString() })
      .eq('id', id).eq('tenant_id', tenantId)
      .eq('status', 'accepted')
      .is('converted_booking_id', null)
      .is('converted_at', null)
      .select('id')
      .maybeSingle()

    if (!claim) {
      const { data: latest } = await supabaseAdmin
        .from('quotes')
        .select('converted_booking_id')
        .eq('id', id)
        .maybeSingle()
      if (latest?.converted_booking_id) {
        return NextResponse.json({ booking_id: latest.converted_booking_id, already_converted: true })
      }
      return NextResponse.json({ error: 'Quote conversion already in progress' }, { status: 409 })
    }

    try {
      // Resolve or create client
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
          clientId = existing.data.id
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
          clientId = newClient.id
        }
        await supabaseAdmin.from('quotes').update({ client_id: clientId }).eq('id', id)
      }

      // bookings.start_time is NOT NULL. If no time is given, place a 'pending'
      // booking on a near-future placeholder slot for the owner to confirm.
      let startTime: string = body.start_time || ''
      let endTime: string | null = body.end_time || null
      let bkStatus = 'confirmed'
      if (!startTime) {
        const s = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        s.setHours(9, 0, 0, 0)
        startTime = s.toISOString()
        endTime = new Date(s.getTime() + 2 * 60 * 60 * 1000).toISOString()
        bkStatus = 'pending'
      }

      const { data: booking, error: bErr } = await supabaseAdmin
        .from('bookings')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          start_time: startTime,
          end_time: endTime,
          status: bkStatus,
          // bookings.price is CENTS (see POST /api/invoices' from_booking_id
          // handling + lib/sale-to-booking.ts's identical fix, commit 3ac8c818) --
          // this was dividing by 100, storing DOLLARS. A $500 quote converted here
          // landed price:500 read back as $5.00 on invoice, a 100x undercharge.
          price: quote.total_cents ? quote.total_cents : null,
          notes: `Converted from quote ${quote.quote_number}`,
          special_instructions: quote.notes || null,
        })
        .select('id')
        .single()
      if (bErr) throw bErr

      await supabaseAdmin
        .from('quotes')
        .update({
          status: 'converted',
          converted_booking_id: booking.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', id)

      await logQuoteEvent({
        quote_id: id,
        tenant_id: tenantId,
        event_type: 'converted',
        detail: { booking_id: booking.id, client_id: clientId },
      })

      return NextResponse.json({ booking_id: booking.id, client_id: clientId })
    } catch (err) {
      // Creation failed after the claim succeeded — release it so a retry
      // isn't permanently blocked by a stuck "conversion in progress" error.
      await supabaseAdmin
        .from('quotes')
        .update({ converted_at: null })
        .eq('id', id)
        .eq('tenant_id', tenantId)
      throw err
    }
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quotes/[id]/convert', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
