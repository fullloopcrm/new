import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { isEmploymentType, isHrStatus, isCompType, isPayPeriod } from '@/lib/company-team'

const EDITABLE_FIELDS = [
  'name', 'email', 'phone', 'title', 'department', 'employment_type', 'hr_status',
  'hire_date', 'termination_date', 'comp_type', 'pay_rate_cents', 'pay_period', 'notes',
] as const

// PATCH /api/admin/company/team/[id]
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await ctx.params
  const payload = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!payload) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  if ('employment_type' in payload && typeof payload.employment_type === 'string' && !isEmploymentType(payload.employment_type)) {
    return NextResponse.json({ error: 'invalid employment_type' }, { status: 400 })
  }
  if ('hr_status' in payload && typeof payload.hr_status === 'string' && !isHrStatus(payload.hr_status)) {
    return NextResponse.json({ error: 'invalid hr_status' }, { status: 400 })
  }
  if ('comp_type' in payload && typeof payload.comp_type === 'string' && !isCompType(payload.comp_type)) {
    return NextResponse.json({ error: 'invalid comp_type' }, { status: 400 })
  }
  if ('pay_period' in payload && typeof payload.pay_period === 'string' && !isPayPeriod(payload.pay_period)) {
    return NextResponse.json({ error: 'invalid pay_period' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const f of EDITABLE_FIELDS) {
    if (f in payload) updates[f] = payload[f]
  }

  const { data, error } = await supabaseAdmin
    .from('platform_team_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

// DELETE /api/admin/company/team/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await ctx.params
  const { error } = await supabaseAdmin.from('platform_team_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
