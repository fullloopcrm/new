/**
 * Sales partner commission ledger. Tenant-scoped. Ported from nycmaid
 * (sales_partner_commissions table, src/app/api/sales-partner-commissions/route.ts),
 * adapted to this codebase's requirePermission + signed-portal-token pattern
 * (same auth bar the sibling GET/PUT /api/referral-commissions was already
 * raised to).
 *
 * GET (bearer sales-partner token) — that partner's own commissions.
 * GET (admin session) — every commission for the tenant.
 * PUT (admin) — mark a commission paid; bumps sales_partners.total_paid and
 *               posts the payout to the finance ledger. paid_via:'stripe_connect'
 *               moves real money via a Stripe Connect transfer (mirrors the
 *               claim-before-transfer pattern in lib/finance/cleaner-payout.ts
 *               + lib/payment-processor.ts) instead of just recording a manual
 *               Zelle/Apple Cash payout.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { getSalesPartnerAuth } from '@/lib/sales-partner-portal-auth'
import { bumpSalesPartnerTotalOrFlag } from '@/lib/sales-partner-ledger'
import { postSalesPartnerCommissionPayment } from '@/lib/finance/post-adjustments'
import { getStripe } from '@/lib/stripe'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const portalAuth = getSalesPartnerAuth(request)

    if (portalAuth) {
      const { data: partnerRow } = await supabaseAdmin
        .from('sales_partners')
        .select('tenant_id')
        .eq('id', portalAuth.pid)
        .eq('tenant_id', portalAuth.tid)
        .maybeSingle()
      if (!partnerRow || partnerRow.tenant_id !== portalAuth.tid) {
        return NextResponse.json({ error: 'Sales partner not found' }, { status: 404 })
      }

      let query = supabaseAdmin
        .from('sales_partner_commissions')
        .select('*, sales_partners(name, email, referral_code), referrers(name, referral_code), bookings(start_time, price)')
        .eq('tenant_id', partnerRow.tenant_id)
        .eq('sales_partner_id', portalAuth.pid)
        .order('created_at', { ascending: false })
      if (status) query = query.eq('status', status)
      const { data, error } = await query
      if (error) throw error
      return NextResponse.json(data)
    }

    const { tenant, error: authError } = await requirePermission('sales_partners.view')
    if (authError) return authError
    const { tenantId } = tenant
    let query = supabaseAdmin
      .from('sales_partner_commissions')
      .select('*, sales_partners(name, email, referral_code), referrers(name, referral_code), bookings(start_time, price)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Sales partner commissions GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales_partners.payout')
    if (authError) return authError
    const { tenantId } = tenant
    const { id, status, paid_via } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: Record<string, unknown> = { status }
    const markingPaid = status === 'paid'
    const viaStripe = markingPaid && paid_via === 'stripe_connect'
    if (markingPaid) {
      updates.paid_at = new Date().toISOString()
      updates.paid_via = paid_via || 'zelle'
    }

    // `.neq('status', 'paid')` — DB-level compare-and-swap so a double-click
    // or retried request can't double-bump total_paid / double-post the
    // ledger. Same pattern as PUT /api/referral-commissions. For the Stripe
    // path this update IS the claim (mirrors the insert-based claim in
    // lib/finance/cleaner-payout.ts): the row flips to 'paid' first, then the
    // transfer is attempted; a failed transfer reverts the row so a retry can
    // re-claim it, instead of leaving a commission marked paid with no money
    // moved.
    let query = supabaseAdmin.from('sales_partner_commissions').update(updates).eq('id', id).eq('tenant_id', tenantId)
    if (markingPaid) query = query.neq('status', 'paid')
    const { data, error } = await query.select().maybeSingle()
    if (error) throw error

    if (!data) {
      const { data: current } = await supabaseAdmin
        .from('sales_partner_commissions')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(current)
    }

    if (viaStripe) {
      const transferResult = await transferCommissionViaStripe({ tenantId, commission: data })
      if (!transferResult.ok) {
        // Revert the claim -- no money moved, so this commission must not
        // read as paid. Restores whatever status it was in before this PUT.
        await supabaseAdmin
          .from('sales_partner_commissions')
          .update({ status: 'pending', paid_at: null, paid_via: null })
          .eq('id', id)
          .eq('tenant_id', tenantId)
        return NextResponse.json({ error: transferResult.error }, { status: 502 })
      }
      await supabaseAdmin
        .from('sales_partner_commissions')
        .update({ stripe_transfer_id: transferResult.transferId })
        .eq('id', id)
        .eq('tenant_id', tenantId)
    }

    if (markingPaid) {
      await bumpSalesPartnerTotalOrFlag(tenantId, data.sales_partner_id as string, 'total_paid', data.commission_cents as number, {
        relatedType: 'sales_partner_commission',
        relatedId: data.id as string,
      })
      postSalesPartnerCommissionPayment({ tenantId, commissionId: data.id as string })
        .catch(err => console.error('[sp-comm] payment post failed:', err))
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Sales partner commissions PUT error:', err)
    return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 })
  }
}

type StripeTransferResult = { ok: true; transferId: string } | { ok: false; error: string }

/**
 * Moves the actual money for a paid_via:'stripe_connect' commission. Requires
 * the partner to have completed onboarding (stripe_ready_at set) -- a
 * connect_account_id alone only means "started onboarding" (see
 * stripe-status/route.ts), not "can receive a transfer".
 */
async function transferCommissionViaStripe(opts: {
  tenantId: string
  commission: Record<string, unknown>
}): Promise<StripeTransferResult> {
  const { tenantId, commission } = opts
  const partnerId = commission.sales_partner_id as string
  const commissionCents = commission.commission_cents as number
  if (!commissionCents || commissionCents <= 0) {
    return { ok: false, error: 'Commission amount must be positive to transfer' }
  }

  const { data: partner } = await supabaseAdmin
    .from('sales_partners')
    .select('id, name, stripe_connect_account_id, stripe_ready_at')
    .eq('id', partnerId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!partner?.stripe_connect_account_id || !partner.stripe_ready_at) {
    return { ok: false, error: 'Sales partner has not completed Stripe Connect onboarding' }
  }

  const { data: tenantRow } = await supabaseAdmin
    .from('tenants')
    .select('stripe_api_key')
    .eq('id', tenantId)
    .maybeSingle()

  try {
    const stripe = getStripe((tenantRow as { stripe_api_key?: string | null } | null)?.stripe_api_key || undefined)
    const transfer = await stripe.transfers.create({
      amount: commissionCents,
      currency: 'usd',
      destination: partner.stripe_connect_account_id,
      description: `Sales partner commission for ${partner.name}`,
      metadata: { commission_id: commission.id as string, sales_partner_id: partnerId, tenant_id: tenantId },
    }, { idempotencyKey: `sales-partner-commission:${commission.id}` })
    return { ok: true, transferId: transfer.id }
  } catch (e) {
    console.error('[sp-comm] stripe transfer failed:', e)
    return { ok: false, error: e instanceof Error ? e.message : 'Stripe transfer failed' }
  }
}
