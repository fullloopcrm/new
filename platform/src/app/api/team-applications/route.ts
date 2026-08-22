import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'
import { escapeHtml, safeUrl } from '@/lib/escape-html'
import { provisionApprovedApplicant, type ApprovedApplication } from '@/lib/team-provisioning'
import { isSpamSubmission } from '@/lib/spam-guard'
import { trackError } from '@/lib/error-tracking'
import { emailAdmins } from '@/lib/admin-contacts'
import { sendEmail } from '@/lib/email'
import { emailShell } from '@/lib/messaging/shell'
import { tenantSiteUrl } from '@/lib/tenant-site'

// Rate limiting: 3 applications per 10 minutes per IP
// NOTE: In-memory — resets on server restart (serverless cold start).
// Acceptable here since it's a spam defense layer, not a security boundary.
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()

  // Cleanup expired entries to prevent memory leaks
  if (rateLimits.size > 1000) {
    for (const [key, val] of rateLimits) {
      if (val.resetAt <= now) rateLimits.delete(key)
    }
  }

  const entry = rateLimits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > 3
}

// GET - List all applications (admin only)
export async function GET() {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  try {
    const { data, error } = await supabaseAdmin
      .from('team_applications')
      .select('*')
      .eq('tenant_id', tenant.tenantId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ applications: data || [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

// POST - Submit new application (public, requires tenant_slug in body)
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    if (isSpamSubmission(body)) {
      trackError(new Error('Submission blocked by spam guard'), {
        source: 'api/team-applications', severity: 'low', alwaysAlert: true,
        extra: `tenant_slug=${request.headers.get('x-tenant-slug') || (body as { tenant_slug?: string }).tenant_slug || 'unknown'}`,
      }).catch(() => {})
      return NextResponse.json({ success: true }, { status: 201 })
    }
    const {
      name, email, phone, address, unit, experience, availability, referral_source, references, notes, photo_url,
      preferred_language, service_zones, has_car, labor_only, max_travel_minutes, sms_consent,
      // Only sent by tenants with no statewide ban-the-box restriction for
      // private employers (PA, FL) — see 20260821223000_*.sql. NY/NJ/CT
      // tenants never send this; it stays null and disclosure happens
      // post-offer instead (team_members.criminal_history_response).
      criminal_history_response,
    } = body
    let { tenant_slug } = body as { tenant_slug?: string }

    // Fall back to the middleware-injected tenant slug header so the ported
    // FL maid apply form (which doesn't post tenant_slug in body) still works.
    if (!tenant_slug) {
      tenant_slug = request.headers.get('x-tenant-slug') || undefined
    }

    if (!tenant_slug || !name || !phone) {
      return NextResponse.json({ error: 'Tenant, name, and phone are required' }, { status: 400 })
    }

    // Look up tenant
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('id, name, phone, email, address, logo_url, primary_color, resend_api_key, email_from, slug, domain')
      .eq('slug', tenant_slug)
      .single()

    if (!tenantData) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const tenantId = tenantData.id
    const cleanPhone = phone.replace(/\D/g, '')

    // Check for duplicate by phone
    const { data: existing } = await supabaseAdmin
      .from('team_applications')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', cleanPhone)
      .eq('status', 'pending')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'You already have a pending application' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('team_applications')
      .insert({
        tenant_id: tenantId,
        name,
        email: email || null,
        phone: cleanPhone,
        address: address || null,
        unit: unit || null,
        experience: experience || null,
        availability: availability || null,
        referral_source: referral_source || null,
        references: references || null,
        notes: notes || null,
        photo_url: photo_url || null,
        preferred_language: preferred_language || null,
        service_zones: Array.isArray(service_zones) && service_zones.length ? service_zones : null,
        has_car: typeof has_car === 'boolean' ? has_car : null,
        labor_only: typeof labor_only === 'boolean' ? labor_only : null,
        max_travel_minutes: max_travel_minutes ? Number(max_travel_minutes) : null,
        sms_consent: typeof sms_consent === 'boolean' ? sms_consent : null,
        criminal_history_response: typeof criminal_history_response === 'string' ? criminal_history_response.slice(0, 2000) : null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify admin — 'cleaner_application' matches /api/apply, /api/lead, and
    // /api/contact so this hits the registered "New team application" comm
    // setting (comms-registry.ts) and the Telegram allowlist (notify.ts),
    // instead of the unrelated team-member-added-to-payroll event.
    await notify({
      tenantId,
      type: 'cleaner_application',
      title: 'New Team Application',
      message: `${escapeHtml(name)} applied to join the team`,
      channel: 'email',
      recipientType: 'admin',
      metadata: { applicantName: name, phone: cleanPhone },
    }).catch((err) => console.error('Team application notify failed:', err))

    // Email the tenant's admins too (mirrors /api/apply). notify() alone only
    // fires when an owner tenant_member has an email; emailAdmins also falls
    // back to tenant.email, so this reaches the inbox even for tenants with
    // no member rows. Non-blocking.
    try {
      const adminUrl = `${tenantSiteUrl(tenantData)}/admin/team/applications`
      const subject = `[${tenantData.name}] New job application: ${name}`
      const html = `<h2>New Job Application</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${email ? escapeHtml(email) : '—'}</p>
        <p><strong>Phone:</strong> ${escapeHtml(cleanPhone)}</p>
        <p><a href="${safeUrl(adminUrl)}">View in admin</a></p>`
      await emailAdmins(tenantData, subject, html)
    } catch (emailErr) {
      console.error('Team application admin email error:', emailErr)
    }

    // Applicant confirmation — same pattern as /api/apply.
    try {
      if (email) {
        const firstName = String(name).split(' ')[0]
        const html = emailShell({
          brand: {
            name: tenantData.name,
            phone: tenantData.phone || null,
            email: tenantData.email || null,
            address: tenantData.address || null,
            logoUrl: tenantData.logo_url || null,
            primaryColor: tenantData.primary_color || null,
          },
          heading: `Thanks for applying, ${firstName}`,
          bodyHtml: `<p>We received your application and our team will review it and follow up shortly. If you need to reach us, just reply to this email${tenantData.phone ? ` or call ${tenantData.phone}` : ''}.</p>`,
          preheader: 'We received your application',
        })
        await sendEmail({
          to: email,
          subject: `We received your application — ${tenantData.name}`,
          html,
          resendApiKey: tenantData.resend_api_key || undefined,
          from: tenantData.email_from || undefined,
        })
      }
    } catch (ackErr) {
      console.error('Team application confirmation email error:', ackErr)
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Team application error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

// PUT - Update application status (admin only)
export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { id, status } = await request.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('team_applications')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // On approval, provision the applicant as a team member (PIN + portal) and
    // deliver their PIN. Best-effort: a failure here must never undo the status
    // update, but delivery outcome IS returned so the admin UI can tell the
    // difference between "approved and reachable" and "approved but the
    // applicant got nothing" instead of assuming success either way.
    let delivered: { emailed: boolean; texted: boolean } | null = null
    if (status === 'approved' && data) {
      try {
        delivered = await provisionApprovedApplicant(tenant.tenantId, data as ApprovedApplication)
      } catch (provErr) {
        console.error('Approve provisioning/email failed:', provErr instanceof Error ? provErr.message : provErr)
        delivered = { emailed: false, texted: false }
      }
    }

    return NextResponse.json({ application: data, delivered })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

// DELETE - Delete application (admin only)
export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    // Page sends id as a query param (?id=); also accept a JSON body for safety.
    const url = new URL(request.url)
    let id = url.searchParams.get('id')
    if (!id) { id = (await request.json().catch(() => ({})))?.id || null }

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('team_applications')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
