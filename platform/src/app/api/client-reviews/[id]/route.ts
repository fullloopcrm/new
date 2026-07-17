/**
 * PATCH — move a review credit through pending → verified → paid.
 * `status` is the only editable field (mass-assignment guard, same pattern as
 * PUT /api/reviews/[id]). Marking 'paid' stamps `paid_at` and is claimed
 * atomically (`.neq('status', 'paid')`) so a double-submit can't matter —
 * mirrors the identical race guard in PUT /api/referral-commissions, the
 * other "money owed to a person, tracked by a status column" table in this
 * codebase.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

const VALID_STATUS = ['pending', 'verified', 'paid']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant, error: authError } = await requirePermission('reviews.request')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const status = (body as { status?: string }).status
    if (!status || !VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: 'a valid status is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { status }
    if (status === 'paid') updates.paid_at = new Date().toISOString()

    let query = supabaseAdmin
      .from('client_reviews')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (status === 'paid') query = query.neq('status', 'paid')
    const { data, error } = await query.select('*, clients(name), team_members(name)').maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data) {
      // Either the row doesn't belong to this tenant, or (status:'paid' only)
      // it already won the atomic claim — return the current row either way
      // instead of a false 404 on a request that already succeeded once.
      const { data: current, error: curErr } = await supabaseAdmin
        .from('client_reviews')
        .select('*, clients(name), team_members(name)')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 })
      if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ credit: current })
    }

    return NextResponse.json({ credit: data })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
