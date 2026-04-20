/**
 * Management application flow — applying for ops/management roles at a tenant.
 * Public POST from the tenant's careers page (tenant resolved via host header).
 * Admin GET/PUT require admin session.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await supabaseAdmin
      .from('management_applications')
      .select('*')
      .eq('tenant_id', tenantId)
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
      name, email, phone, location, current_role, years_experience,
      bilingual, management_experience, why_this_role, availability_start,
      referral_source, references, notes, position, resume_url, photo_url, video_url,
    } = body

    if (!name || !email || !phone || !location || !resume_url || !photo_url || !video_url) {
      return NextResponse.json({ error: 'Name, email, phone, location, resume, photo, and selfie video are required.' }, { status: 400 })
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
  try {
    const { tenantId } = await getTenantForRequest()
    const { id, status } = await request.json()
    if (!id || !status) return NextResponse.json({ error: 'ID and status required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('management_applications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
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
