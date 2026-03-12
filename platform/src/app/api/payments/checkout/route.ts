import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { createCheckoutSession } from '@/lib/stripe'

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
    .select('id, price, service_type, clients(email)')
    .eq('id', booking_id)
    .eq('tenant_id', tenant.tenantId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const { data: tenantData } = await supabaseAdmin
    .from('tenants')
    .select('stripe_api_key')
    .eq('id', tenant.tenantId)
    .single()

  const stripeApiKey = tenantData?.stripe_api_key || process.env.STRIPE_SECRET_KEY
  if (!stripeApiKey) {
    return NextResponse.json({ error: 'Payments not configured. Add Stripe API key in Settings.' }, { status: 400 })
  }

  const amount = booking.price || 0
  if (amount <= 0) return NextResponse.json({ error: 'No price set on booking' }, { status: 400 })

  try {
    const session = await createCheckoutSession({
      tenantId: tenant.tenantId,
      bookingId: booking.id,
      amount,
      customerEmail: (booking.clients as unknown as { email: string } | null)?.email || undefined,
      serviceName: booking.service_type || 'Service',
      stripeApiKey: tenantData?.stripe_api_key || undefined,
      successUrl: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${booking.id}?payment=success`,
      cancelUrl: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL}/dashboard/bookings/${booking.id}?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stripe error' }, { status: 500 })
  }
}
