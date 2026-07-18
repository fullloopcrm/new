import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    for (const k of ['name','legal_name','ein','entity_type','address','city','state','zip','fiscal_year_start','active']) {
      if (k in body) updates[k] = body[k]
    }
    // make_default goes through the atomic set_default_entity RPC instead of
    // a separate demote-then-set pair — same race/collision reasons as the
    // POST route. See 2026_07_18_entity_default_must_be_active.sql.
    if (body.make_default) {
      const { error: rpcErr } = await supabaseAdmin.rpc('set_default_entity', {
        p_tenant_id: tenantId,
        p_entity_id: id,
      })
      if (rpcErr) throw rpcErr
    }
    const { data, error } = await supabaseAdmin
      .from('entities')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ entity: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const { data: ent } = await supabaseAdmin
      .from('entities').select('id').eq('tenant_id', tenantId).eq('id', id).maybeSingle()
    if (!ent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // The is_default check happens IN the archive UPDATE's own WHERE clause
    // (not a preceding SELECT) so it's atomic against a concurrent
    // PATCH .../[id] {make_default:true} on this same entity — a
    // check-then-act SELECT-then-UPDATE here could archive an entity the
    // instant after it became the default, leaving the tenant's default
    // entity archived (every fallback that resolves "the default entity"
    // when no entity_id is given would then silently keep resolving to a
    // dead entity — see 2026_07_18_entity_default_must_be_active.sql).
    const { data: archived, error } = await supabaseAdmin
      .from('entities')
      .update({ active: false })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .eq('is_default', false)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!archived) return NextResponse.json({ error: 'Cannot archive the default entity. Set another as default first.' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
