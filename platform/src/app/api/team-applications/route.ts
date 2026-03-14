import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'

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
    const { tenant_slug, name, email, phone, address, experience, availability, referral_source, references, notes, photo_url } = body

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
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
    const { id } = await request.json()

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
