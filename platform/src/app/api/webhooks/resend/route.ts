import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySvix } from '@/lib/webhook-verify'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()

    if (process.env.RESEND_WEBHOOK_VERIFY !== 'off') {
      const result = verifySvix(request.headers, rawBody, process.env.RESEND_WEBHOOK_SECRET)
      if (!result.valid) {
        console.warn('[resend webhook] rejected:', result.reason)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    let body: { type?: string; data?: { email_id?: string } }
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json({ ok: true })
    }

    // Inbound email (Resend "Enable Receiving") → store for the admin inbox.
    if (type === 'email.received') {
      const d = data as unknown as Record<string, unknown>
      const join = (v: unknown) =>
        Array.isArray(v) ? v.map(String).join(', ') : typeof v === 'string' ? v : null
      await supabaseAdmin.from('inbound_emails').insert({
        resend_email_id: (d.email_id as string) || (d.id as string) || null,
        from_address: join(d.from),
        to_address: join(d.to),
        subject: (d.subject as string) || null,
        text_body: (d.text as string) || null,
        html_body: (d.html as string) || null,
        headers: (d.headers as object) ?? null,
        raw: d,
      })
      return NextResponse.json({ ok: true })
    }

    const emailId = data.email_id
    if (!emailId) {
      return NextResponse.json({ ok: true })
    }

    // Look up campaign recipient by resend_email_id
    const { data: recipient } = await supabaseAdmin
      .from('campaign_recipients')
      .select('id, campaign_id, status')
      .eq('resend_email_id', emailId)
      .single()

    if (!recipient) {
      return NextResponse.json({ ok: true })
    }

    const now = new Date().toISOString()

    if (type === 'email.delivered') {
      await supabaseAdmin
        .from('campaign_recipients')
        .update({ status: 'delivered', delivered_at: now })
        .eq('id', recipient.id)
    } else if (type === 'email.opened') {
      if (recipient.status !== 'opened') {
        await supabaseAdmin
          .from('campaign_recipients')
          .update({ status: 'opened', opened_at: now })
          .eq('id', recipient.id)
      }
    } else if (type === 'email.bounced') {
      await supabaseAdmin
        .from('campaign_recipients')
        .update({ status: 'bounced' })
        .eq('id', recipient.id)
    } else {
      return NextResponse.json({ ok: true })
    }

    // Recount campaign aggregate stats
    const { data: counts } = await supabaseAdmin
      .from('campaign_recipients')
      .select('status')
      .eq('campaign_id', recipient.campaign_id)

    if (counts) {
      const delivered = counts.filter(r => r.status === 'delivered' || r.status === 'opened').length
      const opened = counts.filter(r => r.status === 'opened').length
      const failed = counts.filter(r => r.status === 'failed' || r.status === 'bounced').length

      await supabaseAdmin
        .from('campaigns')
        .update({ delivered_count: delivered, opened_count: opened, failed_count: failed })
        .eq('id', recipient.campaign_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Resend webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
