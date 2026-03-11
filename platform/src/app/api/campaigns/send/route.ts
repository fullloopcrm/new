import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'

export const maxDuration = 300

// ── POST: Send a campaign with recipient-level tracking ──────────────
export async function POST(request: Request) {
  const { tenant: tenantCtx, error: authError } = await requirePermission('campaigns.create')
  if (authError) return authError

  try {
    const { tenantId } = tenantCtx
    const { campaign_id, client_ids } = await request.json()

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    // Fetch campaign and verify ownership + draft status
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json({ error: 'Campaign has already been sent' }, { status: 400 })
    }

    // Mark as sending
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id)

    // Fetch audience
    let query = supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, email_marketing_opt_out, sms_marketing_opt_out')
      .eq('tenant_id', tenantId)

    if (client_ids && client_ids.length > 0) {
      query = query.in('id', client_ids)
    } else {
      // Filter by campaign's recipient_filter
      const filter = campaign.recipient_filter || 'all'
      if (filter === 'active') {
        query = query.eq('status', 'active')
      }
      // 'all' = no additional filter
    }

    const { data: clients } = await query

    if (!clients || clients.length === 0) {
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'sent', total_recipients: 0, sent_count: 0, failed_count: 0, sent_at: new Date().toISOString() })
        .eq('id', campaign_id)
      return NextResponse.json({ ok: true, total: 0, sent: 0, failed: 0 })
    }

    // Build recipient rows respecting per-channel opt-outs
    const sendEmail = campaign.type === 'email' || campaign.type === 'both'
    const sendSms = campaign.type === 'sms' || campaign.type === 'both'

    type RecipientRow = {
      campaign_id: string
      client_id: string
      channel: 'email' | 'sms'
      recipient: string
      status: string
      tenant_id: string
    }

    const recipientRows: RecipientRow[] = []

    for (const client of clients) {
      if (sendEmail && client.email && !client.email_marketing_opt_out) {
        recipientRows.push({
          campaign_id,
          client_id: client.id,
          channel: 'email',
          recipient: client.email,
          status: 'pending',
          tenant_id: tenantId,
        })
      }
      if (sendSms && client.phone && !client.sms_marketing_opt_out) {
        recipientRows.push({
          campaign_id,
          client_id: client.id,
          channel: 'sms',
          recipient: client.phone,
          status: 'pending',
          tenant_id: tenantId,
        })
      }
    }

    // Insert recipient rows
    if (recipientRows.length > 0) {
      await supabaseAdmin.from('campaign_recipients').insert(recipientRows)
    }

    // Send emails
    let sentCount = 0
    let failedCount = 0

    const emailRecipients = recipientRows.filter((r) => r.channel === 'email')
    for (const row of emailRecipients) {
      try {
        await notify({
          tenantId,
          type: 'campaign_sent',
          title: campaign.subject || campaign.name,
          message: campaign.body,
          channel: 'email',
          recipientType: 'client',
          recipientId: row.client_id,
          metadata: { campaignId: campaign_id },
        })
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'sent' })
          .eq('campaign_id', campaign_id)
          .eq('client_id', row.client_id)
          .eq('channel', 'email')
        sentCount++
      } catch (e) {
        console.error(`Campaign email failed for ${row.recipient}:`, e)
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'failed' })
          .eq('campaign_id', campaign_id)
          .eq('client_id', row.client_id)
          .eq('channel', 'email')
        failedCount++
      }
      // Throttle: 100ms between emails
      await new Promise((r) => setTimeout(r, 100))
    }

    // Send SMS
    const smsRecipients = recipientRows.filter((r) => r.channel === 'sms')
    for (const row of smsRecipients) {
      try {
        await notify({
          tenantId,
          type: 'campaign_sent',
          title: campaign.name,
          message: campaign.body,
          channel: 'sms',
          recipientType: 'client',
          recipientId: row.client_id,
          metadata: { campaignId: campaign_id },
        })
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'sent' })
          .eq('campaign_id', campaign_id)
          .eq('client_id', row.client_id)
          .eq('channel', 'sms')
        sentCount++
      } catch (e) {
        console.error(`Campaign SMS failed for ${row.recipient}:`, e)
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'failed' })
          .eq('campaign_id', campaign_id)
          .eq('client_id', row.client_id)
          .eq('channel', 'sms')
        failedCount++
      }
      // Throttle: 200ms between SMS
      await new Promise((r) => setTimeout(r, 200))
    }

    const totalRecipients = emailRecipients.length + smsRecipients.length

    // Update campaign with final stats
    await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'sent',
        total_recipients: totalRecipients,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaign_id)

    return NextResponse.json({ ok: true, total: totalRecipients, sent: sentCount, failed: failedCount })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

// ── PUT: Retry failed recipients ─────────────────────────────────────
export async function PUT(request: Request) {
  const { tenant: tenantCtx, error: authError } = await requirePermission('campaigns.create')
  if (authError) return authError

  try {
    const { tenantId } = tenantCtx
    const { campaign_id } = await request.json()

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    // Verify campaign belongs to tenant
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('tenant_id', tenantId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Fetch failed/pending recipients
    const { data: recipients } = await supabaseAdmin
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('tenant_id', tenantId)
      .in('status', ['failed', 'pending'])

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ ok: true, retried: 0, sent: 0, failed: 0 })
    }

    let sentCount = 0
    let failedCount = 0

    for (const row of recipients) {
      const delay = row.channel === 'sms' ? 200 : 100
      try {
        await notify({
          tenantId,
          type: 'campaign_sent',
          title: row.channel === 'email' ? (campaign.subject || campaign.name) : campaign.name,
          message: campaign.body,
          channel: row.channel,
          recipientType: 'client',
          recipientId: row.client_id,
          metadata: { campaignId: campaign_id },
        })
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'sent' })
          .eq('id', row.id)
        sentCount++
      } catch (e) {
        console.error(`Retry failed for ${row.recipient}:`, e)
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'failed' })
          .eq('id', row.id)
        failedCount++
      }
      await new Promise((r) => setTimeout(r, delay))
    }

    // Update campaign stats
    const { data: allRecipients } = await supabaseAdmin
      .from('campaign_recipients')
      .select('status')
      .eq('campaign_id', campaign_id)

    const totalSent = allRecipients?.filter((r) => r.status === 'sent').length || 0
    const totalFailed = allRecipients?.filter((r) => r.status === 'failed').length || 0

    await supabaseAdmin
      .from('campaigns')
      .update({
        sent_count: totalSent,
        failed_count: totalFailed,
      })
      .eq('id', campaign_id)

    return NextResponse.json({ ok: true, retried: recipients.length, sent: sentCount, failed: failedCount })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
