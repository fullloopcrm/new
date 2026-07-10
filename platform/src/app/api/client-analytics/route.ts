import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  // FL auth: authenticates the caller (admin_token / Clerk) AND scopes to their
  // tenant. Replaced the legacy nycmaid admin_session gate (dead: admin_users
  // table removed, /api/auth/login orphaned) — getCurrentTenant alone did NOT
  // authenticate, it only resolved the domain's tenant from the signed header.
  const { tenant, error } = await requirePermission('clients.view')
  if (error) return error

  try {
    // Get all clients with referrer info
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('*, referrers(name, ref_code)')
      .eq('tenant_id', tenant.tenantId)
      .order('created_at', { ascending: false })

    // Get all completed bookings
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })

    // Get cancelled bookings for cancellation rate
    const { data: cancelledBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'cancelled')

    const { data: allBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenant.tenantId)

    const now = new Date()

    // Calculate per-client stats
    const clientStats = clients?.map(client => {
      const clientBookings = bookings?.filter(b => b.client_id === client.id) || []
      const totalSpent = clientBookings.reduce((sum, b) => sum + (b.price || 0), 0)
      const bookingCount = clientBookings.length
      
      const lastBooking = clientBookings[0]?.start_time || null
      let daysSinceLastBooking = null
      if (lastBooking) {
        daysSinceLastBooking = Math.floor((now.getTime() - new Date(lastBooking).getTime()) / (1000 * 60 * 60 * 24))
      }

      let avgDaysBetweenBookings = null
      if (clientBookings.length >= 2) {
        const sortedBookings = [...clientBookings].sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
        let totalDays = 0
        for (let i = 1; i < sortedBookings.length; i++) {
          const days = Math.floor(
            (new Date(sortedBookings[i].start_time).getTime() - new Date(sortedBookings[i-1].start_time).getTime()) 
            / (1000 * 60 * 60 * 24)
          )
          totalDays += days
        }
        avgDaysBetweenBookings = Math.round(totalDays / (sortedBookings.length - 1))
      }

      let status: 'potential' | 'new' | 'active' | 'inactive' = 'new'
      if (client.status === 'potential') {
        status = 'potential'
      } else if (bookingCount === 0) {
        status = 'new'
      } else if (daysSinceLastBooking !== null) {
        if (daysSinceLastBooking <= 60) status = 'active'
        else status = 'inactive'
      }

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        created_at: client.created_at,
        referrer_id: client.referrer_id,
        referrer_name: client.referrers?.name || null,
        totalSpent,
        bookingCount,
        lastBooking,
        daysSinceLastBooking,
        avgDaysBetweenBookings,
        status
      }
    }) || []

    // Overall metrics
    const totalClients = clients?.length || 0
    const totalRevenue = clientStats.reduce((sum, c) => sum + c.totalSpent, 0)
    const avgLTV = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0

    const potentialClients = clientStats.filter(c => c.status === 'potential').length
    const newClients = clientStats.filter(c => c.status === 'new').length
    const activeClients = clientStats.filter(c => c.status === 'active').length
    const inactiveClients = clientStats.filter(c => c.status === 'inactive').length

    const clientsWithMultipleBookings = clientStats.filter(c => c.bookingCount >= 2).length
    const clientsWhoBooked = clientStats.filter(c => c.bookingCount >= 1).length
    const retentionRate = clientsWhoBooked > 0 ? Math.round((clientsWithMultipleBookings / clientsWhoBooked) * 100) : 0

    const churnRate = totalClients > 0 ? Math.round((inactiveClients / totalClients) * 100) : 0

    const repeatClients = clientStats.filter(c => c.avgDaysBetweenBookings !== null)
    const avgBookingFrequency = repeatClients.length > 0
      ? Math.round(repeatClients.reduce((sum, c) => sum + (c.avgDaysBetweenBookings || 0), 0) / repeatClients.length)
      : null

    const referredClients = clientStats.filter(c => c.referrer_id).length
    const referralRate = totalClients > 0 ? Math.round((referredClients / totalClients) * 100) : 0

    const cancellationRate = (allBookings?.length || 0) > 0 
      ? Math.round(((cancelledBookings?.length || 0) / (allBookings?.length || 1)) * 100)
      : 0

    const topClients = [...clientStats]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    const atRiskList = clientStats
      .filter(c => c.status === 'inactive')
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 10)

    const revenueByReferrer: Record<string, { name: string, clients: number, revenue: number }> = {}
    clientStats.filter(c => c.referrer_name).forEach(c => {
      const key = c.referrer_id!
      if (!revenueByReferrer[key]) {
        revenueByReferrer[key] = { name: c.referrer_name!, clients: 0, revenue: 0 }
      }
      revenueByReferrer[key].clients++
      revenueByReferrer[key].revenue += c.totalSpent
    })

    return NextResponse.json({
      overview: {
        totalClients,
        totalRevenue,
        avgLTV,
        retentionRate,
        churnRate,
        avgBookingFrequency,
        referralRate,
        cancellationRate
      },
      statusCounts: {
        potential: potentialClients,
        new: newClients,
        active: activeClients,
        inactive: inactiveClients
      },
      topClients,
      atRiskClients: atRiskList,
      revenueByReferrer: Object.values(revenueByReferrer).sort((a, b) => b.revenue - a.revenue),
      allClients: clientStats
    })
  } catch (err) {
    console.error('Client Analytics error:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
