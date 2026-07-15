import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl, getDefaultEntityId, verifyEntityId } from '@/lib/entity'

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

    // entity_id and coa_id are cross-table FKs — GET on this same route embeds
    // entities(id, name) and chart_of_accounts(code, name, type), so an
    // unverified value here would let a caller point a new bank account at
    // another tenant's entity/CoA row and exfiltrate its name/code via that
    // embed (same class already fixed on PATCH /api/finance/bank-accounts/[id]
    // for coa_id, and on POST /api/finance/periods + finance/expenses/[id] for
    // entity_id — this create path was the missed sibling).
    const entityId = body.entity_id ? await verifyEntityId(tenantId, body.entity_id) : await getDefaultEntityId(tenantId)
    if (body.entity_id && !entityId) {
      return NextResponse.json({ error: 'Invalid entity_id' }, { status: 400 })
    }

    let coaId: string | null = null
    if (body.coa_id) {
      const { data: coa } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id')
        .eq('id', body.coa_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!coa) return NextResponse.json({ error: 'Invalid coa_id' }, { status: 400 })
      coaId = coa.id
    }

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
        coa_id: coaId,
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
