import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { rateLimitDb } from '@/lib/rate-limit-db'

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'hi@fullloopcrm.com'

// Unauthenticated public POST — a caller controls every free-text field
// below. Cap each so a single submission can't balloon a leads/
// partner_requests row (or the admin notification built from it) to
// megabytes of attacker-chosen content. Same bug class already fixed on
// /api/contact, /api/lead, /api/waitlist, /api/ingest/lead,
// /api/ingest/application, /api/management-applications, /api/team-
// applications, /api/sales-applications this session.
const MAX_SHORT = 200
const MAX_LONG = 2000
function cap(v: unknown, max: number): unknown {
  return typeof v === 'string' ? v.trim().slice(0, max) : v
}

// Public endpoint — lead capture from onboarding page
export async function POST(request: Request) {
  // Unauthenticated + no rate limit == a scripted caller could loop this to
  // flood the leads/partner_requests tables and spam the admin inbox — same
  // bug class already fixed for /api/track (commit c492cffa).
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`leads:${ip}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const { email, phone } = body
  const name = cap(body.name, MAX_SHORT)
  const business_name = cap(body.business_name, MAX_SHORT)
  const industry = cap(body.industry, MAX_SHORT)
  const message = cap(body.message, MAX_LONG)

  if (!name || !email || !business_name) {
    return NextResponse.json({ error: 'Name, email, and business name required' }, { status: 400 })
  }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert({
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      business_name,
      industry: industry || null,
      message: message || null,
      status: 'new',
    })
    .select()
    .single()

  if (error) {
    // If leads table doesn't exist yet, still notify admin
    console.error('Lead insert error:', error.message)
  }

  // Fold onboarding leads into the single lead bucket (partner_requests) so
  // they surface in the Leads pipeline. Best-effort — never block the request.
  try {
    await supabaseAdmin.from('partner_requests').insert({
      business_name,
      contact_name: name,
      email: email.toLowerCase(),
      phone: phone || '',
      service_category: industry || 'Other',
      city: 'N/A',
      state: 'NA',
      years_in_business: 'N/A',
      team_size: 'N/A',
      monthly_revenue: 'N/A',
      referral_source: 'Onboarding',
      pitch: message || 'Submitted via onboarding lead form',
      status: 'new',
    })
  } catch (foldErr) {
    console.error('[leads] fold to partner_requests failed (non-fatal):', foldErr)
  }

  // Notify admin
  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[FL] New Lead: ${business_name}`,
      html: `
        <h2>New Lead Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone) || 'Not provided'}</p>
        <p><strong>Business:</strong> ${escapeHtml(business_name)}</p>
        <p><strong>Industry:</strong> ${escapeHtml(industry) || 'Not specified'}</p>
        ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ''}
        <br>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.homeservicesbusinesscrm.com'}/admin">View in Admin</a></p>
      `,
    })
  } catch {
    // Don't fail the request if email fails
  }

  return NextResponse.json({ ok: true, lead: lead || null })
}
