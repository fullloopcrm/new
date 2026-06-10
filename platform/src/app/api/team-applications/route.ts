import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'
import { sendEmail } from '@/lib/email'
import { teamApplicationApprovedEmail } from '@/lib/email-templates'
import { getSettings } from '@/lib/settings'
import { tenantSiteUrl } from '@/lib/tenant-site'

type ApprovedApplication = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

// Shared across ALL tenants: when an application is approved, provision the
// applicant as a team member (with a portal PIN) and email them their PIN +
// portal link. Reuses the same PIN scheme as POST /api/team. Best-effort —
// callers must not let a failure here undo the status update.
async function provisionApprovedApplicant(tenantId: string, app: ApprovedApplication): Promise<void> {
  const { data: t } = await supabaseAdmin
    .from('tenants')
    .select('name, primary_color, logo_url, resend_api_key, telnyx_phone, domain, slug')
    .eq('id', tenantId)
    .single()
  if (!t) return

  const cleanPhone = (app.phone || '').replace(/\D/g, '')

  // Dedup: reuse an existing team member for this tenant+phone instead of
  // creating a second record. Only mint a new PIN when creating fresh.
  let pin: string | null = null
  let memberExisted = false

  if (cleanPhone) {
    const { data: existing } = await supabaseAdmin
      .from('team_members')
      .select('id, pin')
      .eq('tenant_id', tenantId)
      .eq('phone', cleanPhone)
      .limit(1)
      .maybeSingle()
    if (existing) {
      memberExisted = true
      pin = existing.pin
    }
  }

  if (!memberExisted) {
    const crypto = await import('node:crypto')
    const settings = await getSettings(tenantId)
    const base: Record<string, unknown> = {
      tenant_id: tenantId,
      name: app.name || 'Team Member',
      email: app.email || null,
      phone: cleanPhone || null,
    }
    if (settings.default_pay_rate > 0) {
      base.pay_rate = settings.default_pay_rate
      base.hourly_rate = settings.default_pay_rate
    }
    if (settings.default_working_days?.length) {
      base.working_days = settings.default_working_days
    }

    // The DB enforces PIN uniqueness per tenant; retry on collision.
    let inserted = false
    for (let attempt = 0; attempt < 4 && !inserted; attempt++) {
      pin = String(1000 + crypto.randomInt(0, 9000))
      const { error: insErr } = await supabaseAdmin.from('team_members').insert({ ...base, pin })
      if (!insErr) { inserted = true; break }
      if (!/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message)
    }
    if (!inserted) throw new Error('Could not allocate a unique PIN after retries')
  }

  // Email the applicant their PIN + portal link (only if we have both).
  if (app.email && pin) {
    const portalUrl = `${tenantSiteUrl({ domain: t.domain, slug: t.slug })}/team/login`
    const html = teamApplicationApprovedEmail({
      tenantName: t.name || 'the team',
      primaryColor: t.primary_color || undefined,
      logoUrl: t.logo_url || undefined,
      applicantName: app.name || '',
      pin,
      portalUrl,
      supportPhone: t.telnyx_phone || undefined,
    })
    await sendEmail({
      to: app.email,
      subject: `Welcome to ${t.name || 'the team'}! Your PIN: ${pin}`,
      html,
      resendApiKey: t.resend_api_key || undefined,
    })
  }
}

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
    const { name, email, phone, address, experience, availability, referral_source, references, notes, photo_url } = body
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
      .select('id, name')
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
        experience: experience || null,
        availability: availability || null,
        referral_source: referral_source || null,
        references: references || null,
        notes: notes || null,
        photo_url: photo_url || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify admin
    await notify({
      tenantId,
      type: 'team_member_added',
      title: 'New Team Application',
      message: `${name} applied to join the team`,
      channel: 'email',
      recipientType: 'admin',
      metadata: { applicantName: name, phone: cleanPhone },
    })

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
    // email them. Best-effort: a failure here must never undo the status update.
    if (status === 'approved' && data) {
      try {
        await provisionApprovedApplicant(tenant.tenantId, data as ApprovedApplication)
      } catch (provErr) {
        console.error('Approve provisioning/email failed:', provErr instanceof Error ? provErr.message : provErr)
      }
    }

    return NextResponse.json({ application: data })
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
