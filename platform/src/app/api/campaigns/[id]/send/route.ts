import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { getSettings } from '@/lib/settings'
import { audit } from '@/lib/audit'

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

    const settings = await getSettings(tenantId)

    // This route had NO protection against sending the same campaign twice:
    // re-clicking Send after it already went out (confused user, page
    // refresh, network retry) blasted every client on the list again with no
    // guard at all. Refuse any status past the two valid pre-send states.
    if (campaign.status === 'sending' || campaign.status === 'sent') {
      return NextResponse.json({ error: 'Campaign has already been sent' }, { status: 400 })
    }

    // Tenant rule: campaign_approval_required gates send on an explicit
    // 'approved' status — drafts can't ship without sign-off.
    if (settings.campaign_approval_required && campaign.status !== 'approved') {
      return NextResponse.json(
        { error: 'This tenant requires campaign approval before sending. Set status to approved first.' },
        { status: 403 }
      )
    }

    // Check-then-act, not atomic: the status checks above read a stale
    // snapshot. A double-click or a second concurrent request landing before
    // this route's own write lands would both pass those checks and both go
    // on to send every email/SMS in the campaign a second time. Atomically
    // claim the campaign by re-asserting the exact status just read in this
    // write's own WHERE — zero rows matched means a concurrent request (or a
    // fast double-click) already claimed it, so bail instead of double-send.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', campaign.status)
      .select('id')
      .maybeSingle()
    if (claimErr) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    if (!claimed) {
      return NextResponse.json({ error: 'This campaign is already sending or has been sent' }, { status: 409 })
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
      return NextResponse.json({ error: 'No eligible recipients' }, { status: 400 })
    }

    let sentCount = 0
    const sendEmails = campaign.type === 'email' || campaign.type === 'both'
    const sendSMSMessages = campaign.type === 'sms' || campaign.type === 'both'

    const hasEmail = !!(tenant.resend_api_key || (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'))

    if (sendEmails && !hasEmail) {
      return NextResponse.json({ error: 'Email not configured. Add Resend API key in Settings.' }, { status: 400 })
    }
    if (sendSMSMessages && (!tenant.telnyx_api_key || !tenant.telnyx_phone)) {
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
        .replace(/\{name\}/g, client.name)
        .replace(/\{business\}/g, tenant.name)

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
