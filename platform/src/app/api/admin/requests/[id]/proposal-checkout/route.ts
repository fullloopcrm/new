/**
 * POST /api/admin/requests/:id/proposal-checkout
 *
 * Generates the Stripe Checkout link for an accepted proposal (seats + $25k
 * setup, ACH or card). Admin sends/opens it; the customer pays; the platform
 * webhook then creates the tenant. Uses the lead's saved proposal seat counts.
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
    .select('id, email, proposal_admins, proposal_team_members, proposal_sent_at, converted_tenant_id')
    .eq('id', id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (lead.converted_tenant_id) return NextResponse.json({ error: 'Already converted to a tenant' }, { status: 400 })
  if (!lead.proposal_sent_at) return NextResponse.json({ error: 'Build the proposal first' }, { status: 400 })

  // Prefer the platform's own canonical URL over client-supplied Host headers
  // (X-Forwarded-Host in particular is attacker-settable) so the Stripe
  // success/cancel URLs this customer is redirected to after paying can't be
  // pointed at a spoofed domain. Same convention as agreement/route.ts.
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const origin = process.env.NEXT_PUBLIC_APP_URL || (host ? `https://${host}` : new URL(request.url).origin)

  try {
    const { url } = await createProposalCheckout({
      leadId: lead.id,
      email: lead.email,
      admins: lead.proposal_admins || 1,
      teamMembers: lead.proposal_team_members || 0,
      origin,
    })
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[proposal-checkout] failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Checkout create failed' }, { status: 500 })
  }
}
