// Single treatment-log record. `id` is the pest_treatment_logs.id.
// PATCH  → correct a field on an existing log entry.
// DELETE → remove a log entry (e.g. entered in error).
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { APPLICATION_METHODS } from '../route'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('bookings.edit')
  if (error) return error
  try {
    const { tenantId } = tenant
    const { id } = await ctx.params

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }
    if (body.application_method && !APPLICATION_METHODS.includes(body.application_method as string))
      return NextResponse.json({ error: 'invalid application_method' }, { status: 400 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const editable = [
      'booking_id', 'client_id', 'team_member_id', 'application_date', 'service_address',
      'target_pest', 'product_name', 'epa_reg_number', 'active_ingredient', 'application_method',
      'quantity_used', 'dilution_rate', 'area_treated', 'weather_conditions',
      'applicator_license_number', 'notes',
    ]
    for (const key of editable) {
      if (key in body) patch[key] = body[key]
    }
    if ('target_pest' in patch && !String(patch.target_pest || '').trim())
      return NextResponse.json({ error: 'target_pest cannot be empty' }, { status: 400 })
    if ('product_name' in patch && !String(patch.product_name || '').trim())
      return NextResponse.json({ error: 'product_name cannot be empty' }, { status: 400 })

    const { data, error: dbError } = await tenantDb(tenantId)
      .from('pest_treatment_logs')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'log not found' }, { status: 404 })

    return NextResponse.json({ ok: true, log: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { tenant, error } = await requirePermission('bookings.edit')
  if (error) return error
  try {
    const { tenantId } = tenant
    const { id } = await ctx.params

    const { error: dbError } = await tenantDb(tenantId)
      .from('pest_treatment_logs')
      .delete()
      .eq('id', id)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
