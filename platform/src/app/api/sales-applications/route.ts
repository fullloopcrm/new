import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { verifySignedUpload } from '@/lib/verify-signed-upload'

// Mirrors the ALLOWED_TYPES 'video' entry in /api/apply/signed-url.
const VIDEO_UPLOAD_CONFIG = { mimes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'], maxSize: 100 * 1024 * 1024 }

// Commission Sales Partner applications — tenant-scoped port of nycmaid's
// single-tenant /api/sales-applications. Public POST resolves the tenant from
// the middleware-injected x-tenant-slug header (or tenant_slug in body);
// admin GET/PUT/DELETE go through requirePermission and stay tenant-scoped.

// video_url/linkedin_url are rendered as <a href={...}> in the staff dashboard
// (SalesAppsTab.tsx) with no scheme sanitization on the render side — React
// does not block `javascript:` hrefs, so an unauthenticated applicant could
// store a `javascript:`/`data:` URL here and get it executed in a staff
// member's dashboard session the moment they click "Watch Selfie Video".
// Enforce http(s)-only at the write boundary instead.
function isHttpUrl(value: unknown): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

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
    const {
      name, email, phone, location, lane, sales_background,
      target_segments, warm_intros, bilingual, why,
      referral_source, linkedin_url, notes, video_url,
    } = body
    let { tenant_slug } = body as { tenant_slug?: string }

    if (!tenant_slug) {
      tenant_slug = request.headers.get('x-tenant-slug') || undefined
    }

    if (!tenant_slug || !name || !email || !phone || !location || !video_url) {
      return NextResponse.json({ error: 'Business, name, email, phone, location, and selfie video are required.' }, { status: 400 })
    }
    if (!isHttpUrl(video_url)) {
      return NextResponse.json({ error: 'Selfie video must be a valid http(s) URL.' }, { status: 400 })
    }
    if (linkedin_url && !isHttpUrl(linkedin_url)) {
      return NextResponse.json({ error: 'LinkedIn URL must be a valid http(s) URL.' }, { status: 400 })
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
    // (/api/apply/signed-url) and is later rendered as a raw <a href> in the
    // admin dashboard ("Watch Selfie Video"). Checking only the URL prefix
    // stops cross-tenant URL swapping but not an attacker PUTting an
    // oversized or wrongly-typed file straight to the signed URL —
    // verifySignedUpload re-checks the actual uploaded object.
    const videoCheck = await verifySignedUpload('uploads', `${tenantId}/applications/videos`, video_url, VIDEO_UPLOAD_CONFIG)
    if (!videoCheck.ok) {
      return NextResponse.json({ error: videoCheck.error }, { status: 400 })
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
  // team.edit, not team.view -- this mutates status (approve/reject), the same
  // class of write team-applications' sibling PUT already gates on team.edit.
  // team.view is read-only in rbac.ts (granted to 'staff', which has no edit
  // rights) so gating a write on it let any staff-role member approve/reject
  // Commission Sales Partner applications.
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
  // team.edit, not team.view -- same reasoning as PUT above.
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
