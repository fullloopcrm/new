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

    if (body.status === 'locked') {
      updates.status = 'locked'
      updates.locked_at = now
      // locked_by/reopened_by are intentionally NOT set here. They're UUID
      // columns but the caller's userId can be 'admin' (PIN admin) or a
      // Clerk id — neither fits UUID (same constraint as hr_notes.author_id,
      // see hr/[id]/notes/route.ts) — and this route previously trusted a
      // caller-supplied body.actor_id for them, which any finance.expenses
      // holder could forge to plant a false attribution on a compliance
      // control. Real attribution comes from the audit_row_changes trigger
      // (035_close_audit.sql) once accounting_periods is added to its
      // tracked-table list — see 2026_07_17_accounting_periods_audit_trigger_PROPOSED.sql.
    } else if (body.status === 'reopened' || body.status === 'open') {
      updates.status = 'open'
      updates.reopened_at = now
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
