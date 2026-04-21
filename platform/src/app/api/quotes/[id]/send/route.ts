/**
 * Send quote to recipient via SMS / email / both. Transitions draft → sent.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { logQuoteEvent, formatCents } from '@/lib/quote'
import { decryptSecret } from '@/lib/secret-crypto'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const via: 'email' | 'sms' | 'both' = body.via || 'both'

    const { data: quote, error: qErr } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (qErr || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    if (quote.status === 'accepted' || quote.status === 'declined' || quote.status === 'converted') {
      return NextResponse.json({ error: `Cannot re-send ${quote.status} quote` }, { status: 400 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, slug, domain, telnyx_api_key, telnyx_phone, resend_api_key, email_from, selena_config')
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant config missing' }, { status: 500 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const baseUrl = tenant.domain ? `https://${tenant.domain}` : appUrl
    const quoteUrl = `${baseUrl}/quote/${quote.public_token}`

    const toEmail = body.to_email || quote.contact_email
    const toPhone = body.to_phone || quote.contact_phone

    const results: { email?: { ok: boolean; detail?: string }; sms?: { ok: boolean; detail?: string } } = {}

    // ── EMAIL ──
    if ((via === 'email' || via === 'both') && toEmail) {
      try {
        const apiKey = tenant.resend_api_key ? decryptSecret(tenant.resend_api_key) : null
        if (!apiKey) throw new Error('No Resend API key configured for tenant')
        const fromEmail = tenant.email_from || `quotes@${tenant.domain || 'fullloopcrm.com'}`
        const html = renderQuoteEmailHtml({
          businessName: tenant.name,
          quoteNumber: quote.quote_number,
          title: quote.title || 'Your Quote',
          total: formatCents(quote.total_cents),
          quoteUrl,
          validUntil: quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-US') : null,
          contactName: quote.contact_name || null,
        })
        await sendEmail({
          to: toEmail,
          subject: `Your quote from ${tenant.name} — ${formatCents(quote.total_cents)}`,
          html,
          from: fromEmail,
          resendApiKey: apiKey,
        })
        results.email = { ok: true }
      } catch (e) {
        results.email = { ok: false, detail: e instanceof Error ? e.message : 'send failed' }
      }
    }

    // ── SMS ──
    if ((via === 'sms' || via === 'both') && toPhone) {
      try {
        const apiKey = tenant.telnyx_api_key ? decryptSecret(tenant.telnyx_api_key) : null
        const phoneFrom = tenant.telnyx_phone || ''
        if (!apiKey || !phoneFrom) throw new Error('No Telnyx credentials configured for tenant')
        const firstName = (quote.contact_name || '').split(' ')[0] || 'there'
        const smsBody = `Hi ${firstName}, here's your quote from ${tenant.name} for ${formatCents(quote.total_cents)}: ${quoteUrl}`
        await sendSMS({ to: toPhone, body: smsBody, telnyxApiKey: apiKey, telnyxPhone: phoneFrom })
        results.sms = { ok: true }
      } catch (e) {
        results.sms = { ok: false, detail: e instanceof Error ? e.message : 'send failed' }
      }
    }

    const anyOk = results.email?.ok || results.sms?.ok
    if (!anyOk) {
      return NextResponse.json({ error: 'Neither channel sent', results }, { status: 400 })
    }

    const sentVia =
      results.email?.ok && results.sms?.ok ? 'both' : results.email?.ok ? 'email' : 'sms'

    await supabaseAdmin
      .from('quotes')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_via: sentVia })
      .eq('id', id)

    await logQuoteEvent({
      quote_id: id,
      tenant_id: tenantId,
      event_type: 'sent',
      detail: { via: sentVia, results, to_email: toEmail, to_phone: toPhone },
    })

    return NextResponse.json({ ok: true, via: sentVia, results, quote_url: quoteUrl })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quotes/[id]/send', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}

function renderQuoteEmailHtml(opts: {
  businessName: string
  quoteNumber: string
  title: string
  total: string
  quoteUrl: string
  validUntil: string | null
  contactName: string | null
}): string {
  const greeting = opts.contactName ? `Hi ${opts.contactName},` : 'Hi there,'
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="padding:32px 32px 16px;">
      <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Quote ${escapeHtml(opts.quoteNumber)}</p>
      <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">${escapeHtml(opts.title)}</h1>
      <p style="color:#475569;line-height:1.6;margin:0 0 8px;">${greeting}</p>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">Your quote from <strong>${escapeHtml(opts.businessName)}</strong> is ready to review. Review the details and accept online when you're ready.</p>
      <div style="background:#f1f5f9;border-radius:10px;padding:20px;text-align:center;margin:0 0 24px;">
        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">Total</p>
        <p style="font-size:32px;font-weight:700;color:#0f172a;margin:0;">${escapeHtml(opts.total)}</p>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${encodeURI(opts.quoteUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Review &amp; Accept</a>
      </div>
      ${opts.validUntil ? `<p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Valid until ${escapeHtml(opts.validUntil)}</p>` : ''}
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">Sent by ${escapeHtml(opts.businessName)} via Full Loop</p>
    </div>
  </div>
</body></html>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
