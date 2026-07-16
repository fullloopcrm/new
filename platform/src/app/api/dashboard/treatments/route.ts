// Pest-control chemical/treatment application log. Global route, one copy —
// relevant to pest-vertical tenants, reachable by any tenant (data-driven,
// per platform/CLAUDE.md's "tenants differ by data, never by code" rule).
// GET  → list this tenant's logs, most recent first, optional filters.
// POST → record a new treatment application.
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

export const APPLICATION_METHODS = ['spray', 'bait', 'dust', 'granular', 'fog', 'injection', 'other']

export async function GET(req: NextRequest) {
  const { tenant, error } = await requirePermission('bookings.view')
  if (error) return error
  try {
    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('booking_id')
    const teamMemberId = searchParams.get('team_member_id')

    let query = tenantDb(tenant.tenantId)
      .from('pest_treatment_logs')
      .select('*')
      .order('application_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (bookingId) query = query.eq('booking_id', bookingId)
    if (teamMemberId) query = query.eq('team_member_id', teamMemberId)

    const { data, error: dbError } = await query
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ logs: data || [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { tenant, error } = await requirePermission('bookings.edit')
  if (error) return error
  try {
    const { tenantId } = tenant

    let body: {
      booking_id?: string | null
      client_id?: string | null
      team_member_id?: string | null
      application_date?: string
      service_address?: string
      target_pest?: string
      product_name?: string
      epa_reg_number?: string
      active_ingredient?: string
      application_method?: string
      quantity_used?: string
      dilution_rate?: string
      area_treated?: string
      weather_conditions?: string
      applicator_license_number?: string
      notes?: string
      warranty_days?: number | null
      is_reservice?: boolean
      reservice_of_log_id?: string | null
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    const targetPest = body.target_pest?.trim()
    const productName = body.product_name?.trim()
    if (!targetPest) return NextResponse.json({ error: 'target_pest required' }, { status: 400 })
    if (!productName) return NextResponse.json({ error: 'product_name required' }, { status: 400 })
    const method = body.application_method || 'spray'
    if (!APPLICATION_METHODS.includes(method))
      return NextResponse.json({ error: 'invalid application_method' }, { status: 400 })

    let warrantyDays: number | null = null
    if (body.warranty_days !== undefined && body.warranty_days !== null) {
      const n = Number(body.warranty_days)
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n))
        return NextResponse.json({ error: 'warranty_days must be a positive integer' }, { status: 400 })
      warrantyDays = n
    }

    // reservice_of_log_id is a cross-row FK a caller controls — confirm it
    // belongs to this tenant before inserting, or a caller could link a free
    // re-service to (and thereby infer the existence of) another tenant's log.
    const reserviceOfLogId = body.reservice_of_log_id || null
    if (reserviceOfLogId) {
      const { data: owned } = await tenantDb(tenantId)
        .from('pest_treatment_logs')
        .select('id')
        .eq('id', reserviceOfLogId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Invalid reservice_of_log_id' }, { status: 400 })
    }

    const { data, error: dbError } = await tenantDb(tenantId)
      .from('pest_treatment_logs')
      .insert({
        booking_id: body.booking_id || null,
        client_id: body.client_id || null,
        team_member_id: body.team_member_id || null,
        application_date: body.application_date || new Date().toISOString().slice(0, 10),
        service_address: body.service_address?.trim() || null,
        target_pest: targetPest,
        product_name: productName,
        epa_reg_number: body.epa_reg_number?.trim() || null,
        active_ingredient: body.active_ingredient?.trim() || null,
        application_method: method,
        quantity_used: body.quantity_used?.trim() || null,
        dilution_rate: body.dilution_rate?.trim() || null,
        area_treated: body.area_treated?.trim() || null,
        weather_conditions: body.weather_conditions?.trim() || null,
        applicator_license_number: body.applicator_license_number?.trim() || null,
        notes: body.notes?.trim() || null,
        warranty_days: warrantyDays,
        is_reservice: body.is_reservice === true,
        reservice_of_log_id: reserviceOfLogId,
      })
      .select('*')
      .single()
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ ok: true, log: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
