import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { checkMemberDayOff } from '@/lib/availability'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(name, phone, address, email), team_members(name, phone, email)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, ['client_id', 'team_member_id', 'service_type_id', 'start_time', 'end_time', 'notes', 'special_instructions', 'status', 'hourly_rate', 'pay_rate'])

    // Check if team member has the day off or doesn't work that day
    if (fields.team_member_id && !body.force) {
      // Get the booking's start_time (from update or existing record)
      let bookingDate = fields.start_time ? (fields.start_time as string).split('T')[0] : null
      if (!bookingDate) {
        const { data: existing } = await supabaseAdmin
          .from('bookings')
          .select('start_time')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single()
        if (existing) bookingDate = existing.start_time.split('T')[0]
      }
      if (bookingDate) {
        const dayOff = await checkMemberDayOff(tenantId, fields.team_member_id as string, bookingDate)
        if (dayOff.unavailable) {
          return NextResponse.json({
            error: dayOff.reason,
            unavailable: true,
          }, { status: 409 })
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*, clients(name, phone, address), team_members(name, phone)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('bookings.delete')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
