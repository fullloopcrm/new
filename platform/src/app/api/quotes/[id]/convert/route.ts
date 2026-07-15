/**
 * Convert an accepted quote into a booking.
 * Creates the client if the quote was standalone (no client_id).
 * Idempotent — re-calling returns the existing booking.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    // tenantDb auto-scopes every query to the authenticated owner's tenant;
    // update-by-id below GAINS a tenant_id filter it previously lacked.
    const db = tenantDb(tenantId)

    const { data: quote, error: qErr } = await db
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single()
    if (qErr || !quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
    // with lib/sale-to-booking.ts + lib/sale-to-recurring.ts + lib/jobs.ts as
    // the claim marker since it's exclusive per quote regardless of path.
    const { data: claim } = await db
      .from('quotes')
      .update({ converted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'accepted')
      .is('converted_booking_id', null)
      .is('converted_at', null)
      .select('id')
      .maybeSingle()

    if (!claim) {
      const { data: latest } = await db.from('quotes').select('converted_booking_id').eq('id', id).maybeSingle()
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
          ? await db
              .from('clients')
              .select('id')
              .eq('email', quote.contact_email)
              .maybeSingle()
          : { data: null }
        if (existing.data?.id) {
          clientId = existing.data.id
        } else {
          const { data: newClient, error: cErr } = await db
            .from('clients')
            .insert({
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
        await db.from('quotes').update({ client_id: clientId }).eq('id', id)
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

      const { data: booking, error: bErr } = await db
        .from('bookings')
        .insert({
          client_id: clientId,
          start_time: startTime,
          end_time: endTime,
          status: bkStatus,
          price: quote.total_cents ? quote.total_cents / 100 : null,
          notes: `Converted from quote ${quote.quote_number}`,
          special_instructions: quote.notes || null,
        })
        .select('id')
        .single()
      if (bErr) throw bErr

      await db
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
      await db.from('quotes').update({ converted_at: null }).eq('id', id)
      throw err
    }
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quotes/[id]/convert', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
