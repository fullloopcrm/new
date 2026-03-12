import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'

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

    // Get recipients (all active clients with opt-in)
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, phone')
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

    for (const client of clients) {
      const personalizedBody = campaign.body
        .replace(/\{name\}/g, client.name)
        .replace(/\{business\}/g, tenant.name)

      if (sendEmails && client.email) {
        try {
          await sendEmail({
            to: client.email,
            subject: campaign.subject || campaign.name,
            html: personalizedBody,
            resendApiKey: tenant.resend_api_key,
          })
          sentCount++
        } catch (e) {
          console.error(`Campaign email failed for ${client.email}:`, e)
        }
      }

      if (sendSMSMessages && client.phone) {
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

    return NextResponse.json({ sent: sentCount })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
