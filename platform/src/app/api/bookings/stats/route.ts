import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { nowNaiveET, etToday, addCalendarDays, formatNaiveET } from '@/lib/recurring'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('finance.view')
  if (authError) return authError
  const { tenantId } = tenant

  const now = new Date()
  // payment_date is genuinely UTC (written via `new Date().toISOString()`,
  // like check_in_time/check_out_time) -- monthStartUTC stays a true-UTC
  // boundary for that filter.
  const monthStartUTC = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  // start_time/end_time are naive-ET (computeNaiveVisitWindow's documented
  // convention). The old monthStart/weekEnd/now.toISOString() boundaries here
  // read the server's UTC calendar/instant instead, silently shifting every
  // cutoff by the ET/UTC gap (4-5h) -- both the instant-"now" bug (see
  // nowNaiveET's header) and its day-boundary counterpart.
  const today = etToday()
  const nowET = nowNaiveET()
  const weekEndET = formatNaiveET(addCalendarDays(today, 7))
  const monthStartET = formatNaiveET({ ...today, day: 1 })

  const [
    { count: upcoming },
    { count: thisWeek },
    { count: completed },
    { data: paidBookings },
  ] = await Promise.all([
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).in('status', ['scheduled', 'confirmed']),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).gte('start_time', nowET).lt('start_time', weekEndET),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).in('status', ['completed', 'paid']).gte('start_time', monthStartET),
    supabaseAdmin.from('bookings').select('price')
      .eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('payment_date', monthStartUTC),
  ])

  const revenue = (paidBookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

  return NextResponse.json({
    upcoming: upcoming || 0,
    thisWeek: thisWeek || 0,
    completed: completed || 0,
    revenue,
  })
}
