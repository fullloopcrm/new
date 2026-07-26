/**
 * Stripe Connect onboarding for referrers — same pattern as sales partners
 * (src/app/api/sales-partners/[id]/stripe-onboard), adapted for referrers:
 * each tenant's own Stripe account owns the Connect account, not a single
 * platform-wide one. Self-service — gated on the referrer's own portal
 * session token (src/lib/referrer-portal-auth.ts), not admin requirePermission
 * (this runs from the referrer's own /referral/[code] dashboard).
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { getReferrerAuth } from '@/lib/referrer-portal-auth'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { decryptSecret } from '@/lib/secret-crypto'

function getStripe(key: string | null | undefined): Stripe {
  const apiKey = key ? decryptSecret(key) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getReferrerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (id !== auth.rid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { data: referrer } = await supabaseAdmin
      .from('referrers')
      .select('id, name, email, referral_code, stripe_connect_account_id')
      .eq('id', id)
      .eq('tenant_id', auth.tid)
      .single()
    if (!referrer) return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, domain, stripe_api_key')
      .eq('id', auth.tid)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const stripe = getStripe((tenant as { stripe_api_key?: string | null }).stripe_api_key)
    let accountId = referrer.stripe_connect_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: referrer.email || undefined,
        // transfers-only fails live with "needs approval for transfers
        // without card_payments" (leader 16:20, confirmed against nycmaid's
        // real account) -- requesting both together avoids the platform
        // restriction. card_payments sits unused/unverified since referrers
        // never take card payments directly.
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        business_type: 'individual',
        metadata: { referrer_id: id, tenant_id: auth.tid },
      }, { idempotencyKey: `connect-account-ref-${auth.tid}-${id}` })
      accountId = account.id
      await supabaseAdmin
        .from('referrers')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', id)
        .eq('tenant_id', auth.tid)
    }

    const baseUrl = tenantSiteUrl(tenant) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/referrers/connect/${id}/stripe-onboard?refresh=1`,
      return_url: `${baseUrl}/referral/${referrer.referral_code}?stripe=connected`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url, account_id: accountId })
  } catch (e) {
    console.error('[referrer stripe-onboard]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Stripe error' }, { status: 500 })
  }
}

// Refresh handler — regenerates the onboarding link if the Stripe-hosted one expired.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getReferrerAuth(request)
  const { id } = await params
  if (!auth || id !== auth.rid) {
    return NextResponse.redirect(new URL('/referral', request.url))
  }

  try {
    const { data: referrer } = await supabaseAdmin
      .from('referrers')
      .select('referral_code, stripe_connect_account_id')
      .eq('id', id)
      .eq('tenant_id', auth.tid)
      .single()
    if (!referrer?.stripe_connect_account_id) {
      return NextResponse.redirect(new URL('/referral', request.url))
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('slug, domain, stripe_api_key')
      .eq('id', auth.tid)
      .single()

    const stripe = getStripe((tenant as { stripe_api_key?: string | null } | null)?.stripe_api_key)
    const baseUrl = tenantSiteUrl(tenant) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const link = await stripe.accountLinks.create({
      account: referrer.stripe_connect_account_id,
      refresh_url: `${baseUrl}/api/referrers/connect/${id}/stripe-onboard?refresh=1`,
      return_url: `${baseUrl}/referral/${referrer.referral_code}?stripe=connected`,
      type: 'account_onboarding',
    })
    return NextResponse.redirect(link.url)
  } catch (e) {
    console.error('[referrer stripe-onboard refresh]', e)
    return NextResponse.redirect(new URL('/referral', request.url))
  }
}
