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
    // A foreign entity_id would join back as entities(id, name) on GET -- a
    // cross-tenant leak of another tenant's business entity name.
    if (body.entity_id && !(await isEntityOwnedByTenant(tenantId, body.entity_id))) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }

    // A foreign coa_id here isn't just a GET-time chart_of_accounts(code,name)
    // leak: bank-transactions/[id], receipts/attach, and bank-transactions/
    // [id]/match all trust this account's coa_id verbatim as one side of a
    // journal entry (they only validate the OTHER, caller-supplied coa_id).
    // A foreign coa_id here would post real journal lines against another
    // tenant's chart of accounts, which then joins straight into this
    // tenant's own trial balance / general ledger / CPA exports.
    if (body.coa_id) {
      const { data: coaRow } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id')
        .eq('id', body.coa_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!coaRow) return NextResponse.json({ error: 'Invalid coa_id' }, { status: 400 })
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
