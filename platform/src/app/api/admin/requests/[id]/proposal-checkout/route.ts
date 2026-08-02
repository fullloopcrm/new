/**
 * POST /api/admin/requests/:id/proposal-checkout
 *
 * Generates the Stripe Checkout link for the RECURRING $2,500/mo subscription
 * only (first invoice $1) — the $25k setup fee is a separate bank wire, never
 * charged here. Admin sends/opens it; the customer pays; the platform webhook
 * records the subscription on the lead. The tenant itself is created
 * separately, once the wire is confirmed (see requests/[id]/wire-received).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { createProposalCheckout } from '@/lib/platform-billing'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const { data: lead } = await supabaseAdmin
    .from('partner_requests')
    .select('id, email, proposal_sent_at, converted_tenant_id')
    .eq('id', id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (lead.converted_tenant_id) return NextResponse.json({ error: 'Already converted to a tenant' }, { status: 400 })
  if (!lead.proposal_sent_at) return NextResponse.json({ error: 'Build the proposal first' }, { status: 400 })

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const origin = host ? `https://${host}` : new URL(request.url).origin

  try {
    const { url } = await createProposalCheckout({
      leadId: lead.id,
      email: lead.email,
      origin,
    })
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[proposal-checkout] failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Checkout create failed' }, { status: 500 })
  }
}
