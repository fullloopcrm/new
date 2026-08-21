import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { buildLeadNotificationHtml } from './notification-email'
import { rateLimitDb } from '@/lib/rate-limit-db'

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'hi@fullloopcrm.com'

// Public endpoint — lead capture from onboarding page
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`leads_onboarding:${ip}`, 10, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const body = await request.json()
  const { name, email, phone, business_name, industry, message } = body

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
      html: buildLeadNotificationHtml(
        { name, email, phone, business_name, industry, message },
        process.env.NEXT_PUBLIC_APP_URL || 'https://app.homeservicecrm.ai',
      ),
    })
  } catch {
    // Don't fail the request if email fails
  }

  return NextResponse.json({ ok: true, lead: lead || null })
}
