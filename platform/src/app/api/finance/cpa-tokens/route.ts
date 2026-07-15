import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { randomBytes } from 'crypto'
import { isEntityOwnedByTenant } from '@/lib/entity'

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
    // `!= null` (not truthy) — `expires_in_days: 0` means "expires immediately",
    // not "no expiration". A truthy check silently turns a 0-day request into a
    // permanent read-access token into the tenant's full general ledger.
    const daysRaw = body.expires_in_days
    const days = daysRaw != null ? Number(daysRaw) : null
    const expiresAt = days != null && Number.isFinite(days)
      ? new Date(Date.now() + Math.max(days, 0) * 86400000).toISOString()
      : null
    // A foreign entity_id would join back as entities(name) on GET -- a
    // cross-tenant leak of another tenant's business entity name.
    if (body.entity_id && !(await isEntityOwnedByTenant(tenantId, body.entity_id))) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }
    const { data, error } = await supabaseAdmin
      .from('cpa_access_tokens')
      .insert({
        tenant_id: tenantId,
        entity_id: body.entity_id || null,
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
