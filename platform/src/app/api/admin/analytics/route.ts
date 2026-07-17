import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { etYMD, etMidnightUtc } from '@/lib/dates'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  // Bookings stats
  let bookingsQuery = supabaseAdmin.from('bookings').select('status, start_time, price, payment_status, created_at')
  if (tenantId) bookingsQuery = bookingsQuery.eq('tenant_id', tenantId)
  const { data: bookings } = await bookingsQuery

  // Clients stats
  let clientsQuery = supabaseAdmin.from('clients').select('status, created_at')
  if (tenantId) clientsQuery = clientsQuery.eq('tenant_id', tenantId)
  const { data: clients } = await clientsQuery

  // Team stats
  let teamQuery = supabaseAdmin.from('team_members').select('status')
  if (tenantId) teamQuery = teamQuery.eq('tenant_id', tenantId)
  const { data: team } = await teamQuery

  // bookings.created_at and clients.created_at are both TIMESTAMPTZ (aware)
  // -- the old `new Date().getFullYear()/getMonth()` read the SERVER's
  // local calendar (UTC on Vercel), a full day ahead of ET for ~4-5h every
  // evening, misplacing "this month"/"last month" boundaries during that
  // window. Fixed with true-UTC instants of ET-calendar month boundaries
  // (an aware column needs a real UTC instant, unlike bookings.start_time's
  // naive-ET string columns fixed elsewhere this session).
  const now = new Date()
  const { y: ty, m: tm } = etYMD(now)
  const thisMonthStart = etMidnightUtc(ty, tm, 1).toISOString()
  const lastMonthObj = new Date(Date.UTC(ty, tm - 2, 1))
  const lastMonthStart = etMidnightUtc(lastMonthObj.getUTCFullYear(), lastMonthObj.getUTCMonth() + 1, 1).toISOString()

  const allBookings = bookings || []
  const allClients = clients || []

  const thisMonthBookings = allBookings.filter(b => b.created_at >= thisMonthStart)
  const lastMonthBookings = allBookings.filter(b => b.created_at >= lastMonthStart && b.created_at < thisMonthStart)
  const thisMonthClients = allClients.filter(c => c.created_at >= thisMonthStart)
  const lastMonthClients = allClients.filter(c => c.created_at >= lastMonthStart && c.created_at < thisMonthStart)

  const paidBookings = allBookings.filter(b => b.payment_status === 'paid')
  const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.price || 0), 0)
  const thisMonthRevenue = paidBookings
    .filter(b => b.created_at >= thisMonthStart)
    .reduce((sum, b) => sum + (b.price || 0), 0)

  return NextResponse.json({
    overview: {
      totalBookings: allBookings.length,
      totalClients: allClients.length,
      totalTeam: team?.length || 0,
      totalRevenue,
    },
    thisMonth: {
      bookings: thisMonthBookings.length,
      clients: thisMonthClients.length,
      revenue: thisMonthRevenue,
    },
    lastMonth: {
      bookings: lastMonthBookings.length,
      clients: lastMonthClients.length,
    },
    bookingsByStatus: {
      scheduled: allBookings.filter(b => b.status === 'scheduled').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
      cancelled: allBookings.filter(b => b.status === 'cancelled').length,
      no_show: allBookings.filter(b => b.status === 'no_show').length,
    },
  })
}
