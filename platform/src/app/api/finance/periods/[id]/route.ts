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
    const now = new Date().toISOString()

    // locked_by/reopened_by are UUID columns in the audit trail — derive the
    // actor from the authenticated session, never from the request body (a
    // client-supplied actor_id let anyone with finance.expenses forge who
    // locked/reopened a period). tenant.userId isn't always UUID-shaped
    // (it's the literal 'admin' or a Clerk id outside the PIN-token path),
    // so only stamp it when it actually is one; otherwise leave null rather
    // than fail the request or write a bogus value into a UUID column.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const actorId = UUID_RE.test(_authTenant.userId) ? _authTenant.userId : null

    if (body.status === 'locked') {
      updates.status = 'locked'
      updates.locked_at = now
      updates.locked_by = actorId
    } else if (body.status === 'reopened' || body.status === 'open') {
      updates.status = 'open'
      updates.reopened_at = now
      updates.reopened_by = actorId
      updates.reopened_reason = body.reopened_reason || null
    } else if (body.status === 'in_review') {
      updates.status = 'in_review'
    }
    if ('checklist' in body) updates.checklist = body.checklist
    if ('notes' in body) updates.notes = body.notes

    const { data, error } = await supabaseAdmin
      .from('accounting_periods')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ period: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
