/**
 * Management application flow — applying for ops/management roles at a tenant.
 * Public POST from the tenant's careers page (tenant resolved via host header).
 * Admin GET/PUT require admin session.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { notify } from '@/lib/notify'

// Unauthenticated public POST — a caller controls every free-text field below.
// Cap each so a single submission can't balloon a management_applications row
// (or the admin notification built from it) to megabytes of attacker-chosen
// content. Same bug class already fixed on /api/contact, /api/lead,
// /api/waitlist, /api/ingest/lead, /api/ingest/application this session —
// missed on this route's siblings (team-applications, sales-applications;
// fixed alongside this one) since they post through a different form.
const MAX_SHORT = 200
const MAX_LONG = 2000
function cap(v: unknown, max: number): unknown {
  return typeof v === 'string' ? v.trim().slice(0, max) : v
}

// GET/PUT gated on team.view/team.edit — matches the identical sibling
// /api/team-applications route, which holds the same class of applicant PII
// (resume/photo/selfie video/phone/email) and is gated the same way.
export async function GET() {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  try {
    const { data, error } = await supabaseAdmin
      .from('management_applications')
      .select('*')
      .eq('tenant_id', tenant.tenantId)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/management-applications error:', err)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`mgmt_app:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const {
      email, phone, resume_url, photo_url, video_url, references,
    } = body
    const name = cap(body.name, MAX_SHORT)
    const location = cap(body.location, MAX_SHORT)
    const current_role = cap(body.current_role, MAX_SHORT)
    const years_experience = cap(body.years_experience, MAX_SHORT)
    const bilingual = cap(body.bilingual, MAX_SHORT)
    const management_experience = cap(body.management_experience, MAX_LONG)
    const why_this_role = cap(body.why_this_role, MAX_LONG)
    const availability_start = cap(body.availability_start, MAX_SHORT)
    const referral_source = cap(body.referral_source, MAX_SHORT)
    const notes = cap(body.notes, MAX_LONG)
    const position = cap(body.position, MAX_SHORT)

    if (!name || !email || !phone || !location || !resume_url || !photo_url || !video_url) {
      return NextResponse.json({ error: 'Name, email, phone, location, resume, photo, and selfie video are required.' }, { status: 400 })
    }

    // resume_url/photo_url/video_url are free-text from an unauthenticated
    // public form and are stored verbatim — same bug class fixed in
    // /api/sales-applications: require them to live inside this tenant's own
    // management-applications upload prefix (the one this route's own
    // signed-url twin scopes uploads to) so a forged request can't stash an
    // arbitrary URL (e.g. javascript:) for whenever this data gets a
    // link-rendering admin view.
    const { data: uploadPrefix } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(`${tenant.id}/management-applications/`)
    for (const [field, value] of [['resume_url', resume_url], ['photo_url', photo_url], ['video_url', video_url]] as const) {
      if (typeof value !== 'string' || !value.startsWith(uploadPrefix.publicUrl)) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 })
      }
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const { data: existing } = await supabaseAdmin
      .from('management_applications')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'You already have a pending application for this position.' }, { status: 400 })
    }

    const cleanPhone = String(phone).replace(/\D/g, '')

    const { data, error } = await supabaseAdmin
      .from('management_applications')
      .insert({
        tenant_id: tenant.id,
        name,
        email: normalizedEmail,
        phone: cleanPhone,
        location,
        current_role: current_role || null,
        years_experience: years_experience || null,
        bilingual: bilingual || null,
        management_experience: management_experience || null,
        why_this_role: why_this_role || null,
        availability_start: availability_start || null,
        referral_source: referral_source || null,
        references: references || null,
        notes: notes || null,
        position: position || 'operations-coordinator',
        resume_url,
        photo_url,
        video_url,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    await notify({
      tenantId: tenant.id,
      type: 'new_lead',
      title: 'New Management Application',
      message: `${name} applied for ${position || 'operations-coordinator'}`,
      channel: 'email',
      recipientType: 'admin',
      metadata: { name, email: normalizedEmail, phone: cleanPhone, resume_url, video_url },
    }).catch(err => console.error('[mgmt-app] notify failed:', err))

    // Clear the applicant's draft for this tenant+position now that they submitted.
    await supabaseAdmin
      .from('management_application_drafts')
      .delete()
      .eq('tenant_id', tenant.id)
      .eq('ip_address', ip)
      .eq('position', position || 'operations-coordinator')

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('POST /api/management-applications error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const { id, status } = await request.json()
    if (!id || !status) return NextResponse.json({ error: 'ID and status required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('management_applications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/management-applications error:', err)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}
