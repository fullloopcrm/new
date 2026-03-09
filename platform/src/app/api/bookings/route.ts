import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = request.nextUrl
    const status = url.searchParams.get('status')
    const clientId = url.searchParams.get('client_id')
    const teamMemberId = url.searchParams.get('team_member_id')
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('bookings')
      .select('*, clients(name, phone, address), team_members(name, phone)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (clientId) query = query.eq('client_id', clientId)
    if (teamMemberId) query = query.eq('team_member_id', teamMemberId)
    if (dateFrom) query = query.gte('start_time', dateFrom)
    if (dateTo) query = query.lte('start_time', dateTo)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bookings: data, total: count })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      client_id: { type: 'uuid', required: true },
      team_member_id: { type: 'uuid' },
      service_type_id: { type: 'uuid' },
      start_time: { type: 'date', required: true },
      end_time: { type: 'date' },
      notes: { type: 'string', max: 2000 },
      special_instructions: { type: 'string', max: 2000 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const validated = fields!

    // Check for team member scheduling conflicts
    if (validated.team_member_id && validated.start_time) {
      const endTime = validated.end_time || new Date(new Date(validated.start_time as string).getTime() + 3 * 3600000).toISOString()

      const { data: conflicts } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time')
        .eq('tenant_id', tenantId)
        .eq('team_member_id', validated.team_member_id)
        .not('status', 'in', '("cancelled","no_show")')
        .lt('start_time', endTime)
        .gt('end_time', validated.start_time)

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({
          error: 'Scheduling conflict: team member already has a booking during this time',
          conflicts: conflicts.map(c => ({
            id: c.id,
            start: c.start_time,
            end: c.end_time,
          }))
        }, { status: 409 })
      }
    }

    // Look up service type name if service_type_id provided
    if (validated.service_type_id) {
      const { data: svc } = await supabaseAdmin
        .from('service_types')
        .select('name')
        .eq('id', validated.service_type_id as string)
        .single()
      if (svc) (validated as Record<string, unknown>).service_type = svc.name
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({ ...validated, tenant_id: tenantId, status: 'scheduled' })
      .select('*, clients(name, phone, address), team_members(name, phone)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'booking.created', entityType: 'booking', entityId: data.id, details: { service: validated.service_type_id } })

    return NextResponse.json({ booking: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
