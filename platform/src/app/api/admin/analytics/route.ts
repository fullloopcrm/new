import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

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

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

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
