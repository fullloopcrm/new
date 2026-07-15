import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

// POST /api/inquiry — single contact form for the marketing teaser site.
// Strategy pivot 2026-05-03: no longer selling territory licenses; this form
// captures any inbound interest (acquisition, partnership, press) and routes
// to the owner. Acquirer + $1M+ trips an immediate SMS alert.
//
// No DB row written for now — keeps this lightweight. Add a table later when
// volume justifies persistence.

const ROLES = ['Operator', 'Investor', 'Acquirer', 'Press', 'Other'] as const
const BUDGETS = ['<$100K', '$100K–$1M', '$1M–$10M', '$10M+', 'N/A'] as const

type Role = typeof ROLES[number]
type Budget = typeof BUDGETS[number]

interface InquiryBody {
  name?: unknown
  company?: unknown
  email?: unknown
  phone?: unknown
  role?: unknown
  budget?: unknown
  message?: unknown
  heardFrom?: unknown
  heardMore?: unknown
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendOwnerSms(text: string): Promise<void> {
  const apiKey = (process.env.TELNYX_API_KEY || '').trim()
  const from = (process.env.TELNYX_FROM_NUMBER || '').trim()
  const adminPhonesRaw = (process.env.OWNER_PHONES || process.env.ADMIN_PHONE || '').trim()
  if (!apiKey || !from || !adminPhonesRaw) return

  const phones = adminPhonesRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  await Promise.allSettled(
    phones.map(to =>
      fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, text }),
      }),
    ),
  )
}

export async function POST(req: NextRequest) {
  // Unauthenticated, no per-tenant scope (single global inquiry endpoint) --
  // without a limit here a caller could spam arbitrary "email" addresses via
  // the confirmation send and repeatedly trigger the real owner SMS alert.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`inquiry:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  let body: InquiryBody
  try {
    body = (await req.json()) as InquiryBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const company = typeof body.company === 'string' ? body.company.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : ''
  const role = typeof body.role === 'string' ? (body.role.trim() as Role) : ('' as Role)
  const budget = typeof body.budget === 'string' ? (body.budget.trim() as Budget) : ('' as Budget)
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : ''

  // Validation — the public contact form only collects name/phone/email/message.
  // company/role/budget are optional (kept for the legacy acquisition flow).
  if (!name || !email || !phone || !message) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  // Only validate role/budget when supplied; ignore invalid values rather than reject.
  const validRole = ROLES.includes(role) ? role : ('' as Role)
  const validBudget = BUDGETS.includes(budget) ? budget : ('' as Budget)

  const isFatOffer = validRole === 'Acquirer' && (validBudget === '$1M–$10M' || validBudget === '$10M+')
  const subject = isFatOffer
    ? `🚨 ACQUISITION INQUIRY — ${company || name} (${validBudget})`
    : validRole
      ? `Inquiry — ${validRole} — ${company || name}`
      : `Contact form — ${name}`

  const html = `
    <h2>${escapeHtml(subject)}</h2>
    <table style="font-family: monospace; border-collapse: collapse;">
      <tr><td style="padding: 4px 12px 4px 0; color: #666;">Name</td><td>${escapeHtml(name)}</td></tr>
      ${company ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">Company</td><td>${escapeHtml(company)}</td></tr>` : ''}
      <tr><td style="padding: 4px 12px 4px 0; color: #666;">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #666;">Phone</td><td><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></td></tr>
      ${validRole ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">Role</td><td>${escapeHtml(validRole)}</td></tr>` : ''}
      ${validBudget ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">Budget / deal size</td><td>${escapeHtml(validBudget)}</td></tr>` : ''}
    </table>
    <h3 style="margin-top: 24px;">Message</h3>
    <pre style="white-space: pre-wrap; font-family: -apple-system, sans-serif; line-height: 1.5;">${escapeHtml(message)}</pre>
  `

  // Persist the lead first so it is never lost even if email/SMS delivery
  // fails. Best-effort: a storage error must not break the user-facing form.
  try {
    const { error: insertErr } = await supabaseAdmin.from('inquiries').insert({
      name,
      company,
      email,
      phone,
      role: validRole,
      budget: validBudget,
      message,
      is_fat_offer: isFatOffer,
      source: 'marketing-contact',
    })
    if (insertErr) console.error('inquiry persist failed:', insertErr.message)
  } catch (err) {
    console.error('inquiry persist threw:', err)
  }

  // Also surface every inquiry in the single admin screen (/admin/requests),
  // which reads partner_requests. Map the contact-form shape onto the
  // partner_requests columns; role -> service_category, budget -> revenue.
  // Best-effort: a failure here must not break the user-facing form.
  try {
    const { error: prErr } = await supabaseAdmin.from('partner_requests').insert({
      business_name: company || name,
      contact_name: name,
      email,
      phone,
      service_category: validRole || 'Inquiry',
      city: 'N/A',
      state: 'NA',
      years_in_business: 'N/A',
      team_size: 'N/A',
      monthly_revenue: validBudget || 'N/A',
      referral_source: 'Contact form',
      heard_from: typeof body.heardFrom === 'string' && body.heardFrom.trim() ? body.heardFrom.trim() : null,
      pitch: message,
      status: 'new',
    })
    if (prErr) console.error('inquiry -> partner_requests persist failed:', prErr.message)
  } catch (err) {
    console.error('inquiry -> partner_requests persist threw:', err)
  }

  const adminEmail = process.env.ADMIN_EMAIL || ''
  const sends: Promise<unknown>[] = []
  if (adminEmail) {
    sends.push(sendEmail({ to: adminEmail, subject, html }).catch(err => console.error('inquiry email failed:', err)))
  }

  // Confirmation / thank-you to the person who submitted — so a real lead like
  // Mohammad isn't left with silence. Best-effort; never blocks the response.
  const firstName = (name || '').trim().split(/\s+/)[0] || 'there'
  const confirmHtml = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0d9488;margin-bottom:16px;">Full Loop CRM</div>
      <h1 style="font-size:20px;margin:0 0 10px;">Thanks, ${escapeHtml(firstName)} — we got your application</h1>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 14px;">We received your inquiry${company ? ` for <strong>${escapeHtml(company)}</strong>` : ''} and a real person is reviewing it. Full Loop CRM isn't a cheap CRM — it's automation that runs your business — and we take on one operator per trade per market, by hand.</p>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">We'll reach out within <strong>2 business days</strong>. If you have anything to add in the meantime, just reply to this email — it comes to a real inbox.</p>
      <div style="border-top:1px solid #e2e8f0;padding-top:16px;color:#94a3b8;font-size:12px;line-height:1.6;">
        <strong style="color:#64748b;">Full Loop CRM</strong> — automation that runs home-service businesses.<br/>
        <a href="mailto:hello@fullloopcrm.com" style="color:#0d9488;text-decoration:none;">hello@fullloopcrm.com</a> &nbsp;·&nbsp; (212) 202-9220 &nbsp;·&nbsp; <a href="https://fullloopcrm.com" style="color:#0d9488;text-decoration:none;">fullloopcrm.com</a>
      </div>
    </div>`
  sends.push(
    sendEmail({ to: email, subject: 'We got your application — Full Loop CRM', html: confirmHtml })
      .catch(err => console.error('inquiry confirmation email failed:', err))
  )

  if (isFatOffer) {
    const smsText = `🚨 Acquirer inquiry — ${company || name} (${validBudget}) from ${name} <${email}>. Check email for the full message.`
    sends.push(sendOwnerSms(smsText).catch(err => console.error('inquiry SMS failed:', err)))
  }

  await Promise.allSettled(sends)
  return NextResponse.json({ ok: true })
}
