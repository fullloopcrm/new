/**
 * Stripe Connect status refresh — companion to stripe-onboard.
 * Ported from nycmaid (/api/cleaners/[id]/stripe-status).
 *
 * POST refreshes the live Stripe account state after a team member returns
 * from the hosted onboarding flow; if charges/payouts/transfers are ready,
 * flips stripe ready flag on the team_member row and notifies admins.
 *
 * GET returns the current live status (used by the onboarding completion page).
 *
 * Multi-tenant: uses tenant.stripe_api_key when present, falls back to env.
 *
 * Auth: requires an authenticated tenant-admin/operator session
 * (requirePermission), scoped to their own tenant. This previously trusted
 * an unauthenticated getTenantFromHeaders()/team_members-id fallback, which
 * let anyone who could reach the route (middleware only checks that an
 * admin_token cookie is *present*, not valid) pull live Stripe Connect
 * status for any team member on any tenant by guessing/enumerating ids.
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { smsAdmins } from '@/lib/admin-contacts'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { decryptSecret } from '@/lib/secret-crypto'

function getStripe(key: string | null | undefined): Stripe {
  // Per-tenant keys are stored encrypted; decryptSecret() passes plaintext through.
  const apiKey = key ? decryptSecret(key) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenant: authTenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { id } = await params
    const tenantId = authTenant.tenantId

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { data: teamMember } = await supabaseAdmin
      .from('team_members')
      .select('id, name, stripe_account_id, stripe_ready_at')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!teamMember?.stripe_account_id) {
      return NextResponse.json({ ready: false })
    }

    const stripe = getStripe((tenant as { stripe_api_key?: string | null }).stripe_api_key)
    const account = await stripe.accounts.retrieve(teamMember.stripe_account_id)
    const ready = Boolean(
      account.charges_enabled ||
      account.payouts_enabled ||
      account.capabilities?.transfers === 'active',
    )

    // Only fire admin notifications when this is a new-activation event
    const wasAlreadyReady = !!teamMember.stripe_ready_at
    if (ready && !wasAlreadyReady) {
      await supabaseAdmin
        .from('team_members')
        .update({ stripe_ready_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant.id)

      notify({
        tenantId: tenant.id,
        type: 'team_member_added',
        title: `${teamMember.name} set up instant pay`,
        message: `${teamMember.name} completed Stripe Connect onboarding. Instant payouts enabled.`,
      }).catch(() => {})

      smsAdmins(tenant, `${teamMember.name} just set up instant pay (Stripe Connect). Auto-payouts active.`).catch(() => {})
    }

    return NextResponse.json({
      ready,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[stripe-status] POST error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenant: authTenant, error: authError } = await requirePermission('team.view')
    if (authError) return authError
    const { tenantId } = authTenant
    const { id } = await params

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { data: tm } = await supabaseAdmin
      .from('team_members')
      .select('stripe_account_id')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!tm?.stripe_account_id) return NextResponse.json({ ready: false })

    const stripe = getStripe((tenant as { stripe_api_key?: string | null }).stripe_api_key)
    const account = await stripe.accounts.retrieve(tm.stripe_account_id)
    return NextResponse.json({
      ready: Boolean(account.charges_enabled || account.payouts_enabled || account.capabilities?.transfers === 'active'),
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[stripe-status] GET error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
