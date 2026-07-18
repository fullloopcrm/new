import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { listEntities } from '@/lib/entity'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const entities = await listEntities(tenantId)
    return NextResponse.json({ entities })
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

    // Always insert as non-default first, then promote atomically via
    // set_default_entity — a two-step "demote existing, then insert with
    // is_default:true" raced on the unique partial index
    // (idx_entities_tenant_default), throwing a raw unhandled 500 on two
    // concurrent make_default requests instead of deterministically landing
    // one. See 2026_07_18_entity_default_must_be_active.sql.
    const { data, error } = await supabaseAdmin
      .from('entities')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        legal_name: body.legal_name || null,
        ein: body.ein || null,
        entity_type: body.entity_type || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        fiscal_year_start: body.fiscal_year_start || 1,
        is_default: false,
      })
      .select('*')
      .single()
    if (error) throw error

    if (body.make_default) {
      const { error: rpcErr } = await supabaseAdmin.rpc('set_default_entity', {
        p_tenant_id: tenantId,
        p_entity_id: data.id,
      })
      if (rpcErr) throw rpcErr
      data.is_default = true
    }

    return NextResponse.json({ entity: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/entities', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
