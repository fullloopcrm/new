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

  // Bounded at 5000 -- a hard cap against a runaway/unbounded fetch, not an
  // expected real tenant size. A tenant genuinely exceeding this in clients
  // or bookings would need this endpoint rebuilt as a real SQL aggregation
  // instead of an in-memory join; that's a separate, larger fix.
  const CLIENT_ANALYTICS_ROW_CAP = 5000

  try {
    // Get all clients. NOTE: clients.referrer_id is a real, populated column
    // (confirmed live 2026-07-31, fin-05 re-check) but there is no DB-level
    // FK constraint from clients -> referrers -- only referrals has one, per
    // PostgREST's own error hint. That means the embedded-resource syntax
    // this route used to use here (`select('*, referrers(name, ref_code)')`)
    // returns a PGRST200 error on every real call in production ("Could not
    // find a relationship between 'clients' and 'referrers' in the schema
    // cache"). The old code never checked the destructured `error`, so
    // `clients` silently resolved to `undefined` and every response below
    // silently reported all-zero/empty analytics -- confirmed 100% broken
    // in prod despite the pagination test suite passing (its mock always
    // resolves `{ data: [], error: null }` regardless of the select shape,
    // so it can't catch an invalid embed). Fixed by fetching referrers
    // separately and joining by id in application code, same pattern this
    // file already uses for bookings -> clients below.
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('tenant_id', tenant.tenantId)
      .order('created_at', { ascending: false })
      .limit(CLIENT_ANALYTICS_ROW_CAP)
    if (clientsError) throw clientsError

    const referrerIds = [...new Set((clients || []).map(c => c.referrer_id).filter(Boolean))]
    const referrersById = new Map<string, { name: string; ref_code: string }>()
    if (referrerIds.length > 0) {
      const { data: referrers, error: referrersError } = await supabaseAdmin
        .from('referrers')
        .select('id, name, ref_code')
        .eq('tenant_id', tenant.tenantId)
        .in('id', referrerIds)
      if (referrersError) throw referrersError
      for (const r of referrers || []) referrersById.set(r.id, { name: r.name, ref_code: r.ref_code })
    }

    // Get all completed bookings
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(CLIENT_ANALYTICS_ROW_CAP)

    // Get cancelled bookings for cancellation rate
    const { data: cancelledBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'cancelled')
      .limit(CLIENT_ANALYTICS_ROW_CAP)

    const { data: allBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenant.tenantId)
      .limit(CLIENT_ANALYTICS_ROW_CAP)

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
        referrer_name: (client.referrer_id ? referrersById.get(client.referrer_id)?.name : null) || null,
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
