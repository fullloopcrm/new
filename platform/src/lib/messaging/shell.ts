/**
 * ONE format for all customer-facing communications.
 *
 * Every email renders inside `emailShell` and every SMS through `smsFormat`, so
 * the whole product — dashboard, proposal, and comms — shares the Full Loop
 * editorial look (docs/design/tokens.md): cream #F4F4F1, ink #1C1C1C, a
 * Fraunces/Georgia serif display, and the tenant's own brand (logo + primary
 * color) injected. Web surfaces load the real Fraunces webfont; email falls
 * back to Georgia (the token's declared fallback), so the serif look survives
 * in every inbox.
 */

export type CommsBrand = {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

// Design tokens — Full Loop light editorial look: warm tan/cream ground, black
// serif. Locked to light so mail clients don't dark-invert it (the meta tags in
// <head> + explicit warm backgrounds keep it tan-on-black everywhere).
const BG = '#E7E1D3'       // tan outer
const CANVAS = '#F5F1E8'   // warm ivory card — never pure white
const INK = '#1C1C1C'      // primary text + rules
const MUTED = '#807B70'
const LINE = '#D8D2C4'
const DISPLAY = "'Fraunces', Georgia, 'Times New Roman', serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace"

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export type EmailShellInput = {
  brand: CommsBrand
  /** Small mono uppercase eyebrow above the heading, e.g. "Your proposal is ready". */
  kicker?: string
  /** Serif display heading at the top of the message body. */
  heading: string
  /** Pre-escaped HTML for the message body (paragraphs, lists). */
  bodyHtml: string
  /** Optional primary action button. */
  cta?: { label: string; url: string }
  /** Hidden inbox-preview line. */
  preheader?: string
}

export function emailShell({ brand, kicker, heading, bodyHtml, cta, preheader }: EmailShellInput): string {
  const accent = brand.primaryColor || INK
  const logo = brand.logoUrl
    ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.name)}" width="40" height="40" style="border-radius:8px;display:block" />`
    : ''
  const contactBits = [brand.phone, brand.email, brand.address].filter(Boolean).map((b) => esc(String(b)))
  const ctaHtml = cta
    ? `<tr><td style="padding:8px 0 4px">
         <a href="${esc(cta.url)}" style="display:inline-block;background:${accent};color:#fff;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px">${esc(cta.label)}</a>
       </td></tr>`
    : ''

  const year = new Date().getFullYear()
  const stamp = `Proposal · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<style>:root{color-scheme:light only}</style>
</head>
<body style="margin:0;padding:0;background:${BG};color-scheme:light only">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:36px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CANVAS};border:1px solid ${LINE};border-radius:16px;overflow:hidden">
      <!-- tenant brand, on top -->
      <tr><td style="padding:24px 30px 18px;border-bottom:1px solid ${INK}">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
          ${logo ? `<td width="40" style="padding-right:13px">${logo}</td>` : ''}
          <td style="font-family:${DISPLAY};font-size:20px;font-weight:600;color:${INK};letter-spacing:-0.01em">${esc(brand.name)}</td>
          <td align="right" style="font-family:${MONO};font-size:9px;letter-spacing:0.16em;color:${MUTED};text-transform:uppercase">${esc(stamp)}</td>
        </tr></table>
      </td></tr>
      <!-- body -->
      <tr><td style="padding:30px 30px 24px">
        ${kicker ? `<div style="font-family:${MONO};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${accent};margin-bottom:14px">— ${esc(kicker)}</div>` : ''}
        <h1 style="margin:0 0 16px;font-family:${DISPLAY};font-size:34px;font-weight:600;color:${INK};letter-spacing:-0.02em;line-height:1.05">${esc(heading)}</h1>
        <div style="font-family:${SANS};font-size:15px;line-height:1.65;color:${INK}">${bodyHtml}</div>
        <table role="presentation" cellpadding="0" cellspacing="0">${ctaHtml}</table>
      </td></tr>
      <!-- footer: tenant contact -->
      <tr><td style="padding:18px 30px;border-top:1px solid ${LINE};background:${BG}">
        <div style="font-family:${SANS};font-size:12px;line-height:1.5;color:${MUTED}">
          <strong style="color:${INK}">${esc(brand.name)}</strong>${contactBits.length ? ' · ' + contactBits.join(' · ') : ''}
        </div>
      </td></tr>
    </table>
    <!-- Full Loop CRM wordmark + copyright -->
    <div style="margin-top:16px;font-family:${SANS};font-size:11px;color:${MUTED};line-height:1.55">
      © ${year} ${esc(brand.name)} · powered by
      <a href="https://homeservicesbusinesscrm.com/" style="text-decoration:none"><span style="font-family:${DISPLAY};font-weight:600;color:${INK};letter-spacing:-0.01em">Full&nbsp;Loop</span><span style="font-family:${MONO};font-size:8px;letter-spacing:0.18em;color:${MUTED}">&nbsp;CRM</span></a>
      <br><span>Autonomous Home Service Business CRM Systems</span>
    </div>
</td></tr></table>
</body></html>`
}

/**
 * One SMS format — brand-signed so every text reads the same. Keeps it short;
 * signs off with the business name unless the body already names it.
 */
export function smsFormat(brand: CommsBrand, body: string): string {
  const trimmed = body.trim()
  if (brand.name && !trimmed.includes(brand.name)) {
    return `${trimmed}\n— ${brand.name}`
  }
  return trimmed
}
