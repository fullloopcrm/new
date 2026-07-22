/**
 * Stripe Connect onboarding — ported from nycmaid (cleaners/[id]/stripe-onboard).
 * Creates an Express account for the team member and returns a hosted onboarding URL.
 *
 * Each tenant owns its own Stripe account (tenants.stripe_api_key) — the
 * Connect account must be created under THAT account, never a shared
 * platform-wide fallback, same pattern as sales-partners/[id]/stripe-onboard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptSecret } from '@/lib/secret-crypto'
import Stripe from 'stripe'

function getStripe(key: string | null | undefined): Stripe {
  const apiKey = key ? decryptSecret(key) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data: tm } = await supabaseAdmin
      .from('team_members')
      .select('id, name, email, phone, stripe_account_id')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()

    if (!tm) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('stripe_api_key')
      .eq('id', tenantId)
      .single()

    const stripe = getStripe((tenantRow as { stripe_api_key?: string | null } | null)?.stripe_api_key)
    let accountId = tm.stripe_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: tm.email || undefined,
        // transfers-only capability is rejected live ("needs approval for
        // transfers without card_payments") — requesting both together avoids
        // the platform restriction. card_payments sits unused/unverified since
        // cleaners never take card payments directly (confirmed against a real
        // nycmaid account by leader, 2026-07-22).
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: 'individual',
        metadata: { team_member_id: id, tenant_id: tenantId },
      }, { idempotencyKey: `connect-account-${tenantId}-${id}` })
      accountId = account.id
      await supabaseAdmin
        .from('team_members')
        .update({ stripe_account_id: accountId })
        .eq('id', id)
        .eq('tenant_id', tenantId)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000'
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/team/${id}?stripe=refresh`,
      return_url: `${baseUrl}/dashboard/team/${id}?stripe=connected`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url, account_id: accountId })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[stripe-onboard]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data: tm } = await supabaseAdmin
      .from('team_members')
      .select('stripe_account_id')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()

    if (!tm?.stripe_account_id) {
      return NextResponse.json({ connected: false })
    }

    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('stripe_api_key')
      .eq('id', tenantId)
      .single()

    const stripe = getStripe((tenantRow as { stripe_api_key?: string | null } | null)?.stripe_api_key)
    const account = await stripe.accounts.retrieve(tm.stripe_account_id)
    return NextResponse.json({
      connected: true,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
