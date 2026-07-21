import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)
    const url = request.nextUrl
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
    const offset = (page - 1) * limit

    // tenantDb auto-injects .eq('tenant_id', tenantId) on the select below.
    let query = db
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      const s = sanitizePostgrestValue(search)
      query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`)
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
    const db = tenantDb(tenantId)
    const body = await request.json()
    const settings = await getSettings(tenantId)

    const validated = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      email: { type: 'email' },
      phone: { type: 'phone' },
      address: { type: 'string', max: 500 },
      source: { type: 'string', max: 100 },
      status: { type: 'string', max: 50 },
      sales_partner_id: { type: 'uuid' },
      referrer_id: { type: 'uuid' },
      notes: { type: 'string', max: 2000 },
    })
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 })
    const fields = validated.data

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

    // sales_partner_id is a plain uuid per the validate() schema above --
    // confirm it actually belongs to this tenant before it's attributed,
    // same tenant-ownership check every other FK-by-id write in this route
    // family enforces (a cross-tenant id here would misattribute commission
    // earnings to the wrong tenant's partner).
    if (fields?.sales_partner_id) {
      const { data: partnerRow } = await supabaseAdmin
        .from('sales_partners')
        .select('id')
        .eq('id', fields.sales_partner_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!partnerRow) {
        return NextResponse.json({ error: 'Invalid sales partner' }, { status: 400 })
      }
    }

    // Same tenant-ownership check as sales_partner_id above -- referrer_id
    // drives the sticky commission attribution read on every completed
    // cleaning (see 2026_07_18_sales_partners.sql), so a cross-tenant id here
    // would misattribute commission earnings to the wrong tenant's referrer.
    if (fields?.referrer_id) {
      const { data: referrerRow } = await supabaseAdmin
        .from('referrers')
        .select('id')
        .eq('id', fields.referrer_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!referrerRow) {
        return NextResponse.json({ error: 'Invalid referrer' }, { status: 400 })
      }
    }

    // Check for potential duplicates
    const duplicateChecks = []
    if (fields?.email) {
      duplicateChecks.push(
        db
          .from('clients')
          .select('id, name, email, phone')
          .eq('email', fields.email)
          .limit(1)
      )
    }
    if (fields?.phone) {
      duplicateChecks.push(
        db
          .from('clients')
          .select('id, name, email, phone')
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

    // tenantDb.insert stamps tenant_id last, so a forged body value can't win.
    const { data, error } = await db
      .from('clients')
      .insert({ ...fields })
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
