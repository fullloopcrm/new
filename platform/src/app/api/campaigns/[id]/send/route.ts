import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { getSettings } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { escapeHtml } from '@/lib/escape-html'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant: tenantCtx, error: authError } = await requirePermission('campaigns.send')
  if (authError) return authError

  try {
    const { tenantId, tenant } = tenantCtx
    const { id } = await params

    // Get campaign
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Guard against re-sending: the UI only shows Send while status is
    // 'draft'/'approved', but that's a client-side hint, not enforcement —
    // without this check a replayed/duplicate POST re-blasts every active
    // client again.
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return NextResponse.json({ error: 'Campaign has already been sent' }, { status: 400 })
    }

    const settings = await getSettings(tenantId)

    // Tenant rule: campaign_approval_required gates send on an explicit
    // 'approved' status — drafts can't ship without sign-off.
    if (settings.campaign_approval_required && campaign.status !== 'approved') {
      return NextResponse.json(
        { error: 'This tenant requires campaign approval before sending. Set status to approved first.' },
        { status: 403 }
      )
    }

    // Atomic claim: two concurrent sends both read the same pre-send status
    // and would both pass the checks above -- CAS on that exact status so
    // only one request can flip it to 'sending'. The loser gets null back
    // instead of falling through to double-blast every active client.
    const { data: claimed } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', campaign.status)
      .select('id')
      .maybeSingle()

    if (!claimed) {
      return NextResponse.json({ error: 'Campaign has already been sent' }, { status: 400 })
    }

    // Get recipients (active clients). Per-channel marketing opt-outs are
    // enforced below so a client who opted out of SMS/email marketing is never
    // sent a campaign on that channel (CAN-SPAM / TCPA).
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, sms_marketing_opt_out, email_marketing_opt_out, sms_consent')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    if (!clients || clients.length === 0) {
      await supabaseAdmin.from('campaigns').update({ status: campaign.status }).eq('id', id)
      return NextResponse.json({ error: 'No eligible recipients' }, { status: 400 })
    }

    let sentCount = 0
    const sendEmails = campaign.type === 'email' || campaign.type === 'both'
    const sendSMSMessages = campaign.type === 'sms' || campaign.type === 'both'

    const hasEmail = !!(tenant.resend_api_key || (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'))

    if (sendEmails && !hasEmail) {
      await supabaseAdmin.from('campaigns').update({ status: campaign.status }).eq('id', id)
      return NextResponse.json({ error: 'Email not configured. Add Resend API key in Settings.' }, { status: 400 })
    }
    if (sendSMSMessages && (!tenant.telnyx_api_key || !tenant.telnyx_phone)) {
      await supabaseAdmin.from('campaigns').update({ status: campaign.status }).eq('id', id)
      return NextResponse.json({ error: 'SMS not configured. Add Telnyx keys in Settings.' }, { status: 400 })
    }

    // Sender display name comes from settings.campaign_sender_name; format as
    // "Name <email>" so Resend uses the configured sender. Resend domain
    // determines the email half — fall back to the platform default when not set.
    const fromName = settings.campaign_sender_name || tenant.name || 'Full Loop'
    const fromEmail = tenant.email_from
      || (tenant.resend_domain ? `noreply@${tenant.resend_domain}` : 'noreply@fullloopcrm.com')
    const fromHeader = `${fromName} <${fromEmail}>`

    for (const client of clients) {
      const personalizedBody = campaign.body
        .replace(/\{name\}/g, escapeHtml(client.name))
        .replace(/\{business\}/g, escapeHtml(tenant.name))

      // Tenant rule: auto_unsubscribe appends a reply-STOP / unsubscribe
      // footer to every outbound email body so each send is one-click
      // opt-out-able. Default true; off only if the tenant explicitly disabled.
      // CAN-SPAM also requires the sender's physical postal address — appended
      // whenever it's on file, independent of the unsubscribe toggle.
      const tenantAddress = (tenant as { address?: string | null }).address
      const addressLine = tenantAddress ? `<br>${tenant.name} · ${tenantAddress}` : ''
      const emailBody = settings.campaign_auto_unsubscribe
        ? `${personalizedBody}<hr style="margin-top:24px"><p style="font-size:12px;color:#888">You're receiving this because you're a ${tenant.name} client. <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.homeservicesbusinesscrm.com'}/unsubscribe?email=${encodeURIComponent(client.email || '')}">Unsubscribe</a>${addressLine}</p>`
        : (tenantAddress ? `${personalizedBody}<hr style="margin-top:24px"><p style="font-size:12px;color:#888">${tenant.name} · ${tenantAddress}</p>` : personalizedBody)

      if (sendEmails && client.email && !client.email_marketing_opt_out) {
        try {
          await sendEmail({
            to: client.email,
            subject: campaign.subject || campaign.name,
            html: emailBody,
            from: fromHeader,
            resendApiKey: tenant.resend_api_key,
          })
          sentCount++
        } catch (e) {
          console.error(`Campaign email failed for ${client.email}:`, e)
        }
      }

      if (sendSMSMessages && client.phone && !client.sms_marketing_opt_out && client.sms_consent !== false) {
        try {
          await sendSMS({
            to: client.phone,
            body: personalizedBody,
            telnyxApiKey: tenant.telnyx_api_key!,
            telnyxPhone: tenant.telnyx_phone!,
          })
          sentCount++
        } catch (e) {
          console.error(`Campaign SMS failed for ${client.phone}:`, e)
        }
      }
    }

    // Update campaign
    await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: sentCount,
      })
      .eq('id', id)

    await audit({ tenantId, action: 'campaign.sent', entityType: 'campaign', entityId: id, details: { name: campaign.name, recipients: sentCount } })

    return NextResponse.json({ sent: sentCount })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
