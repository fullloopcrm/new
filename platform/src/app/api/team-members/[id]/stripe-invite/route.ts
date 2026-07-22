/**
 * Send a Stripe Connect onboarding invite to a team member (SMS, falling back
 * to email — see notify()'s built-in channel fallback). Companion to
 * stripe-onboard: that route is for the admin driving onboarding in-browser
 * (e.g. from the HR profile); this route is for the "Send Connect invite"
 * action surfaced right after a team application is approved, so the admin
 * doesn't have to hand a phone/laptop to the new hire on the spot.
 *
 * Tenant-generic: works identically for every tenant via requirePermission()
 * + getTenantForRequest(), same as stripe-onboard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
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
    if (!tm.phone && !tm.email) {
      return NextResponse.json({ error: 'Team member has no phone or email on file' }, { status: 400 })
    }

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
      refresh_url: `${baseUrl}/team/stripe?tm=${id}&stripe=refresh`,
      return_url: `${baseUrl}/team/stripe?tm=${id}&stripe=connected`,
      type: 'account_onboarding',
    })

    const firstName = (tm.name || 'there').split(' ')[0]
    const result = await notify({
      tenantId,
      type: 'team_member_added',
      title: 'Set up your payouts',
      message: `Hi ${firstName}, set up your payout account to get paid after each job: ${link.url}`,
      channel: 'sms',
      recipientType: 'team_member',
      recipientId: id,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Could not deliver invite', url: link.url }, { status: 502 })
    }

    return NextResponse.json({ success: true, url: link.url, account_id: accountId })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[stripe-invite]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
