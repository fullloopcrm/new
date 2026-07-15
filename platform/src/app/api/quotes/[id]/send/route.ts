/**
 * Send quote to recipient via SMS / email / both. Transitions draft → sent.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { sendSMS } from '@/lib/sms'
import { sendEmail } from '@/lib/email'
import { logQuoteEvent, formatCents } from '@/lib/quote'
import { decryptSecret } from '@/lib/secret-crypto'
import { emailShell, smsFormat, type CommsBrand } from '@/lib/messaging/shell'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { tenant: authTenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = authTenant
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
      .select('name, slug, domain, phone, email, address, logo_url, primary_color, telnyx_api_key, telnyx_phone, resend_api_key, email_from, selena_config')
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant config missing' }, { status: 500 })

    const brand: CommsBrand = {
      name: tenant.name,
      phone: tenant.phone, email: tenant.email, address: tenant.address,
      logoUrl: tenant.logo_url, primaryColor: tenant.primary_color,
    }

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
        const greeting = quote.contact_name ? `Hi ${quote.contact_name},` : 'Hi there,'
        const validLine = quote.valid_until
          ? `<p style="margin:0 0 14px">Valid through ${new Date(quote.valid_until).toLocaleDateString('en-US')}.</p>` : ''
        const depositLine = quote.deposit_cents > 0
          ? ` A deposit of <strong>${formatCents(quote.deposit_cents)}</strong> gets it started.` : ''
        const html = emailShell({
          brand,
          preheader: `Your proposal from ${tenant.name} is ready to review.`,
          kicker: 'Your proposal is ready',
          heading: "Let's make it official.",
          bodyHtml: `
            <p style="margin:0 0 14px">${greeting}</p>
            <p style="margin:0 0 14px">Your proposal <strong>${quote.quote_number}</strong>${quote.title ? ` — ${quote.title}` : ''} is ready. Total <strong>${formatCents(quote.total_cents)}</strong>.${depositLine}</p>
            <p style="margin:0 0 14px">Review the details, sign, and (if a deposit is set) pay online whenever you're ready.</p>
            ${validLine}
          `,
          cta: { label: 'Review & Accept', url: quoteUrl },
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
        const smsBody = smsFormat(brand, `Hi ${firstName}, your proposal for ${formatCents(quote.total_cents)} is ready — review, sign & pay here: ${quoteUrl}`)
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

    // Announce to the deal's pipeline timeline on the FIRST send only (drafts
    // are created silently now, so this is where a proposal enters the pipeline).
    // quote.status is the pre-update value → 'draft' means this is the first send.
    if (quote.status === 'draft' && quote.deal_id) {
      await supabaseAdmin.from('deal_activities').insert({
        tenant_id: tenantId,
        deal_id: quote.deal_id,
        type: 'note',
        description: `Proposal ${quote.quote_number} sent — ${formatCents(quote.total_cents)}`,
        metadata: { quote_id: quote.id, quote_number: quote.quote_number, total_cents: quote.total_cents, via: sentVia },
      })
      await supabaseAdmin
        .from('deals')
        .update({ value_cents: quote.total_cents, last_activity_at: new Date().toISOString() })
        .eq('id', quote.deal_id)
        .eq('tenant_id', tenantId)
    }

    const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
    await ownerAlert({
      tenantId,
      subject: `Proposal sent — ${quote.quote_number}`,
      kicker: 'Proposal sent',
      heading: `${quote.quote_number} is out the door`,
      bodyHtml: `<p style="margin:0 0 12px">Sent to ${quote.contact_name || 'the customer'} via ${sentVia}.</p><p style="margin:0"><strong>${formatCents(quote.total_cents)}</strong>${quote.deposit_cents > 0 ? ` · deposit ${formatCents(quote.deposit_cents)}` : ''}</p>`,
      sms: `Proposal ${quote.quote_number} (${formatCents(quote.total_cents)}) sent to ${quote.contact_name || 'customer'}.`,
    })

    return NextResponse.json({ ok: true, via: sentVia, results, quote_url: quoteUrl })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quotes/[id]/send', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}

