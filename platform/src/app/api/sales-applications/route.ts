import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Commission Sales Partner applications — tenant-scoped port of nycmaid's
// single-tenant /api/sales-applications. Public POST resolves the tenant from
// the middleware-injected x-tenant-slug header (or tenant_slug in body);
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
  const { tenant, error: authError } = await requirePermission('team.view')
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
  const { tenant, error: authError } = await requirePermission('team.view')
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
