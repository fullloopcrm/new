/**
 * Super-admin prospect actions: approve (generates Stripe checkout link),
 * reject, set status.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { signupPricing } from '@/lib/tier-prices'
import { ensurePlatformPrices } from '@/lib/platform-billing'

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
    // Seat-based signup pricing. Self-serve defaults to 1 admin ($2,500/mo);
    // an approving admin can pass admins / team_members to pre-load seats.
    const pricing = signupPricing({
      admins: Number(body.admins) || 1,
      teamMembers: Number(body.team_members ?? body.teamMembers) || 0,
    })

    // Create Stripe checkout session using Full Loop's platform key
    const platformKey = process.env.STRIPE_SECRET_KEY
    if (!platformKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 500 })
    const stripe = new Stripe(platformKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })

    // Per-seat line items using the stable platform prices (admin $2,500, team $250),
    // with real quantities — so the subscription can later be re-synced when seats
    // change on the tenant board. The $25,000 setup fee is paid by bank wire, out of
    // band, and is NOT charged here.
    const { adminPriceId, memberPriceId } = await ensurePlatformPrices()
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: adminPriceId, quantity: pricing.admins },
    ]
    if (pricing.teamMembers > 0) line_items.push({ price: memberPriceId, quantity: pricing.teamMembers })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: prospect.owner_email,
      line_items,
      success_url: `${appUrl}/welcome?email=${encodeURIComponent(prospect.owner_email)}`,
      cancel_url: `${appUrl}/qualify?cancelled=1`,
      metadata: {
        prospect_id: prospect.id,
        admins: String(pricing.admins),
        team_members: String(pricing.teamMembers),
        full_loop_signup: 'true',
      },
    })

    updates.status = 'approved'
    updates.stripe_checkout_url = session.url
    updates.stripe_checkout_session_id = session.id
    updates.setup_fee_cents = pricing.setup_cents
    updates.monthly_cents = pricing.monthly_cents
  } else if (body.action === 'reject') {
    updates.status = 'rejected'
    updates.reject_reason = body.reject_reason || null
  } else if (body.action === 'review') {
    updates.status = 'reviewing'
  } else if (body.action === 'cancel') {
    updates.status = 'cancelled'
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('prospects').update(updates).eq('id', id).select('*').single()
  if (error) throw error
  return NextResponse.json({ prospect: data })
}
