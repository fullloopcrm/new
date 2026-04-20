/**
 * Stripe webhook — ported from nycmaid (2026-04-19), tenant-aware.
 * Handles: checkout completion, payments table insert, tip detection,
 * cleaner auto-payout via Stripe Connect (when team_member has stripe_account_id),
 * client/cleaner/admin notifications.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import Stripe from 'stripe'

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  let stripe: Stripe
  try {
    stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.booking_id
      const tenantId = session.metadata?.tenant_id

      if (!bookingId || !tenantId) break

      // Idempotency — skip if we already processed this session
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('stripe_session_id', session.id)
        .limit(1)
      if (existing && existing.length > 0) {
        return NextResponse.json({ received: true, idempotent: true })
      }

      // Look up booking + cleaner + tenant for tip math
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id, hourly_rate, actual_hours, price, team_members(name, phone, stripe_account_id, preferred_language), clients(name, phone), tenants(name, telnyx_api_key, telnyx_phone)')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single()

      if (!booking) {
        console.error(`[stripe] booking ${bookingId} not found for tenant ${tenantId}`)
        break
      }

      const tm = booking.team_members as unknown as { name?: string; phone?: string; stripe_account_id?: string; preferred_language?: string } | null
      const client = booking.clients as unknown as { name?: string; phone?: string } | null
      const tenant = booking.tenants as unknown as { name?: string; telnyx_api_key?: string; telnyx_phone?: string } | null

      const amountCents = session.amount_total || 0
      const hours = booking.actual_hours || (booking.price && booking.hourly_rate ? booking.price / 100 / booking.hourly_rate : null)
      const expectedCents = booking.price || (hours && booking.hourly_rate ? Math.round(hours * booking.hourly_rate * 100) : 0)

      // Tip = anything paid above expected (with 95% partial threshold)
      let tipCents = 0
      let isPartial = false
      if (expectedCents > 0) {
        if (amountCents >= expectedCents) {
          tipCents = amountCents - expectedCents
        } else if (amountCents < expectedCents * 0.95) {
          isPartial = true
        }
      }

      // 1. Insert payment row
      await supabaseAdmin.from('payments').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        client_id: booking.client_id,
        amount_cents: amountCents,
        tip_cents: tipCents,
        method: 'stripe',
        status: isPartial ? 'partial' : 'completed',
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      })

      // 2. Update booking
      await supabaseAdmin
        .from('bookings')
        .update({
          payment_status: isPartial ? 'partial' : 'paid',
          payment_method: 'stripe',
          payment_date: new Date().toISOString(),
          tip_amount: tipCents,
          partial_payment_cents: isPartial ? amountCents : null,
        })
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)

      // 3. If partial, open admin task instead of payout
      if (isPartial) {
        await supabaseAdmin.from('admin_tasks').insert({
          tenant_id: tenantId,
          type: 'partial_payment',
          priority: 'high',
          title: `Partial payment — ${client?.name || 'Client'}`,
          description: `Received $${(amountCents / 100).toFixed(2)} of expected $${(expectedCents / 100).toFixed(2)}. Reconcile manually.`,
          related_type: 'booking',
          related_id: bookingId,
        })
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'payment_partial',
          title: 'Partial Payment Received',
          message: `$${(amountCents / 100).toFixed(2)} (expected $${(expectedCents / 100).toFixed(2)}) for booking #${bookingId.slice(0, 8)}`,
          channel: 'in_app',
        })
        return NextResponse.json({ received: true, partial: true })
      }

      // 4. Auto-pay cleaner if connected to Stripe Connect
      let payoutSent = false
      if (tm?.stripe_account_id && booking.team_member_id) {
        try {
          const cleanerCents = expectedCents + tipCents // 100% of base + tip
          const transfer = await stripe.transfers.create({
            amount: cleanerCents,
            currency: 'usd',
            destination: tm.stripe_account_id,
            transfer_group: bookingId,
            metadata: { booking_id: bookingId, tenant_id: tenantId },
          })
          await supabaseAdmin.from('team_member_payouts').insert({
            tenant_id: tenantId,
            team_member_id: booking.team_member_id,
            booking_id: bookingId,
            amount_cents: cleanerCents - tipCents,
            tip_cents: tipCents,
            stripe_transfer_id: transfer.id,
            status: 'transferred',
            paid_at: new Date().toISOString(),
          })
          await supabaseAdmin
            .from('bookings')
            .update({ team_member_paid: true, team_member_paid_at: new Date().toISOString(), team_member_pay: cleanerCents })
            .eq('id', bookingId)
            .eq('tenant_id', tenantId)
          payoutSent = true
        } catch (payoutErr) {
          console.error('[stripe] cleaner payout failed:', payoutErr)
          await supabaseAdmin.from('admin_tasks').insert({
            tenant_id: tenantId,
            type: 'payout_failed',
            priority: 'high',
            title: `Payout failed — ${tm.name}`,
            description: `Stripe Connect transfer failed: ${payoutErr instanceof Error ? payoutErr.message : 'unknown'}`,
            related_type: 'booking',
            related_id: bookingId,
          })
        }
      }

      // 5. SMS the cleaner with payment + tip (bilingual)
      if (tm?.phone && tenant?.telnyx_api_key && tenant?.telnyx_phone) {
        const isEs = tm.preferred_language === 'es'
        const tipNote = tipCents > 0
          ? (isEs ? `\n\n¡Propina de $${(tipCents / 100).toFixed(0)}! 💰` : `\n\nClient tipped $${(tipCents / 100).toFixed(0)}! 💰`)
          : ''
        const body = isEs
          ? `Pago recibido de ${client?.name || 'cliente'}: $${(amountCents / 100).toFixed(0)} ${payoutSent ? '— enviado a tu cuenta.' : ''}${tipNote}`
          : `Payment received from ${client?.name || 'client'}: $${(amountCents / 100).toFixed(0)} ${payoutSent ? '— sent to your account.' : ''}${tipNote}`
        sendSMS({
          to: tm.phone,
          body,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(err => console.error('[stripe] cleaner SMS failed:', err))
      }

      // 6. SMS client a thank-you
      if (client?.phone && tenant?.telnyx_api_key && tenant?.telnyx_phone) {
        const tipLine = tipCents > 0 ? ` and the ${(tipCents / 100).toFixed(0)} tip` : ''
        const body = `Thanks for the payment of $${(amountCents / 100).toFixed(0)}${tipLine}! 😊 — ${tenant.name || ''}`
        sendSMS({
          to: client.phone,
          body,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(err => console.error('[stripe] client SMS failed:', err))
      }

      // 7. In-app notification
      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: 'payment_received',
        title: `Payment Received — $${(amountCents / 100).toFixed(2)}`,
        message: `${client?.name || 'Client'} paid for booking #${bookingId.slice(0, 8)}${tipCents > 0 ? ` (tip: $${(tipCents / 100).toFixed(2)})` : ''}${payoutSent ? ' — cleaner paid out' : ''}`,
        channel: 'in_app',
      })

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
        await supabaseAdmin.from('admin_tasks').insert({
          tenant_id: tenantId,
          type: 'payment_failed',
          priority: 'high',
          title: 'Stripe payment failed',
          description: intent.last_payment_error?.message || 'Unknown error',
          related_type: 'booking',
          related_id: bookingId,
        })
      }
      break
    }

    case 'account.updated': {
      // Stripe Connect account updates — track team_member onboarding state
      const account = event.data.object as Stripe.Account
      const teamMemberId = (account.metadata as Record<string, string> | null)?.team_member_id
      const tenantId = (account.metadata as Record<string, string> | null)?.tenant_id
      if (teamMemberId && tenantId && account.charges_enabled) {
        await supabaseAdmin
          .from('team_members')
          .update({ stripe_account_id: account.id })
          .eq('id', teamMemberId)
          .eq('tenant_id', tenantId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
