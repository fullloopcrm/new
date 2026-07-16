import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'
import { buildIlikeOrFilter } from '@/lib/postgrest-or-filter'

export async function GET(request: NextRequest) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.view')
    if (authError) return authError
    const { tenantId } = tenant
    const url = request.nextUrl
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(buildIlikeOrFilter(['name', 'email', 'phone'], search))
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ clients: data, total: count })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('clients.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()
    const settings = await getSettings(tenantId)

    // notes/referrer_id were missing from this schema until now: the
    // dashboard's "new client" modal (BookingsAdmin.tsx) collects both (a
    // free-text special-instructions textarea and a "Referred By" dropdown
    // of this tenant's own referrers) and sends them, but validate() is a
    // strict allowlist -- so they were silently dropped before the insert,
    // discarding the admin's notes and the manual referral attribution.
    const validated = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      email: { type: 'email' },
      phone: { type: 'phone' },
      address: { type: 'string', max: 500 },
      source: { type: 'string', max: 100 },
      status: { type: 'string', max: 50 },
      notes: { type: 'string', max: 2000 },
      referrer_id: { type: 'uuid' },
    })
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 })
    const fields = validated.data

    // Confirm a caller-supplied referrer_id belongs to this tenant before it
    // can be joined into any response -- client-analytics' `clients.select('*,
    // referrers(name, ref_code))` embed has no tenant filter on the referrers
    // side (same unscoped-embed shape flagged elsewhere this session), so an
    // unverified foreign referrer_id would leak that other tenant's referrer
    // name + ref_code into this tenant's analytics.
    if (fields?.referrer_id) {
      const { data: refRow } = await supabaseAdmin
        .from('referrers')
        .select('id')
        .eq('id', fields.referrer_id as string)
        .eq('tenant_id', tenantId)
        .single()
      if (!refRow) return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })
    }

    // Tenant rules: enforce required fields, default the lifecycle status.
    if (settings.require_client_phone && !fields?.phone) {
      return NextResponse.json({ error: 'Phone number is required for new clients.' }, { status: 400 })
    }
    if (settings.require_client_email && !fields?.email) {
      return NextResponse.json({ error: 'Email address is required for new clients.' }, { status: 400 })
    }
    if (fields && !fields.status) {
      fields.status = settings.default_client_status || 'active'
    }

    // Check for potential duplicates
    const duplicateChecks = []
    if (fields?.email) {
      duplicateChecks.push(
        supabaseAdmin
          .from('clients')
          .select('id, name, email, phone')
          .eq('tenant_id', tenantId)
          .eq('email', fields.email)
          .limit(1)
      )
    }
    if (fields?.phone) {
      duplicateChecks.push(
        supabaseAdmin
          .from('clients')
          .select('id, name, email, phone')
          .eq('tenant_id', tenantId)
          .eq('phone', fields.phone)
          .limit(1)
      )
    }

    const dupeResults = await Promise.all(duplicateChecks)
    const duplicates = dupeResults.flatMap(r => r.data || [])
    const uniqueDupes = [...new Map(duplicates.map(d => [d.id, d])).values()]

    // If force=true in body, skip duplicate warning
    const force = (body as Record<string, unknown>).force === true

    if (uniqueDupes.length > 0 && !force) {
      return NextResponse.json({
        warning: 'Potential duplicate client found',
        duplicates: uniqueDupes,
        message: 'Set force=true to create anyway',
      }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({ ...fields, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'client.created', entityType: 'client', entityId: data.id, details: { name: data.name } })

    return NextResponse.json({ client: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
