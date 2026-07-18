/**
 * Stripe Connect onboarding — ported from nycmaid (cleaners/[id]/stripe-onboard).
 * Creates an Express account for the team member and returns a hosted onboarding URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
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

    const stripe = getStripe()
    let accountId = tm.stripe_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: tm.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { team_member_id: id, tenant_id: tenantId },
      })

      // Two concurrent onboarding requests (double-click, retry) both read
      // stripe_account_id as null and would both create a live Express
      // account -- an unconditional update() here means the last write wins
      // with no signal to the loser, so the team member can complete
      // onboarding on the account that gets discarded while payouts (which
      // read team_members.stripe_account_id) target the other, never-onboarded
      // one and fail. Claim atomically on IS NULL; if we lose the race, use
      // the winner's account id instead of the one we just created so the
      // onboarding link we return matches what payouts will actually use.
      const { data: claimed } = await supabaseAdmin
        .from('team_members')
        .update({ stripe_account_id: account.id })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('stripe_account_id', null)
        .select('id')
        .maybeSingle()

      if (claimed) {
        accountId = account.id
      } else {
        const { data: fresh } = await supabaseAdmin
          .from('team_members')
          .select('stripe_account_id')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single()
        accountId = fresh?.stripe_account_id || account.id
      }
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Failed to resolve Stripe account' }, { status: 500 })
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
    const { tenant: authTenant, error: authError } = await requirePermission('team.view')
    if (authError) return authError
    const { tenantId } = authTenant
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

    const stripe = getStripe()
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
