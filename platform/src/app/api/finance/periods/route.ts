/**
 * Accounting periods — list + open/close/reopen.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl, verifyEntityId } from '@/lib/entity'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const url = new URL(request.url)
    const entityId = entityIdFromUrl(url)

    let q = supabaseAdmin
      .from('accounting_periods')
      .select('*, entities(name)')
      .eq('tenant_id', tenantId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(60)
    if (entityId) q = q.eq('entity_id', entityId)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ periods: data || [] })
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
    if (!body.year || !body.month) {
      return NextResponse.json({ error: 'year, month required' }, { status: 400 })
    }

    // entity_id is a cross-table FK — GET above embeds entities(name), so an
    // unverified entity_id here would let a caller read another tenant's
    // entity name by upserting a period against it.
    const entityId = body.entity_id ? await verifyEntityId(tenantId, body.entity_id) : null
    if (body.entity_id && !entityId) {
      return NextResponse.json({ error: 'Invalid entity_id' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('accounting_periods')
      .upsert({
        tenant_id: tenantId,
        entity_id: entityId,
        year: Number(body.year),
        month: Number(body.month),
        status: body.status || 'open',
        checklist: body.checklist || {},
        notes: body.notes || null,
      }, { onConflict: 'tenant_id,entity_id,year,month' })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ period: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/periods', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
