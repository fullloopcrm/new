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
    const now = new Date().toISOString()

    if (body.status === 'locked') {
      updates.status = 'locked'
      updates.locked_at = now
      updates.locked_by = body.actor_id || null
    } else if (body.status === 'reopened' || body.status === 'open') {
      updates.status = 'open'
      updates.reopened_at = now
      updates.reopened_by = body.actor_id || null
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
