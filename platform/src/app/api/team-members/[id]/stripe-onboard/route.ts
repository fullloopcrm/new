/**
 * Stripe Connect onboarding — ported from nycmaid (cleaners/[id]/stripe-onboard).
 * Creates an Express account for the team member and returns a hosted onboarding URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
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
