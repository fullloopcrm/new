/**
 * Dev preview of the unified comms look — renders emailShell with the current
 * tenant's real brand so the operator can eyeball it in the browser. Also shows
 * the SMS format. Tenant-scoped; lives under /api/dashboard (impersonation-ok).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { hasPermission } from '@/lib/rbac'
import { overridesFor } from '@/lib/require-permission'
import { emailShell, smsFormat, type CommsBrand } from '@/lib/messaging/shell'
import { sendEmail } from '@/lib/email'
import { decryptSecret } from '@/lib/secret-crypto'

export async function GET(request: Request) {
  try {
    const authTenant = await getTenantForRequest()
    const { tenantId, role } = authTenant
    const sendTo = new URL(request.url).searchParams.get('send')
    if (sendTo && !hasPermission(role, 'campaigns.send', overridesFor(authTenant))) {
      return new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
    const { data: t } = await supabaseAdmin
      .from('tenants')
      .select('name, phone, email, address, logo_url, primary_color, resend_api_key, email_from, domain')
      .eq('id', tenantId)
      .single()

    const brand: CommsBrand = {
      name: t?.name || 'Your Business',
      phone: t?.phone || null,
      email: t?.email || null,
      address: t?.address || null,
      logoUrl: t?.logo_url || null,
      primaryColor: t?.primary_color || null,
    }

    const sampleSms = smsFormat(brand, 'Your proposal is ready — review, sign, and pay your deposit here: https://…')

    const html = emailShell({
      brand,
      preheader: 'Your proposal is ready to review.',
      kicker: 'Your proposal is ready',
      heading: "Let's make it official.",
      bodyHtml: `
        <p style="margin:0 0 14px">Hi Alex,</p>
        <p style="margin:0 0 14px">Thanks for the opportunity. Your proposal <strong>Q-202607-0001</strong> is ready — total <strong>$3,500.00</strong>, with a <strong>$875.00</strong> deposit to get started.</p>
        <p style="margin:0 0 14px">Review the details, sign, and pay the deposit online whenever you're ready. It's valid through Aug 1, 2026.</p>
      `,
      cta: { label: 'Review & Accept', url: 'https://example.com/quote/preview' },
    })

    // Three design directions to compare, all Full Loop light-editorial, all
    // tenant-branded on top + Full Loop CRM wordmark in the copyright.
    const variants: Array<{ tag: string; html: string }> = [
      { tag: 'A · Editorial Luxe', html },
      { tag: 'B · Magazine', html: magazineVariant(brand) },
      { tag: 'C · Statement', html: statementVariant(brand) },
    ]

    // ?send=<email> → deliver all three variants via the tenant's Resend.
    if (sendTo) {
      const apiKey = t?.resend_api_key ? decryptSecret(t.resend_api_key) : null
      if (!apiKey) return new Response(JSON.stringify({ error: 'Tenant has no Resend key configured' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      const from = t?.email_from || `hello@${t?.domain || 'fullloopcrm.com'}`
      const sent: string[] = []
      for (const v of variants.slice(0, 1)) {
        await sendEmail({ to: sendTo, subject: `${brand.name} — your proposal is ready`, html: v.html, from, resendApiKey: apiKey })
        sent.push(v.tag)
      }
      return new Response(JSON.stringify({ ok: true, sent_to: sendTo, from, variants: sent }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Wrap so the operator sees the SMS format alongside the rendered email.
    const page = `<!doctype html><html><head><meta charset="utf-8"><title>Comms preview</title></head>
<body style="margin:0;background:#e9e9e5;font-family:-apple-system,Segoe UI,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:20px 12px">
    <div style="font-size:12px;color:#555;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">SMS format</div>
    <pre style="white-space:pre-wrap;background:#fff;border:1px solid #ccc;border-radius:10px;padding:14px;font-size:14px;color:#111;margin:0 0 24px">${smsEsc(sampleSms)}</pre>
    <div style="font-size:12px;color:#555;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Email</div>
  </div>
  <iframe srcdoc="${html.replace(/"/g, '&quot;')}" style="width:100%;max-width:600px;height:640px;border:0;display:block;margin:0 auto"></iframe>
</body></html>`

    return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch (err) {
    if (err instanceof AuthError) return new Response(err.message, { status: err.status })
    console.error('GET /api/dashboard/comms-preview', err)
    return new Response('Preview unavailable', { status: 500 })
  }
}

function smsEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Shared palette + fonts for the design variants (Full Loop light editorial).
const V = {
  bg: '#E7E1D3', canvas: '#F5F1E8', ink: '#1C1C1C', muted: '#807B70', line: '#D8D2C4',
  display: "'Fraunces', Georgia, 'Times New Roman', serif",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
}
function head(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light only}</style></head>`
}
function wordmark(brandName: string): string {
  return `<div style="margin-top:16px;font-family:${V.sans};font-size:11px;color:${V.muted};line-height:1.55">© ${new Date().getFullYear()} ${smsEsc(brandName)} · powered by <a href="https://homeservicesbusinesscrm.com/" style="text-decoration:none"><span style="font-family:${V.display};font-weight:600;color:${V.ink};letter-spacing:-0.01em">Full&nbsp;Loop</span><span style="font-family:${V.mono};font-size:8px;letter-spacing:0.18em;color:${V.muted}">&nbsp;CRM</span></a><br><span>Autonomous Home Service Business CRM Systems</span></div>`
}
function brandRow(brand: CommsBrand): string {
  const logo = brand.logoUrl ? `<td width="40" style="padding-right:13px"><img src="${smsEsc(brand.logoUrl)}" width="40" height="40" alt="${smsEsc(brand.name)}" style="border-radius:8px;display:block"></td>` : ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>${logo}<td style="font-family:${V.display};font-size:20px;font-weight:600;color:${V.ink};letter-spacing:-0.01em">${smsEsc(brand.name)}</td><td align="right" style="font-family:${V.mono};font-size:9px;letter-spacing:0.16em;color:${V.muted};text-transform:uppercase">Proposal · Q-202607-0001</td></tr></table>`
}
function accent(brand: CommsBrand): string { return brand.primaryColor || V.ink }

// B · MAGAZINE — the total as a giant display number.
function magazineVariant(brand: CommsBrand): string {
  return `${head()}<body style="margin:0;background:${V.bg};color-scheme:light only">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${V.bg};padding:36px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${V.canvas};border:1px solid ${V.line};border-radius:16px;overflow:hidden">
  <tr><td style="padding:24px 30px 18px;border-bottom:1px solid ${V.ink}">${brandRow(brand)}</td></tr>
  <tr><td style="padding:34px 30px 8px">
    <div style="font-family:${V.mono};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${V.muted};margin-bottom:10px">Your proposal is ready</div>
    <div style="font-family:${V.mono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${V.muted}">Total</div>
    <div style="font-family:${V.display};font-size:66px;line-height:1;font-weight:600;color:${V.ink};letter-spacing:-0.03em;margin:2px 0 6px">$3,500<span style="font-size:26px;color:${V.muted}">.00</span></div>
    <div style="font-family:${V.sans};font-size:14px;color:${V.ink}">Deposit to start: <strong>$875.00</strong> · valid through Aug 1, 2026</div>
  </td></tr>
  <tr><td style="padding:16px 30px 30px">
    <div style="font-family:${V.sans};font-size:15px;line-height:1.65;color:${V.ink};margin-bottom:18px">Hi Alex — thanks for the opportunity. Review the details, sign, and pay your deposit online whenever you're ready.</div>
    <a href="https://example.com/quote/preview" style="display:inline-block;background:${accent(brand)};color:#fff;font-family:${V.sans};font-size:14px;font-weight:600;text-decoration:none;padding:13px 26px;border-radius:12px">Review &amp; Accept</a>
  </td></tr>
  <tr><td style="padding:18px 30px;border-top:1px solid ${V.line};background:${V.bg};font-family:${V.sans};font-size:12px;color:${V.muted}"><strong style="color:${V.ink}">${smsEsc(brand.name)}</strong>${[brand.phone, brand.email].filter(Boolean).map((b) => ' · ' + smsEsc(String(b))).join('')}</td></tr>
</table>${wordmark(brand.name)}
</td></tr></table></body></html>`
}

// C · STATEMENT — massive minimal headline, full-bleed tan, one hairline accent.
function statementVariant(brand: CommsBrand): string {
  return `${head()}<body style="margin:0;background:${V.bg};color-scheme:light only">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${V.bg};padding:48px 20px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="padding-bottom:28px">${brandRow(brand)}</td></tr>
  <tr><td style="border-top:2px solid ${V.ink};padding-top:26px">
    <div style="font-family:${V.mono};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${accent(brand)};margin-bottom:18px">— Your proposal is ready</div>
    <div style="font-family:${V.display};font-size:52px;line-height:1.02;font-weight:600;color:${V.ink};letter-spacing:-0.03em;margin-bottom:24px">Let's make it<br>official.</div>
    <div style="font-family:${V.sans};font-size:16px;line-height:1.6;color:${V.ink};max-width:420px;margin-bottom:8px">Proposal <strong>Q-202607-0001</strong> — total <strong>$3,500.00</strong>, with an <strong>$875.00</strong> deposit to get started. Valid through Aug 1, 2026.</div>
  </td></tr>
  <tr><td style="padding:28px 0 40px"><a href="https://example.com/quote/preview" style="display:inline-block;background:${V.ink};color:${V.canvas};font-family:${V.sans};font-size:15px;font-weight:600;text-decoration:none;padding:15px 34px;border-radius:0">Review &amp; Accept →</a></td></tr>
  <tr><td style="border-top:1px solid ${V.line};padding-top:16px;font-family:${V.sans};font-size:12px;color:${V.muted}"><strong style="color:${V.ink}">${smsEsc(brand.name)}</strong>${[brand.phone, brand.email, brand.address].filter(Boolean).map((b) => ' · ' + smsEsc(String(b))).join('')}</td></tr>
</table>${wordmark(brand.name)}
</td></tr></table></body></html>`
}
