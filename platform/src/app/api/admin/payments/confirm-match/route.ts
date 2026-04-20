/**
 * Admin manually matches an unmatched Zelle/Venmo payment to a booking.
 * Marks unmatched_payments row as matched, inserts a payments row, and
 * updates the booking's payment_status. Tenant-aware.
 *
 * Tip detection: amount > expected → difference is tipCents (goes to team_member).
 * No Stripe Connect transfer here — that flow is for card payments. If the team
 * member is owed for this Zelle/Venmo job, admin pays them out manually from
 * the dashboard.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { unmatchedPaymentId, bookingId } = await req.json()
    if (!unmatchedPaymentId || !bookingId) {
      return NextResponse.json({ error: 'unmatchedPaymentId and bookingId required' }, { status: 400 })
    }

    // Tenant-scope both lookups.
    const { data: unmatched } = await supabaseAdmin
      .from('unmatched_payments')
      .select('id, tenant_id, method, amount_cents, sender_name, status, raw_email_id')
      .eq('id', unmatchedPaymentId)
      .eq('tenant_id', tenantId)
      .single()

    if (!unmatched) {
      return NextResponse.json({ error: 'Unmatched payment not found' }, { status: 404 })
    }
    if (unmatched.status === 'matched') {
      return NextResponse.json({ error: 'Already matched' }, { status: 409 })
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, team_member_id, hourly_rate, actual_hours, price, clients(name, phone), team_members(name, phone, preferred_language)')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const amountCents = unmatched.amount_cents as number
    const hours = (booking.actual_hours as number | null)
      || ((booking.price && booking.hourly_rate) ? (booking.price as number) / 100 / (booking.hourly_rate as number) : null)
    const expectedCents = (booking.price as number | null)
      || (hours && booking.hourly_rate ? Math.round(hours * (booking.hourly_rate as number) * 100) : 0)

    let tipCents = 0
    let status: 'completed' | 'partial' = 'completed'
    if (expectedCents > 0) {
      if (amountCents >= expectedCents) {
        tipCents = amountCents - expectedCents
      } else if (amountCents < expectedCents * 0.95) {
        status = 'partial'
      }
    }

    // 1. Mark unmatched as matched
    await supabaseAdmin
      .from('unmatched_payments')
      .update({ status: 'matched', matched_booking_id: bookingId, matched_at: new Date().toISOString() })
      .eq('id', unmatchedPaymentId)
      .eq('tenant_id', tenantId)

    // 2. Insert payment row
    await supabaseAdmin.from('payments').insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      client_id: booking.client_id,
      amount_cents: amountCents,
      tip_cents: tipCents,
      method: unmatched.method,
      status,
      payment_sender_name: unmatched.sender_name,
    })

    // 3. Update booking
    await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: status === 'partial' ? 'partial' : 'paid',
        payment_method: unmatched.method,
        payment_date: new Date().toISOString(),
        payment_sender_name: unmatched.sender_name,
        tip_amount: tipCents,
        partial_payment_cents: status === 'partial' ? amountCents : null,
      })
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)

    // 4. Notify team member of tip if any (bilingual)
    const tm = booking.team_members as unknown as { name?: string; phone?: string; preferred_language?: string } | null
    const client = booking.clients as unknown as { name?: string; phone?: string } | null

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, telnyx_api_key, telnyx_phone')
      .eq('id', tenantId)
      .single()

    if (tm?.phone && tenant?.telnyx_api_key && tenant.telnyx_phone) {
      const isEs = tm.preferred_language === 'es'
      const clientLabel = client?.name || (isEs ? 'cliente' : 'client')
      const tipLine = tipCents > 0
        ? (isEs ? ` ¡Propina de $${(tipCents / 100).toFixed(0)}! 💰` : ` Client tipped $${(tipCents / 100).toFixed(0)}! 💰`)
        : ''
      const body = isEs
        ? `Pago recibido de ${clientLabel}: $${(amountCents / 100).toFixed(0)}.${tipLine}`
        : `Payment received from ${clientLabel}: $${(amountCents / 100).toFixed(0)}.${tipLine}`
      sendSMS({
        to: tm.phone,
        body,
        telnyxApiKey: tenant.telnyx_api_key,
        telnyxPhone: tenant.telnyx_phone,
      }).catch(err => console.error('[confirm-match] team SMS failed:', err))
    }

    // 5. In-app notification
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'payment_received',
      title: `Payment Matched — $${(amountCents / 100).toFixed(2)}`,
      message: `${client?.name || 'Client'} — ${unmatched.method} — booking #${bookingId.slice(0, 8)}${tipCents > 0 ? ` (tip: $${(tipCents / 100).toFixed(2)})` : ''}`,
      channel: 'in_app',
    })

    return NextResponse.json({ success: true, status, tipCents })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[confirm-match] error:', err)
    return NextResponse.json({ error: 'Failed to confirm match' }, { status: 500 })
  }
}
