/**
 * POST /api/admin/requests/proposal  { id, admins, team_members }
 *
 * Builds the proposal on a lead at the Proposed stage: $25k setup auto-applied,
 * admin + portal-team seat counts, computed monthly. Saves it to the lead and
 * advances the pipeline to 'proposed'.
 *
 * Phase 1: saves the proposal + stamps proposal_sent_at. The accept+pay page
 * (ACH setup + card-on-file recurring) and the email are wired in Phase 2.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { PRICING, computeMonthly } from '@/lib/billing-pricing'

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id, admins, team_members } = await request.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Lead id is required' }, { status: 400 })

  const adminCount = Math.max(1, Number(admins) || 1)
  const teamCount = Math.max(0, Number(team_members) || 0)
  const monthly = computeMonthly(adminCount, teamCount)

  const { error } = await supabaseAdmin
    .from('partner_requests')
    .update({
      proposal_admins: adminCount,
      proposal_team_members: teamCount,
      proposal_setup_fee: PRICING.setupFee,
      proposal_monthly: monthly,
      proposal_sent_at: new Date().toISOString(),
      status: 'proposed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin',
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    proposal: { admins: adminCount, team_members: teamCount, setup_fee: PRICING.setupFee, monthly },
  })
}
