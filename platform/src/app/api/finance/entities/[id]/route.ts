import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    for (const k of ['name','legal_name','ein','entity_type','address','city','state','zip','fiscal_year_start','active']) {
      if (k in body) updates[k] = body[k]
    }
    if (body.make_default) {
      await supabaseAdmin.from('entities').update({ is_default: false }).eq('tenant_id', tenantId).eq('is_default', true)
      updates.is_default = true
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
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { data: ent } = await supabaseAdmin
      .from('entities').select('is_default').eq('tenant_id', tenantId).eq('id', id).single()
    if (!ent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (ent.is_default) return NextResponse.json({ error: 'Cannot archive the default entity. Set another as default first.' }, { status: 400 })
    await supabaseAdmin.from('entities').update({ active: false }).eq('tenant_id', tenantId).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
