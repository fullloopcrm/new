import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { randomBytes } from 'crypto'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { data, error } = await supabaseAdmin
      .from('cpa_access_tokens')
      .select('*, entities(name)')
      .eq('tenant_id', tenantId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ tokens: data || [] })
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
    const body = await request.json().catch(() => ({}))
    const token = randomBytes(24).toString('base64url')
    const expiresAt = body.expires_in_days
      ? new Date(Date.now() + Number(body.expires_in_days) * 86400000).toISOString()
      : null

    // entity_id is a caller-supplied FK — entities has its own tenant_id and no
    // cross-tenant FK check, and it's surfaced back unscoped via this route's own
    // GET (`entities(name)` embed). Same class as the bank-accounts/expenses/
    // periods entity_id fixes (P4-P6 in the leak register).
    let entityId: string | null = body.entity_id || null
    if (entityId) {
      const { data: owned } = await supabaseAdmin
        .from('entities')
        .select('id')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Invalid entity_id' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('cpa_access_tokens')
      .insert({
        tenant_id: tenantId,
        entity_id: entityId,
        cpa_name: body.cpa_name || null,
        cpa_email: body.cpa_email || null,
        token,
        expires_at: expiresAt,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ token: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const body = await request.json()
    await supabaseAdmin
      .from('cpa_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', body.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
