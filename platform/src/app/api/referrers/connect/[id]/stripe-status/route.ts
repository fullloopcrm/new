/**
 * Stripe Connect status refresh for referrers — same pattern as sales
 * partners (src/app/api/sales-partners/[id]/stripe-status), adapted for
 * referrers: uses the tenant's own Stripe account, not a single
 * platform-wide one.
 *
 * DB presence of stripe_connect_account_id only means "started onboarding,"
 * not "can actually receive a transfer" — this does the live check.
 * Gated on the referrer's own portal session (self-service refresh, same as
 * stripe-onboard) — not admin requirePermission.
 */
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { smsAdmins } from '@/lib/admin-contacts'
import { getReferrerAuth } from '@/lib/referrer-portal-auth'
import { decryptSecret } from '@/lib/secret-crypto'

function getStripe(key: string | null | undefined): Stripe {
  const apiKey = key ? decryptSecret(key) : process.env.STRIPE_SECRET_KEY
  if (!apiKey) throw new Error('Stripe not configured')
  return new Stripe(apiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

async function checkStatus(id: string, tenantId: string, notifyOnFirstReady: boolean) {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, stripe_api_key')
    .eq('id', tenantId)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: referrer } = await supabaseAdmin
    .from('referrers')
    .select('id, name, stripe_connect_account_id, stripe_ready_at')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!referrer?.stripe_connect_account_id) {
    return NextResponse.json({ ready: false })
  }

  const stripe = getStripe((tenant as { stripe_api_key?: string | null }).stripe_api_key)
  const account = await stripe.accounts.retrieve(referrer.stripe_connect_account_id)
  const ready = Boolean(
    account.charges_enabled || account.payouts_enabled || account.capabilities?.transfers === 'active',
  )

  const wasAlreadyReady = !!referrer.stripe_ready_at
  if (notifyOnFirstReady && ready && !wasAlreadyReady) {
    await supabaseAdmin
      .from('referrers')
      .update({ stripe_ready_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    notify({
      tenantId,
      type: 'team_member_added',
      title: `${referrer.name} set up instant pay`,
      message: `${referrer.name} completed Stripe Connect onboarding. Referral commission payouts can now go instantly.`,
    }).catch(() => {})

    smsAdmins(tenant, `${referrer.name} (referrer) just set up instant pay (Stripe Connect).`).catch(() => {})
  }

  return NextResponse.json({
    ready,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getReferrerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (id !== auth.rid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    return await checkStatus(id, auth.tid, true)
  } catch (e) {
    console.error('[referrer stripe-status] POST error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = getReferrerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (id !== auth.rid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    return await checkStatus(id, auth.tid, false)
  } catch (e) {
    console.error('[referrer stripe-status] GET error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
