import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Unauthenticated public POST — a caller controls every free-text field below.
// Cap each so a single submission can't balloon a sales_applications row (or
// the admin notification built from it) to megabytes of attacker-chosen
// content. Same bug class already fixed on /api/contact, /api/lead,
// /api/waitlist, /api/ingest/lead, /api/ingest/application, and this route's
// siblings (management-applications, team-applications) this session.
const MAX_SHORT = 200
const MAX_LONG = 2000
function cap(v: unknown, max: number): unknown {
  return typeof v === 'string' ? v.trim().slice(0, max) : v
}

// Commission Sales Partner applications — tenant-scoped port of nycmaid's
// single-tenant /api/sales-applications. Public POST resolves the tenant from
// the middleware-injected x-tenant-slug header only (never client body);
// admin GET/PUT/DELETE go through requirePermission and stay tenant-scoped.

// GET - List sales applications (admin only, tenant-scoped)
export async function GET() {
  const { tenant, error: authError } = await requirePermission('team.view')
  if (authError) return authError

  try {
    const { data, error } = await supabaseAdmin
      .from('sales_applications')
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

// POST - Submit new sales application (public, tenant from header/body)
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`sales-applications:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { email, phone, target_segments, video_url } = body
    const name = cap(body.name, MAX_SHORT)
    const location = cap(body.location, MAX_SHORT)
    const lane = cap(body.lane, MAX_SHORT)
    const sales_background = cap(body.sales_background, MAX_LONG)
    const warm_intros = cap(body.warm_intros, MAX_LONG)
    const bilingual = cap(body.bilingual, MAX_SHORT)
    const why = cap(body.why, MAX_LONG)
    const referral_source = cap(body.referral_source, MAX_SHORT)
    const linkedin_url = cap(body.linkedin_url, MAX_SHORT)
    const notes = cap(body.notes, MAX_LONG)

    // Tenant comes ONLY from the middleware-injected header, never from the
    // body. Middleware resolves+overwrites x-tenant-slug from the verified
    // Host on every /api/* request, so a caller can't pick an arbitrary
    // tenant_slug here to plant a fake application + forge that tenant's
    // "New Sales Partner Application" admin-notification email — same bug
    // class already fixed on /api/track (tenant_id spoofing, commit 5bd00d72).
    const tenant_slug = request.headers.get('x-tenant-slug') || undefined

    if (!tenant_slug || !name || !email || !phone || !location || !video_url) {
      return NextResponse.json({ error: 'Business, name, email, phone, location, and selfie video are required.' }, { status: 400 })
    }

    // linkedin_url is free-text from an unauthenticated public form and is
    // rendered as a raw <a href> in the admin dashboard (SalesAppsTab.tsx) —
    // reject non-http(s) schemes so a submission can't smuggle a javascript:
    // URI into an admin's click.
    if (linkedin_url && !/^https?:\/\//i.test(String(linkedin_url))) {
      return NextResponse.json({ error: 'LinkedIn URL must start with http:// or https://' }, { status: 400 })
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

    // video_url is expected to come from the legitimate signed-upload flow
    // (/api/apply/signed-url), but nothing previously checked that — a caller
    // could POST any string, which is later rendered as a raw <a href> in the
    // admin dashboard ("Watch Selfie Video"). Same bug class already fixed in
    // team-portal/video-upload: require it to live inside this tenant's own
    // application-video storage prefix.
    const { data: videoPrefix } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(`${tenantId}/applications/videos/`)
    if (typeof video_url !== 'string' || !video_url.startsWith(videoPrefix.publicUrl)) {
      return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\D/g, '')
    const segments = Array.isArray(target_segments)
      ? target_segments
      : (target_segments ? [String(target_segments)] : [])

    // Duplicate check (per tenant, pending, by email)
    const { data: existing } = await supabaseAdmin
      .from('sales_applications')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'pending')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'You already have a pending application for this position.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('sales_applications')
      .insert({
        tenant_id: tenantId,
        name,
        email: email.toLowerCase().trim(),
        phone: cleanPhone,
        location,
        lane: lane || null,
        sales_background: sales_background || null,
        target_segments: segments,
        warm_intros: warm_intros || null,
        bilingual: bilingual || null,
        why: why || null,
        referral_source: referral_source || null,
        linkedin_url: linkedin_url || null,
        notes: notes || null,
        video_url,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify admin (tenant-scoped, per-tenant channel)
    await notify({
      tenantId,
      type: 'team_member_added',
      title: 'New Sales Partner Application',
      message: `${name} applied for Commission Sales Partner`,
      channel: 'email',
      recipientType: 'admin',
      metadata: { applicantName: name, phone: cleanPhone, videoUrl: video_url, role: 'commission_sales_partner' },
    })

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (err) {
    console.error('Sales application error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

// PUT - Update application status (admin only, tenant-scoped)
export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, status } = body
    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('sales_applications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('Sales application update error:', e)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}

// DELETE - Remove an application (admin only, tenant-scoped)
export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('sales_applications')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
