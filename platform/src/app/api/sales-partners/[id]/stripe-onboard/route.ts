/**
 * Stripe Connect onboarding for sales partners — ported from nycmaid
 * (sales-partners/[id]/stripe-onboard), adapted to FL's multi-tenant model
 * (mirrors team-members/[id]/stripe-onboard): each tenant's own Stripe
 * account owns the Connect account, not a single platform-wide one.
 * Self-service — gated on the partner's own portal session token, not
 * admin requirePermission (this runs from the partner's own dashboard).
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { getSalesPartnerAuth } from '@/lib/sales-partner-portal-auth'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { decryptSecret } from '@/lib/secret-crypto'

function getStripe(key: string | null | undefined): Stripe {
  const apiKey = key ? decryptSecret(key) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getSalesPartnerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (id !== auth.pid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { data: partner } = await supabaseAdmin
      .from('sales_partners')
      .select('id, name, email, stripe_connect_account_id')
      .eq('id', id)
      .eq('tenant_id', auth.tid)
      .single()
    if (!partner) return NextResponse.json({ error: 'Sales partner not found' }, { status: 404 })

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, domain, stripe_api_key')
      .eq('id', auth.tid)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const stripe = getStripe((tenant as { stripe_api_key?: string | null }).stripe_api_key)
    let accountId = partner.stripe_connect_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: partner.email || undefined,
        // card_payments requested alongside transfers -- platform-level restriction
        // (confirmed live against nycmaid's real account, 2026-07-22, see CHANNEL.md
        // 16:20 LEADER->W1): a transfers-only capability request is rejected
        // ("needs approval for transfers without card_payments"). card_payments sits
        // unused/unverified (sales partners never take card payments directly) --
        // requesting it alongside transfers is what avoids the platform restriction.
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        business_type: 'individual',
        metadata: { sales_partner_id: id, tenant_id: auth.tid },
      }, { idempotencyKey: `connect-account-sp-${auth.tid}-${id}` })
      accountId = account.id
      await supabaseAdmin
        .from('sales_partners')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', id)
        .eq('tenant_id', auth.tid)
    }

    const baseUrl = tenantSiteUrl(tenant) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/sales-partners/${id}/stripe-onboard?refresh=1`,
      return_url: `${baseUrl}/sales?stripe=connected`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url, account_id: accountId })
  } catch (e) {
    console.error('[sales-partner stripe-onboard]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Stripe error' }, { status: 500 })
  }
}

// Refresh handler — regenerates the onboarding link if the Stripe-hosted one expired.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getSalesPartnerAuth(request)
  const { id } = await params
  if (!auth || id !== auth.pid) {
    return NextResponse.redirect(new URL('/sales', request.url))
  }

  try {
    const { data: partner } = await supabaseAdmin
      .from('sales_partners')
      .select('stripe_connect_account_id')
      .eq('id', id)
      .eq('tenant_id', auth.tid)
      .single()
    if (!partner?.stripe_connect_account_id) {
      return NextResponse.redirect(new URL('/sales', request.url))
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('slug, domain, stripe_api_key')
      .eq('id', auth.tid)
      .single()

    const stripe = getStripe((tenant as { stripe_api_key?: string | null } | null)?.stripe_api_key)
    const baseUrl = tenantSiteUrl(tenant) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const link = await stripe.accountLinks.create({
      account: partner.stripe_connect_account_id,
      refresh_url: `${baseUrl}/api/sales-partners/${id}/stripe-onboard?refresh=1`,
      return_url: `${baseUrl}/sales?stripe=connected`,
      type: 'account_onboarding',
    })
    return NextResponse.redirect(link.url)
  } catch (e) {
    console.error('[sales-partner stripe-onboard refresh]', e)
    return NextResponse.redirect(new URL('/sales', request.url))
  }
}
