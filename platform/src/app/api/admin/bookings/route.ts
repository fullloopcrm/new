import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { etYMD } from '@/lib/dates'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const tenantId = url.searchParams.get('tenant_id')
  const status = url.searchParams.get('status')
  const clientId = url.searchParams.get('client_id')
  const teamMemberId = url.searchParams.get('team_member_id')
  const dateFrom = url.searchParams.get('date_from')
  const dateTo = url.searchParams.get('date_to')
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('bookings')
    .select('*, clients(name, phone, address), team_members!bookings_team_member_id_fkey(name, phone), tenants(name)', { count: 'exact' })
    .order('start_time', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (status) query = query.eq('status', status)
  if (clientId) query = query.eq('client_id', clientId)
  if (teamMemberId) query = query.eq('team_member_id', teamMemberId)
  if (dateFrom) query = query.gte('start_time', dateFrom)
  if (dateTo) query = query.lte('start_time', dateTo)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Summary stats
  // bookings.start_time is stored naive-ET (no tz, literally what was typed
  // in). The old `new Date().getFullYear()/getMonth()/getDate()` read the
  // SERVER's local calendar (UTC on Vercel), a full day ahead of ET for
  // ~4-5h every evening -- misplacing the "today"/"this week" stat counts
  // against the naive-ET column during that window. Same established
  // pattern as dashboard/admin-calendar/bookings-stats this session.
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const { y: ty, m: tm, d: td } = etYMD(now)
  const todayStart = `${ty}-${pad(tm)}-${pad(td)}T00:00:00`
  const weekStartObj = new Date(Date.UTC(ty, tm - 1, td - 7))
  const weekStart = `${weekStartObj.getUTCFullYear()}-${pad(weekStartObj.getUTCMonth() + 1)}-${pad(weekStartObj.getUTCDate())}T00:00:00`

  let statsQuery = supabaseAdmin
    .from('bookings')
    .select('status, start_time', { count: 'exact' })
  if (tenantId) statsQuery = statsQuery.eq('tenant_id', tenantId)

  const { data: allBookings } = await statsQuery

  const stats = {
    total: allBookings?.length || 0,
    today: allBookings?.filter(b => b.start_time >= todayStart).length || 0,
    thisWeek: allBookings?.filter(b => b.start_time >= weekStart).length || 0,
    scheduled: allBookings?.filter(b => b.status === 'scheduled').length || 0,
    completed: allBookings?.filter(b => b.status === 'completed').length || 0,
    cancelled: allBookings?.filter(b => b.status === 'cancelled').length || 0,
  }

  return NextResponse.json({ bookings: data, total: count, stats })
}
