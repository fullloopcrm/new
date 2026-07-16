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
 */
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { smsAdmins } from '@/lib/admin-contacts'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { decryptSecret } from '@/lib/secret-crypto'
import { verifyOAuthState } from '@/lib/oauth-state'

function getStripe(key: string | null | undefined): Stripe {
  // Per-tenant keys are stored encrypted; decryptSecret() passes plaintext through.
  const apiKey = key ? decryptSecret(key) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

async function resolveTenantForTeamMember(teamMemberId: string, token: string | null) {
  // Prefer tenant from request headers (middleware injects it) but fall back
  // to a signed token (minted by the authenticated /stripe-onboard POST for
  // this exact tenant+team-member pair) so this endpoint still works when hit
  // directly by Stripe's return-URL redirect, which lands on the main
  // dashboard host — no host-based x-tenant-id header is ever injected there.
  //
  // Previously this fallback looked the tenant up straight off the
  // team_members row keyed by the caller-supplied id, with no proof the
  // caller had any right to that id. That made the tenant_id used for every
  // downstream `.eq('tenant_id', ...)` check circular — derived from the very
  // id it was supposed to be validating — so any anonymous caller could read
  // (and, on first success, mutate + trigger an admin notify/SMS for) any
  // tenant's team member's Stripe Connect status by guessing/knowing a UUID.
  // Same CSRF-binding HMAC pattern as lib/oauth-state.ts's social-OAuth
  // callbacks closes it: the token can only be forged by a tenant.edit-
  // authenticated caller, for this specific team member, within 15 minutes.
  const headerTenant = await getTenantFromHeaders()
  if (headerTenant) return headerTenant

  const verified = verifyOAuthState(token)
  if (!verified) return null
  const [tenantId, boundTeamMemberId] = verified.split(':')
  if (!tenantId || boundTeamMemberId !== teamMemberId) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()
  return tenant
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const tenant = await resolveTenantForTeamMember(id, req.nextUrl.searchParams.get('t'))
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
    console.error('[stripe-status] POST error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const tenant = await resolveTenantForTeamMember(id, req.nextUrl.searchParams.get('t'))
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
    console.error('[stripe-status] GET error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
