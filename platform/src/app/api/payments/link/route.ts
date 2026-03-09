import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { createPaymentLink } from '@/lib/stripe'

export async function POST(request: Request) {
  let tenant
  try {
    tenant = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { booking_id } = await request.json()
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, price, service_type')
    .eq('id', booking_id)
    .eq('tenant_id', tenant.tenantId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const { data: tenantData } = await supabaseAdmin
    .from('tenants')
    .select('stripe_api_key')
    .eq('id', tenant.tenantId)
    .single()

  const amount = booking.price || 0
  if (amount <= 0) return NextResponse.json({ error: 'No price set on booking' }, { status: 400 })

  try {
    const link = await createPaymentLink({
      amount,
      serviceName: booking.service_type || 'Service',
      bookingId: booking.id,
      tenantId: tenant.tenantId,
      stripeApiKey: tenantData?.stripe_api_key || undefined,
    })

    // Save link URL to booking
    await supabaseAdmin
      .from('bookings')
      .update({ payment_link: link.url })
      .eq('id', booking.id)

    return NextResponse.json({ url: link.url })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stripe error' }, { status: 500 })
  }
}
