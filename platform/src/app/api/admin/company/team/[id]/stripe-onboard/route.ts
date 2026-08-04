/**
 * Stripe Connect onboarding for Full Loop's own team — same mechanics as
 * team-members/[id]/stripe-onboard, but the Express account is created under
 * the PLATFORM's own Stripe account (STRIPE_SECRET_KEY), never a tenant's
 * key, since these people work for Full Loop itself.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

function getStripe(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { id } = await ctx.params
    const { data: member } = await supabaseAdmin
      .from('platform_team_members')
      .select('id, name, email, stripe_account_id')
      .eq('id', id)
      .single()

    if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

    const stripe = getStripe()
    let accountId = member.stripe_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: member.email || undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: 'individual',
        metadata: { platform_team_member_id: id },
      }, { idempotencyKey: `platform-connect-account-${id}` })
      accountId = account.id
      await supabaseAdmin.from('platform_team_members').update({ stripe_account_id: accountId }).eq('id', id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000'
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/admin/company/team?stripe=refresh`,
      return_url: `${baseUrl}/admin/company/team?stripe=connected`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url, account_id: accountId })
  } catch (e) {
    console.error('[company-team-stripe-onboard]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { id } = await ctx.params
    const { data: member } = await supabaseAdmin
      .from('platform_team_members')
      .select('stripe_account_id')
      .eq('id', id)
      .single()

    if (!member?.stripe_account_id) return NextResponse.json({ connected: false })

    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(member.stripe_account_id)
    return NextResponse.json({
      connected: true,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
