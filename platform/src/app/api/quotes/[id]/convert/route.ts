/**
 * Convert an accepted quote into a booking.
 * Creates the client if the quote was standalone (no client_id).
 * Idempotent — re-calling returns the existing booking.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { logQuoteEvent } from '@/lib/quote'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const { data: quote, error: qErr } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('tenant_id', tenantId)
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

    // Use provided start_time or null (can be scheduled later)
    const startTime: string | null = body.start_time || null
    const endTime: string | null = body.end_time || null

    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        start_time: startTime,
        end_time: endTime,
        status: startTime ? 'confirmed' : 'pending',
        price: quote.total_cents ? quote.total_cents / 100 : null,
        notes: `Converted from quote ${quote.quote_number}`,
        special_instructions: quote.notes || null,
        address: quote.service_address || null,
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
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quotes/[id]/convert', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
