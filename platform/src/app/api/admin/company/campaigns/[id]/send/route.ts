import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { statusForFilter, isRecipientFilter, type RecipientFilter } from '@/lib/company-campaigns'

// POST /api/admin/company/campaigns/[id]/send — sends via the platform's own
// default Resend key (no tenant resendApiKey override), same fallback path
// admin/requests/proposal-email already uses for Full-Loop-as-sender email.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await ctx.params
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('platform_campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (campaignError || !campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 409 })

  const filter: RecipientFilter = isRecipientFilter(campaign.recipient_filter) ? campaign.recipient_filter : 'all_tenants'
  const statusFilter = statusForFilter(filter)

  let query = supabaseAdmin.from('tenants').select('id, name, owner_email, email, owner_phone, phone').neq('status', 'deleted')
  if (statusFilter) query = query.eq('status', statusFilter)
  const { data: tenants, error: tenantsError } = await query

  if (tenantsError) return NextResponse.json({ error: tenantsError.message }, { status: 500 })

  const channel: string = campaign.channel || 'email'
  const wantsEmail = channel === 'email' || channel === 'both'
  const wantsSms = channel === 'sms' || channel === 'both'

  const recipients = (tenants || []).map((t) => ({
    name: t.name as string,
    email: (t.owner_email || t.email) as string | null,
    phone: (t.owner_phone || t.phone) as string | null,
  }))

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No eligible recipients for this filter' }, { status: 400 })
  }

  const smsApiKey = process.env.TELNYX_API_KEY
  const smsFrom = process.env.TELNYX_FROM_NUMBER
  if (wantsSms && (!smsApiKey || !smsFrom)) {
    return NextResponse.json({ error: 'SMS not configured (missing TELNYX_API_KEY/TELNYX_FROM_NUMBER)' }, { status: 400 })
  }

  let sentCount = 0
  for (const r of recipients) {
    let sentThisRecipient = false

    if (wantsEmail && r.email) {
      const personalizedBody = (campaign.body as string).replace(/\{name\}/g, r.name)
      try {
        await sendEmail({ to: r.email, subject: campaign.subject, html: personalizedBody })
        sentThisRecipient = true
      } catch (e) {
        console.error(`[company-campaigns] email send failed for ${r.email}:`, e)
      }
    }

    if (wantsSms && r.phone && smsApiKey && smsFrom) {
      const personalizedSms = ((campaign.sms_body as string | null) || '').replace(/\{name\}/g, r.name)
      try {
        await sendSMS({ to: r.phone, body: personalizedSms, telnyxApiKey: smsApiKey, telnyxPhone: smsFrom })
        sentThisRecipient = true
      } catch (e) {
        console.error(`[company-campaigns] sms send failed for ${r.phone}:`, e)
      }
    }

    if (sentThisRecipient) sentCount++
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('platform_campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString(), recipient_count: sentCount })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ campaign: updated, sent: sentCount, attempted: recipients.length })
}
