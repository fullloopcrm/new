/**
 * Internal-key-gated Zelle/Venmo match finalizer.
 * Ported from nycmaid. Called by automated reconciliation tools.
 * Tenant resolved from the booking being finalized.
 */
import { NextRequest, NextResponse } from 'next/server'
import { processPayment } from '@/lib/payment-processor'
import { supabaseAdmin } from '@/lib/supabase'
import { safeEqual } from '@/lib/timing-safe-equal'

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key') || ''
  const expected = process.env.INTERNAL_API_KEY || process.env.ELCHAPO_MONITOR_KEY
  if (!expected || !internalKey || !safeEqual(internalKey, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { bookingId, clientId, method, amountCents, senderName, referenceId } = body
    if (!bookingId || !clientId || !method || !amountCents || !referenceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('tenant_id')
      .eq('id', bookingId)
      .single()

    if (!booking?.tenant_id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // clientId is caller-supplied (external reconciliation tool) and gets
    // inserted straight into payments.client_id — verify it belongs to the
    // same tenant as the booking before trusting it, else a foreign id
    // attaches another tenant's client to this payment (P1-pattern FK
    // injection: see deploy-prep/cross-tenant-leak-register.md).
    const { data: ownedClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('tenant_id', booking.tenant_id)
      .maybeSingle()
    if (!ownedClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const result = await processPayment({
      tenant: { id: booking.tenant_id },
      bookingId,
      clientId,
      method,
      amountCents,
      senderName,
      referenceId,
    })

    if (!result) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[finalize-match] error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
