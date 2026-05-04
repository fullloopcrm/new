import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

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
  role?: unknown
  budget?: unknown
  message?: unknown
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
  let body: InquiryBody
  try {
    body = (await req.json()) as InquiryBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const company = typeof body.company === 'string' ? body.company.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const role = typeof body.role === 'string' ? (body.role.trim() as Role) : ('' as Role)
  const budget = typeof body.budget === 'string' ? (body.budget.trim() as Budget) : ('' as Budget)
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : ''

  // Validation
  if (!name || !company || !email || !role || !budget || !message) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 })
  }
  if (!BUDGETS.includes(budget)) {
    return NextResponse.json({ error: 'invalid_budget' }, { status: 400 })
  }

  const isFatOffer = role === 'Acquirer' && (budget === '$1M–$10M' || budget === '$10M+')
  const subject = isFatOffer
    ? `🚨 ACQUISITION INQUIRY — ${company} (${budget})`
    : `Inquiry — ${role} — ${company}`

  const html = `
    <h2>${escapeHtml(subject)}</h2>
    <table style="font-family: monospace; border-collapse: collapse;">
      <tr><td style="padding: 4px 12px 4px 0; color: #666;">Name</td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #666;">Company</td><td>${escapeHtml(company)}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #666;">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #666;">Role</td><td>${escapeHtml(role)}</td></tr>
      <tr><td style="padding: 4px 12px 4px 0; color: #666;">Budget / deal size</td><td>${escapeHtml(budget)}</td></tr>
    </table>
    <h3 style="margin-top: 24px;">Message</h3>
    <pre style="white-space: pre-wrap; font-family: -apple-system, sans-serif; line-height: 1.5;">${escapeHtml(message)}</pre>
  `

  const adminEmail = process.env.ADMIN_EMAIL || ''
  const sends: Promise<unknown>[] = []
  if (adminEmail) {
    sends.push(sendEmail({ to: adminEmail, subject, html }).catch(err => console.error('inquiry email failed:', err)))
  }

  if (isFatOffer) {
    const smsText = `🚨 Acquirer inquiry — ${company} (${budget}) from ${name} <${email}>. Check email for the full message.`
    sends.push(sendOwnerSms(smsText).catch(err => console.error('inquiry SMS failed:', err)))
  }

  await Promise.allSettled(sends)
  return NextResponse.json({ ok: true })
}
