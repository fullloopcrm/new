import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = request.nextUrl
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
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

    const validated = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      email: { type: 'email' },
      phone: { type: 'phone' },
      address: { type: 'string', max: 500 },
      source: { type: 'string', max: 100 },
      status: { type: 'string', max: 50 },
    })
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 })
    const fields = validated.data

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
