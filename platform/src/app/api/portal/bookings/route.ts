import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/token'
import { getSettings } from '@/lib/settings'
import { applyRecurringDiscount } from '@/lib/nycmaid/recurring-discount'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data, error } = await tenantDb(auth.tid)
    .from('bookings')
    .select('*, team_members!bookings_team_member_id_fkey(name)')
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
  const db = tenantDb(auth.tid)

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
  let hourlyRate = null
  let durationHours = null
  if (body.service_type_id) {
    const { data: svc } = await db
      .from('service_types')
      .select('name, default_duration_hours, default_hourly_rate')
      .eq('id', body.service_type_id)
      .single<{ name: string; default_duration_hours: number; default_hourly_rate: number }>()
    if (!svc) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }
    serviceType = svc.name
    hourlyRate = svc.default_hourly_rate
    durationHours = svc.default_duration_hours
    price = svc.default_hourly_rate * svc.default_duration_hours * 100
  }

  // Same-day = emergency (same server-side determination as the AI/SMS
  // create_booking tool and the generic-tenant branch of POST /api/client/book
  // — see P11.8/P11.16/17). Until now this route had ZERO same-day pricing
  // logic: a same-day booking through the client portal was always billed the
  // flat service_types rate, and the row was never flagged is_emergency,
  // regardless of the tenant's configured selena_config.emergency_rate.
  const isEmergency = daysAhead === 0
  if (isEmergency && durationHours != null) {
    const { data: t } = await supabaseAdmin
      .from('tenants')
      .select('selena_config')
      .eq('id', auth.tid)
      .maybeSingle<{ selena_config?: { emergency_available?: boolean; emergency_rate?: number } | null }>()
    const selenaConfig = t?.selena_config
    if (selenaConfig?.emergency_available && selenaConfig.emergency_rate) {
      hourlyRate = selenaConfig.emergency_rate
      price = selenaConfig.emergency_rate * durationHours * 100
    }
  }

  // Recurring-service discount ("save 20%"): weekly 20% off, biweekly/monthly 10% off.
  const recurringType = body.recurring_type && body.recurring_type !== 'none' ? String(body.recurring_type) : null
  if (price != null && recurringType) {
    price = applyRecurringDiscount(price, recurringType)
  }

  const { data, error } = await db
    .from('bookings')
    .insert({
      client_id: auth.id,
      service_type_id: body.service_type_id || null,
      service_type: serviceType,
      start_time: body.start_time,
      end_time: body.end_time || null,
      notes: body.notes || null,
      special_instructions: body.special_instructions || null,
      price,
      hourly_rate: hourlyRate,
      is_emergency: isEmergency,
      recurring_type: recurringType,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ booking: data }, { status: 201 })
}
