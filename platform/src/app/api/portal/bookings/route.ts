import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/route'
import { getSettings } from '@/lib/settings'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*, team_members(name)')
    .eq('tenant_id', auth.tid)
    .eq('client_id', auth.id)
    .order('start_time', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookings: data })
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  // Enforce tenant scheduling rules (allow_same_day, min_days_ahead).
  // start_time is a client-provided ISO string; reject if missing or unparseable.
  const settings = await getSettings(auth.tid)
  const requestedStart = body.start_time ? new Date(body.start_time) : null
  if (!requestedStart || isNaN(requestedStart.getTime())) {
    return NextResponse.json({ error: 'Invalid start_time' }, { status: 400 })
  }
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfRequested = new Date(requestedStart.getFullYear(), requestedStart.getMonth(), requestedStart.getDate())
  const daysAhead = Math.round((startOfRequested.getTime() - startOfToday.getTime()) / 86_400_000)
  if (daysAhead < 0) {
    return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 })
  }
  if (daysAhead === 0 && !settings.allow_same_day) {
    return NextResponse.json({ error: 'Same-day bookings are not accepted. Please choose a future date.' }, { status: 400 })
  }
  if (daysAhead < settings.min_days_ahead) {
    return NextResponse.json(
      { error: `Bookings require at least ${settings.min_days_ahead} day${settings.min_days_ahead === 1 ? '' : 's'} notice.` },
      { status: 400 }
    )
  }

  // Look up service type — tenant-scoped so a client from tenant A cannot
  // post a booking with tenant B's service_type_id.
  let serviceType = null
  let price = null
  if (body.service_type_id) {
    const { data: svc } = await supabaseAdmin
      .from('service_types')
      .select('name, default_duration_hours, default_hourly_rate')
      .eq('id', body.service_type_id)
      .eq('tenant_id', auth.tid)
      .single()
    if (!svc) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }
    serviceType = svc.name
    price = svc.default_hourly_rate * svc.default_duration_hours * 100
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      tenant_id: auth.tid,
      client_id: auth.id,
      service_type_id: body.service_type_id || null,
      service_type: serviceType,
      start_time: body.start_time,
      end_time: body.end_time || null,
      notes: body.notes || null,
      special_instructions: body.special_instructions || null,
      price,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ booking: data }, { status: 201 })
}
