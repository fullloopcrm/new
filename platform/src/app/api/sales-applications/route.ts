import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'
import { escapeHtml } from '@/lib/escape-html'

// Commission Sales Partner applications — tenant-scoped port of nycmaid's
// single-tenant /api/sales-applications. Public POST resolves the tenant from
// the middleware-injected x-tenant-slug header (or tenant_slug in body);
// admin GET/PUT/DELETE go through requirePermission and stay tenant-scoped.

// Rate limiting: 3 applications per 10 minutes per IP.
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
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
  if (isRateLimited(ip)) {
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
      message: `${escapeHtml(name)} applied for Commission Sales Partner`,
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
