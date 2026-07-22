/**
 * Admin: mark/unmark a referrer as Stripe-ineligible (leader/Jeff 16:55,
 * CHANNEL.md). Manual Zelle/Apple Cash payout is mandatory-replaced by
 * Stripe Connect for every referrer who CAN connect — this is the one
 * escape hatch, and it's admin-flagged per-referrer, never a default
 * option. referral-commissions PUT only allows the manual paid_via fallback
 * when this flag is set.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Same bar as marking a commission paid — this decision directly controls
    // which payout rail a referrer's money moves through.
    const { tenant, error: authError } = await requirePermission('referrals.payout')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const { stripe_ineligible } = await request.json()
    if (typeof stripe_ineligible !== 'boolean') {
      return NextResponse.json({ error: 'stripe_ineligible (boolean) required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('referrers')
      .update({ stripe_ineligible_at: stripe_ineligible ? new Date().toISOString() : null })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, name, stripe_ineligible_at')
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })

    return NextResponse.json({ referrer: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[referrers PATCH stripe_ineligible]', err)
    return NextResponse.json({ error: 'Failed to update referrer' }, { status: 500 })
  }
}
