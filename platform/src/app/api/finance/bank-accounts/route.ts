import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl, getDefaultEntityId, isEntityOwnedByTenant } from '@/lib/entity'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const entityId = entityIdFromUrl(new URL(request.url))
    let q = supabaseAdmin
      .from('bank_accounts')
      .select('*, chart_of_accounts(code, name, type), entities(id, name)')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('created_at', { ascending: true })
    if (entityId) q = q.eq('entity_id', entityId)
    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ bank_accounts: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    // Caller-supplied FKs — entities/chart_of_accounts both carry their own
    // tenant_id, and GET embeds entities(name)/chart_of_accounts(name) off this
    // row, so a foreign id would leak another tenant's identity on the next read.
    if (body.entity_id && !(await isEntityOwnedByTenant(tenantId, body.entity_id))) {
      return NextResponse.json({ error: 'Invalid entity_id' }, { status: 404 })
    }
    if (body.coa_id) {
      const { data: owned } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id')
        .eq('id', body.coa_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Invalid coa_id' }, { status: 404 })
    }

    const entityId = body.entity_id || (await getDefaultEntityId(tenantId))

    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .insert({
        tenant_id: tenantId,
        entity_id: entityId,
        name: body.name,
        institution: body.institution || null,
        type: body.type || 'checking',
        mask: body.mask || null,
        currency: body.currency || 'USD',
        coa_id: body.coa_id || null,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ bank_account: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
