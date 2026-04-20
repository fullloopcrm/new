/**
 * Internal-key-gated Zelle/Venmo match finalizer.
 * Ported from nycmaid. Called by automated reconciliation tools.
 * Tenant resolved from the booking being finalized.
 */
import { NextRequest, NextResponse } from 'next/server'
import { processPayment } from '@/lib/payment-processor'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key')
  const expected = process.env.INTERNAL_API_KEY || process.env.ELCHAPO_MONITOR_KEY
  if (!expected || internalKey !== expected) {
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
