/**
 * Super-admin prospect actions: approve (generates Stripe checkout link),
 * reject, set status.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { TIER_PRICES } from '@/lib/tier-prices'

type Params = { params: Promise<{ id: string }> }

export async function GET(_r: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  const { data, error } = await supabaseAdmin.from('prospects').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospect: data })
}

export async function PATCH(request: Request, { params }: Params) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { id } = await params
  const body = await request.json()

  const { data: prospect } = await supabaseAdmin.from('prospects').select('*').eq('id', id).single()
  if (!prospect) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = { reviewed_at: new Date().toISOString() }

  if (body.action === 'approve') {
    const tier = body.tier || prospect.tier_interest || 'growth'
    const pricing = TIER_PRICES[tier]
    if (!pricing) return NextResponse.json({ error: `Unknown tier: ${tier}` }, { status: 400 })

    // Create Stripe checkout session using Full Loop's platform key
    const platformKey = process.env.STRIPE_SECRET_KEY
    if (!platformKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 500 })
    const stripe = new Stripe(platformKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: pricing.monthly_cents > 0 ? 'subscription' : 'payment',
      customer_email: prospect.owner_email,
      line_items: pricing.monthly_cents > 0
        ? [
            { price_data: { currency: 'usd', product_data: { name: `Full Loop ${pricing.label} — Setup` }, unit_amount: pricing.setup_cents }, quantity: 1 },
            { price_data: { currency: 'usd', product_data: { name: `Full Loop ${pricing.label} — Monthly` }, recurring: { interval: 'month' }, unit_amount: pricing.monthly_cents }, quantity: 1 },
          ]
        : [
            { price_data: { currency: 'usd', product_data: { name: `Full Loop ${pricing.label} — Setup` }, unit_amount: pricing.setup_cents }, quantity: 1 },
          ],
      success_url: `${appUrl}/welcome?email=${encodeURIComponent(prospect.owner_email)}`,
      cancel_url: `${appUrl}/qualify?cancelled=1`,
      metadata: {
        prospect_id: prospect.id,
        tier,
        full_loop_signup: 'true',
      },
    })

    updates.status = 'approved'
    updates.stripe_checkout_url = session.url
    updates.stripe_checkout_session_id = session.id
    updates.paid_tier = tier
    updates.setup_fee_cents = pricing.setup_cents
    updates.monthly_cents = pricing.monthly_cents
  } else if (body.action === 'reject') {
    updates.status = 'rejected'
    updates.reject_reason = body.reject_reason || null
  } else if (body.action === 'review') {
    updates.status = 'reviewing'
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('prospects').update(updates).eq('id', id).select('*').single()
  if (error) throw error
  return NextResponse.json({ prospect: data })
}
