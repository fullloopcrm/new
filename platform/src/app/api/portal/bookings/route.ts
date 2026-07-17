import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
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

  const db = tenantDb(auth.tid)
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
    const { data: svc } = await db
      .from('service_types')
      .select('name, default_duration_hours, default_hourly_rate')
      .eq('id', body.service_type_id)
      .single()
    if (!svc) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }
    serviceType = svc.name
    price = svc.default_hourly_rate * svc.default_duration_hours * 100
  }

  // Recurring-service discount ("save 20%"): weekly 20% off, biweekly/monthly 10% off.
  // The portal booking form's own <option value="monthly"> sends the bare literal
  // 'monthly' -- RecurringType (lib/recurring.ts) has no bare 'monthly', only
  // monthly_date/monthly_weekday, so it's normalized here the same way
  // client/recurring's schedule-creation path already does. This route never
  // creates a recurring_schedules row (no cron dependency), but the raw value
  // does reach formatRecurringLabel's display fallback -- normalizing keeps
  // "Schedule: Monthly" instead of the unformatted "Schedule: monthly".
  const rawRecurringType = body.recurring_type && body.recurring_type !== 'none' ? String(body.recurring_type) : null
  const recurringType = rawRecurringType === 'monthly' ? 'monthly_date' : rawRecurringType
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
