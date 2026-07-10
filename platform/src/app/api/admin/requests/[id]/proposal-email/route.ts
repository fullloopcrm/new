/**
 * POST /api/admin/requests/:id/proposal-email  { action: 'preview' | 'send', payUrl? }
 *
 * preview → returns { subject, html } (no Stripe needed; embeds payUrl if passed).
 * send    → generates the checkout link if none passed, emails the lead, returns ok.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { buildProposalEmail } from '@/lib/proposal-email'
import { computeMonthly } from '@/lib/billing-pricing'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action: 'preview' | 'send' = body.action === 'send' ? 'send' : 'preview'

  const { data: lead } = await supabaseAdmin
    .from('partner_requests')
    .select('id, business_name, contact_name, email, proposal_admins, proposal_team_members, proposal_monthly')
    .eq('id', id)
    .single()
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const admins = lead.proposal_admins || 1
  const teamMembers = lead.proposal_team_members || 0
  const monthly = lead.proposal_monthly ?? computeMonthly(admins, teamMembers)

  // Payment link is OPTIONAL. The proposal goes out to get a signature first;
  // the financial/Stripe step is added later. If a pay link was generated
  // separately (Generate payment link button), we include it — otherwise the
  // proposal sends without one.
  const payUrl: string | null = typeof body.payUrl === 'string' && body.payUrl ? body.payUrl : null

  const { subject, html } = buildProposalEmail({
    businessName: lead.business_name || 'your business',
    contactName: lead.contact_name,
    admins, teamMembers, monthly, payUrl,
  })

  if (action === 'preview') {
    return NextResponse.json({ subject, html, payUrl })
  }

  // test:true routes the send to the admin/testing inbox instead of the lead.
  const to = body.test ? (process.env.ADMIN_EMAIL || 'fullloopcrm@gmail.com') : lead.email
  if (!to) return NextResponse.json({ error: 'No recipient (lead has no email)' }, { status: 400 })
  try {
    const { sendEmail } = await import('@/lib/email')
    await sendEmail({ to, subject, html })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Send failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, sentTo: to })
}
