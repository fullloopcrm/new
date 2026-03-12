import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.booking_id
      const tenantId = session.metadata?.tenant_id

      if (bookingId && tenantId) {
        await supabaseAdmin
          .from('bookings')
          .update({
            payment_status: 'paid',
            payment_method: 'stripe',
            payment_date: new Date().toISOString(),
            stripe_session_id: session.id,
            status: 'paid',
          })
          .eq('id', bookingId)
          .eq('tenant_id', tenantId)

        // Create notification
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment of $${((session.amount_total || 0) / 100).toFixed(2)} received for booking #${bookingId.slice(0, 8)}`,
          channel: 'in_app',
        })
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      const bookingId = intent.metadata?.booking_id
      const tenantId = intent.metadata?.tenant_id

      if (bookingId && tenantId) {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Payment failed for booking #${bookingId.slice(0, 8)}: ${intent.last_payment_error?.message || 'Unknown error'}`,
          channel: 'in_app',
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
