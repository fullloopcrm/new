import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'
import { provisionApprovedApplicant, type ApprovedApplication } from '@/lib/team-provisioning'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Unauthenticated public POST — a caller controls every free-text field below.
// Cap each so a single submission can't balloon a team_applications row (or
// the admin notification built from it) to megabytes of attacker-chosen
// content. Same bug class already fixed on /api/contact, /api/lead,
// /api/waitlist, /api/ingest/lead, /api/ingest/application, and this route's
// siblings (management-applications, sales-applications) this session.
const MAX_SHORT = 200
const MAX_LONG = 2000
function cap(v: unknown, max: number): unknown {
  return typeof v === 'string' ? v.trim().slice(0, max) : v
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
  const rl = await rateLimitDb(`team-applications:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { email, phone, photo_url } = body
    const name = cap(body.name, MAX_SHORT)
    const address = cap(body.address, MAX_SHORT)
    const experience = cap(body.experience, MAX_LONG)
    const availability = cap(body.availability, MAX_SHORT)
    const referral_source = cap(body.referral_source, MAX_SHORT)
    const references = cap(body.references, MAX_LONG)
    const notes = cap(body.notes, MAX_LONG)
    let { tenant_slug } = body as { tenant_slug?: string }

    // Fall back to the middleware-injected tenant slug header so the ported
    // FL maid apply form (which doesn't post tenant_slug in body) still works.
    if (!tenant_slug) {
      tenant_slug = request.headers.get('x-tenant-slug') || undefined
    }

    if (!tenant_slug || !name || !phone) {
      return NextResponse.json({ error: 'Tenant, name, and phone are required' }, { status: 400 })
    }

    // photo_url is expected to come from this route's own upload endpoint
    // (team-applications/upload), but nothing previously checked that — a
    // caller could POST any string, which is later rendered as <img src> in
    // the admin dashboard (dashboard/team/page.tsx). Require it to live
    // inside the team-photos bucket's public applications/ prefix, matching
    // the storage-prefix validation already applied to sales-applications
    // and management-applications this session.
    if (photo_url) {
      const { data: photoPrefix } = supabaseAdmin.storage
        .from('team-photos')
        .getPublicUrl('applications/')
      if (typeof photo_url !== 'string' || !photo_url.startsWith(photoPrefix.publicUrl)) {
        return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 })
      }
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

    // Atomic claim on approval: a double-click or retried PUT for an
    // already-approved application must not re-run provisioning, which
    // re-sends the applicant their "you're approved" PIN email every time
    // (same double-fire class as the campaign-send / rating-prompt-cron /
    // bookings-PUT-notify fixes this session). `.neq('status', 'approved')`
    // means only the request that actually flips the row INTO 'approved'
    // gets it back and provisions; a later call for the same id finds no
    // matching row and skips provisioning.
    let query = supabaseAdmin
      .from('team_applications')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)
    if (status === 'approved') query = query.neq('status', 'approved')
    const { data, error } = await query.select().maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data) {
      // Either the application doesn't exist, or (for an 'approved' request)
      // it was already approved by an earlier call. Return the current row
      // with no re-provisioning.
      const { data: current } = await supabaseAdmin
        .from('team_applications')
        .select()
        .eq('id', id)
        .eq('tenant_id', tenant.tenantId)
        .maybeSingle()
      if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ application: current })
    }

    // On approval, provision the applicant as a team member (PIN + portal) and
    // email them. Best-effort: a failure here must never undo the status update.
    if (status === 'approved') {
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
