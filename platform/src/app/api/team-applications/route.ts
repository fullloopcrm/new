import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { notify } from '@/lib/notify'
import { escapeHtml } from '@/lib/escape-html'
import { provisionApprovedApplicant, type ApprovedApplication } from '@/lib/team-provisioning'
import { maxLengthError } from '@/lib/validate'

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

    // The in-memory rate limiter above bounds request COUNT, not these
    // free-text fields' SIZE -- see maxLengthError's doc comment.
    const lenErr = maxLengthError({ experience, availability, notes, references, address, referral_source })
    if (lenErr) return NextResponse.json({ error: lenErr }, { status: 400 })

    // Lowercase — slugs are always generated lowercase (slugify()/toSlug() in
    // every tenant-creation path, per tenant.ts/tenant-lookup.ts's shared
    // resolver contract). The x-tenant-slug header is already lowercase
    // (middleware-injected from tenant.slug), but this route also accepts a
    // caller-supplied tenant_slug directly in the body — unnormalized, that
    // path would silently 404 "Business not found" on a mixed-case slug for a
    // real tenant instead of resolving it.
    const cleanSlug = tenant_slug.toLowerCase()

    // Look up tenant. maybeSingle() + explicit error check — same
    // masked-error pattern already fixed on the canonical resolver: slug is
    // UNIQUE NOT NULL at the DB level, so 0 rows legitimately means "unknown
    // business", not an error. single() can't tell that apart from a genuine
    // DB failure (both surface as data:null once destructured), so a real
    // outage here used to look identical to "Business not found".
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('slug', cleanSlug)
      .maybeSingle()

    if (tenantError) {
      console.error(`TEAM_APPLICATION_TENANT_LOOKUP_ERROR slug=${cleanSlug} error=${tenantError.message}`)
      return NextResponse.json({ error: 'Unable to submit application. Please try again.' }, { status: 500 })
    }

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
      message: `${escapeHtml(name)} applied to join the team`,
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

    if (status === 'approved') {
      // CAS: `.neq('status', 'approved')` makes this update a no-op (0 rows)
      // if the application was already approved. Without it, a double-click
      // or retry hitting this route twice for the same application re-ran
      // provisionApprovedApplicant on every call -- team_members dedup by
      // phone so no duplicate hire was created, but the applicant's welcome
      // email (with their PIN) was silently RE-SENT every time, with no cap.
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('team_applications')
        .update({ status })
        .eq('id', id)
        .eq('tenant_id', tenant.tenantId)
        .neq('status', 'approved')
        .select()
        .maybeSingle()

      if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 })

      // On the actual pending->approved transition, provision the applicant as
      // a team member (PIN + portal) and email them. Best-effort: a failure
      // here must never undo the status update.
      if (claimed) {
        try {
          await provisionApprovedApplicant(tenant.tenantId, claimed as ApprovedApplication)
        } catch (provErr) {
          console.error('Approve provisioning/email failed:', provErr instanceof Error ? provErr.message : provErr)
        }
      }

      const { data, error } = await supabaseAdmin
        .from('team_applications')
        .select()
        .eq('id', id)
        .eq('tenant_id', tenant.tenantId)
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ application: data })
    }

    const { data, error } = await supabaseAdmin
      .from('team_applications')
      .update({ status })
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
