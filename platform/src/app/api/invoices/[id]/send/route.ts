/**
 * Send invoice to recipient via SMS / email / both.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { logInvoiceEvent, formatInvoiceCents } from '@/lib/invoice'
import { decryptSecret } from '@/lib/secret-crypto'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const via: 'email' | 'sms' | 'both' = body.via || 'both'

    const { data: invoice, error: iErr } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (iErr || !invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (['void', 'refunded'].includes(invoice.status)) {
      return NextResponse.json({ error: `Cannot send ${invoice.status} invoice` }, { status: 400 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, slug, domain, telnyx_api_key, telnyx_phone, resend_api_key, email_from')
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant config missing' }, { status: 500 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const baseUrl = tenant.domain ? `https://${tenant.domain}` : appUrl
    const invoiceUrl = `${baseUrl}/invoice/${invoice.public_token}`

    const toEmail = body.to_email || invoice.contact_email
    const toPhone = body.to_phone || invoice.contact_phone
    const results: { email?: { ok: boolean; detail?: string }; sms?: { ok: boolean; detail?: string } } = {}

    const amountOwed = invoice.total_cents - (invoice.amount_paid_cents || 0)

    if ((via === 'email' || via === 'both') && toEmail) {
      try {
        const apiKey = tenant.resend_api_key ? decryptSecret(tenant.resend_api_key) : null
        if (!apiKey) throw new Error('No Resend API key for tenant')
        const fromEmail = tenant.email_from || `invoices@${tenant.domain || 'fullloopcrm.com'}`
        const html = renderInvoiceEmail({
          businessName: tenant.name,
          invoiceNumber: invoice.invoice_number,
          title: invoice.title || 'Your Invoice',
          total: formatInvoiceCents(invoice.total_cents),
          amountDue: formatInvoiceCents(amountOwed),
          isPartial: (invoice.amount_paid_cents || 0) > 0,
          invoiceUrl,
          dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US') : null,
          contactName: invoice.contact_name || null,
        })
        await sendEmail({
          to: toEmail,
          subject: `Invoice ${invoice.invoice_number} from ${tenant.name} — ${formatInvoiceCents(amountOwed)}`,
          html,
          from: fromEmail,
          resendApiKey: apiKey,
        })
        results.email = { ok: true }
      } catch (e) {
        results.email = { ok: false, detail: e instanceof Error ? e.message : 'send failed' }
      }
    }

    if ((via === 'sms' || via === 'both') && toPhone) {
      try {
        const apiKey = tenant.telnyx_api_key ? decryptSecret(tenant.telnyx_api_key) : null
        const phoneFrom = tenant.telnyx_phone || ''
        if (!apiKey || !phoneFrom) throw new Error('No Telnyx credentials for tenant')
        const firstName = (invoice.contact_name || '').split(' ')[0] || 'there'
        const smsBody = `Hi ${firstName}, your invoice from ${tenant.name} for ${formatInvoiceCents(amountOwed)}: ${invoiceUrl}`
        await sendSMS({ to: toPhone, body: smsBody, telnyxApiKey: apiKey, telnyxPhone: phoneFrom })
        results.sms = { ok: true }
      } catch (e) {
        results.sms = { ok: false, detail: e instanceof Error ? e.message : 'send failed' }
      }
    }

    const anyOk = results.email?.ok || results.sms?.ok
    if (!anyOk) return NextResponse.json({ error: 'Neither channel sent', results }, { status: 400 })

    const sentVia =
      results.email?.ok && results.sms?.ok ? 'both' : results.email?.ok ? 'email' : 'sms'

    const newStatus = invoice.status === 'draft' ? 'sent' : invoice.status
    await supabaseAdmin
      .from('invoices')
      .update({ status: newStatus, sent_at: new Date().toISOString(), sent_via: sentVia })
      .eq('id', id)

    await logInvoiceEvent({
      invoice_id: id,
      tenant_id: tenantId,
      event_type: 'sent',
      detail: { via: sentVia, results, to_email: toEmail, to_phone: toPhone },
    })

    return NextResponse.json({ ok: true, via: sentVia, results, invoice_url: invoiceUrl })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/invoices/[id]/send', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function renderInvoiceEmail(opts: {
  businessName: string
  invoiceNumber: string
  title: string
  total: string
  amountDue: string
  isPartial: boolean
  invoiceUrl: string
  dueDate: string | null
  contactName: string | null
}): string {
  const greeting = opts.contactName ? `Hi ${opts.contactName},` : 'Hi there,'
  const dueLine = opts.dueDate ? `<p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Due ${escapeHtml(opts.dueDate)}</p>` : ''
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;padding:40px 20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="padding:32px 32px 16px;">
      <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Invoice ${escapeHtml(opts.invoiceNumber)}</p>
      <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">${escapeHtml(opts.title)}</h1>
      <p style="color:#475569;line-height:1.6;margin:0 0 8px;">${greeting}</p>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">Your invoice from <strong>${escapeHtml(opts.businessName)}</strong> is ready. View details and pay online below.</p>
      <div style="background:#f1f5f9;border-radius:10px;padding:20px;text-align:center;margin:0 0 24px;">
        <p style="color:#64748b;font-size:13px;margin:0 0 4px;">${opts.isPartial ? 'Balance Due' : 'Total Due'}</p>
        <p style="font-size:32px;font-weight:700;color:#0f172a;margin:0;">${escapeHtml(opts.amountDue)}</p>
        ${opts.isPartial ? `<p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">Invoice total: ${escapeHtml(opts.total)}</p>` : ''}
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${encodeURI(opts.invoiceUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">View &amp; Pay</a>
      </div>
      ${dueLine}
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
