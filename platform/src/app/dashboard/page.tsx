import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import SetupChecklist from './setup-checklist'
import AnnouncementBanner from './announcement-banner'
import Link from 'next/link'
import DashboardMap from './dashboard-map'

export default async function DashboardPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
  const next14 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14).toISOString()

  const [
    { count: clientCount },
    { count: newClientsThisMonth },
    { count: teamCount },
    { count: scheduleCount },
    { count: upcomingBookingCount },
    { data: todayRevBookings },
    { data: weekRevBookings },
    { data: monthRevBookings },
    { data: yearRevBookings },
    { data: todaysJobs },
    { data: upcomingJobs },
    { count: completedThisMonth },
    { count: cancelledThisMonth },
    { data: owedBookings },
    { data: scheduledRevBookings },
    { count: yearTotalBookings },
  ] = await Promise.all([
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('created_at', monthStart),
    supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
    supabaseAdmin.from('recurring_schedules').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).in('status', ['scheduled', 'confirmed']),
    // Revenue queries - paid bookings by period
    supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenant.id).eq('payment_status', 'paid').gte('payment_date', todayStart).lt('payment_date', todayEnd),
    supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenant.id).eq('payment_status', 'paid').gte('payment_date', weekStart),
    supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenant.id).eq('payment_status', 'paid').gte('payment_date', monthStart),
    supabaseAdmin.from('bookings').select('price').eq('tenant_id', tenant.id).eq('payment_status', 'paid').gte('payment_date', yearStart),
    // Today's jobs
    supabaseAdmin.from('bookings').select('id, start_time, end_time, status, price, notes, clients(name, phone), team_members(name), service_types(name)').eq('tenant_id', tenant.id).gte('start_time', todayStart).lt('start_time', todayEnd).order('start_time', { ascending: true }).limit(20),
    // Upcoming 14 days
    supabaseAdmin.from('bookings').select('id, start_time, status, price, clients(name), team_members(name), service_types(name)').eq('tenant_id', tenant.id).gte('start_time', todayEnd).lt('start_time', next14).in('status', ['scheduled', 'confirmed']).order('start_time', { ascending: true }).limit(20),
    // Completed this month
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'completed').gte('start_time', monthStart),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'cancelled').gte('start_time', monthStart),
    // Owed: completed bookings with pending/null payment
    supabaseAdmin.from('bookings').select('price, payment_status').eq('tenant_id', tenant.id).eq('status', 'completed').or('payment_status.eq.pending,payment_status.is.null'),
    // Monthly scheduled revenue for current year
    supabaseAdmin.from('bookings').select('start_time, price').eq('tenant_id', tenant.id).in('status', ['scheduled', 'confirmed']).gte('start_time', yearStart),
    // Total bookings this year (all statuses)
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('start_time', yearStart),
  ])

  const sumRevenue = (bookings: { price: number }[] | null) =>
    (bookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

  const todayRev = sumRevenue(todayRevBookings)
  const weekRev = sumRevenue(weekRevBookings)
  const monthRev = sumRevenue(monthRevBookings)
  const yearRev = sumRevenue(yearRevBookings)
  const owedRev = sumRevenue(owedBookings as { price: number }[] | null)

  // Group scheduled bookings by month for the scheduled revenue row
  const scheduledByMonth: Record<number, { amount: number; count: number }> = {}
  for (let m = 0; m < 12; m++) {
    scheduledByMonth[m] = { amount: 0, count: 0 }
  }

  // Also compute scheduled today, week, month
  const scheduledToday = { amount: 0, count: 0 }
  const scheduledWeek = { amount: 0, count: 0 }
  const scheduledMonth = { amount: 0, count: 0 }

  for (const b of (scheduledRevBookings || []) as { start_time: string; price: number }[]) {
    const d = new Date(b.start_time)
    const month = d.getMonth()
    const price = b.price || 0
    scheduledByMonth[month].amount += price
    scheduledByMonth[month].count += 1

    // Check if today
    if (b.start_time >= todayStart && b.start_time < todayEnd) {
      scheduledToday.amount += price
      scheduledToday.count += 1
    }
    // Check if this week
    if (b.start_time >= todayStart && b.start_time < weekEnd) {
      scheduledWeek.amount += price
      scheduledWeek.count += 1
    }
    // Check if this month
    if (b.start_time >= monthStart && b.start_time < monthEnd) {
      scheduledMonth.amount += price
      scheduledMonth.count += 1
    }
  }

  function fmt(cents: number) {
    return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const showChecklist = !tenant.setup_dismissed

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type BookingRow = {
    id: string
    start_time: string
    end_time?: string
    status: string
    price: number
    notes?: string
    clients: { name: string; phone?: string } | null
    team_members: { name: string } | null
    service_types: { name: string } | null
  }

  function normalizeBooking(row: Record<string, unknown>): BookingRow {
    return {
      ...row,
      clients: Array.isArray(row.clients) ? row.clients[0] || null : row.clients,
      team_members: Array.isArray(row.team_members) ? row.team_members[0] || null : row.team_members,
      service_types: Array.isArray(row.service_types) ? row.service_types[0] || null : row.service_types,
    } as BookingRow
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500/20 text-blue-400',
    confirmed: 'bg-indigo-500/20 text-indigo-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    paid: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-400',
    no_show: 'bg-gray-700 text-gray-400',
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = now.getMonth()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-gray-500">Welcome back, {tenant.name}</p>
        </div>
        <Link href="/dashboard/bookings" className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
          + New Booking
        </Link>
      </div>

      <AnnouncementBanner />
      {showChecklist && <SetupChecklist />}

      {/* REVENUE CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Today', value: todayRev, count: todayRevBookings?.length || 0, color: 'border-l-green-500', sub: 'paid' },
          { label: 'This Week', value: weekRev, count: weekRevBookings?.length || 0, color: 'border-l-blue-500', sub: 'paid' },
          { label: 'This Month', value: monthRev, count: monthRevBookings?.length || 0, color: 'border-l-purple-500', sub: 'paid' },
        ].map((card) => (
          <div key={card.label} className={`bg-gray-900 rounded-xl border border-gray-800 border-l-4 ${card.color} p-5`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{fmt(card.value)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.count} {card.sub} job{card.count !== 1 ? 's' : ''}</p>
          </div>
        ))}

        {/* YTD Card - dual display */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 border-l-4 border-l-cyan-500 p-5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Year to Date</p>
          <p className="text-2xl font-bold text-white mt-1">
            <span className="text-lg text-gray-300">{fmt(monthRev)}</span>
            <span className="text-gray-600 mx-1">/</span>
            {fmt(yearRev)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{now.getFullYear()} ({yearTotalBookings || 0} jobs booked)</p>
        </div>

        {/* Owed Card */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 border-l-4 border-l-orange-500 p-5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Owed</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">{fmt(owedRev)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{(owedBookings || []).length} unpaid job{(owedBookings || []).length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* SCHEDULED (UPCOMING) REVENUE ROW */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Scheduled Revenue</h3>
          <span className="text-[11px] text-gray-500">Upcoming confirmed/scheduled jobs</span>
        </div>
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {/* Today, Week, Month summary cards */}
            {[
              { label: 'Today', amount: scheduledToday.amount, count: scheduledToday.count, highlight: true },
              { label: 'Week', amount: scheduledWeek.amount, count: scheduledWeek.count, highlight: false },
              { label: 'Month', amount: scheduledMonth.amount, count: scheduledMonth.count, highlight: false },
            ].map((card) => (
              <div
                key={card.label}
                className={`min-w-[100px] rounded-lg px-3 py-2.5 border ${
                  card.highlight
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : 'bg-gray-800/50 border-gray-700/50 text-gray-300'
                }`}
              >
                <p className="text-[10px] uppercase tracking-wide opacity-70">{card.label}</p>
                <p className="text-base font-bold mt-0.5">{fmt(card.amount)}</p>
                <p className="text-[10px] opacity-60">{card.count} job{card.count !== 1 ? 's' : ''}</p>
              </div>
            ))}

            {/* Separator */}
            <div className="w-px bg-gray-700/50 self-stretch mx-1" />

            {/* Monthly cards Jan - Dec */}
            {monthNames.map((name, idx) => {
              const data = scheduledByMonth[idx]
              const isCurrent = idx === currentMonth
              return (
                <div
                  key={name}
                  className={`min-w-[100px] rounded-lg px-3 py-2.5 border ${
                    isCurrent
                      ? 'bg-green-500/10 border-green-500/40 text-green-400'
                      : 'bg-gray-800/50 border-gray-700/50 text-gray-300'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wide opacity-70">{name}</p>
                  <p className="text-base font-bold mt-0.5">{fmt(data.amount)}</p>
                  <p className="text-[10px] opacity-60">{data.count} job{data.count !== 1 ? 's' : ''}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Upcoming', value: upcomingBookingCount || 0, icon: '◫', href: '/dashboard/bookings' },
          { label: 'Completed', value: completedThisMonth || 0, icon: '✓', sub: 'this month' },
          { label: 'Cancelled', value: cancelledThisMonth || 0, icon: '✕', sub: 'this month' },
          { label: 'Clients', value: clientCount || 0, icon: '◉', href: '/dashboard/clients' },
          { label: 'New Clients', value: newClientsThisMonth || 0, icon: '◇', sub: 'this month' },
          { label: 'Team', value: teamCount || 0, icon: '◎', href: '/dashboard/team' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{s.icon}</span>
              {s.href && <Link href={s.href} className="text-[10px] text-blue-500 hover:underline">View</Link>}
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[11px] text-gray-400">{s.label}{s.sub ? ` · ${s.sub}` : ''}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* TODAY'S JOBS */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h3 className="font-semibold text-white text-sm">Today&apos;s Jobs</h3>
            <span className="text-xs text-gray-400">{(todaysJobs || []).length} job{(todaysJobs || []).length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-800/50">
            {(!todaysJobs || todaysJobs.length === 0) ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No jobs scheduled for today
              </div>
            ) : ((todaysJobs || []) as Record<string, unknown>[]).map(normalizeBooking).map((job) => (
              <Link key={job.id} href={`/dashboard/bookings/${job.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{job.clients?.name || 'Unknown'}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColors[job.status] || 'bg-gray-700 text-gray-400'}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">
                      {new Date(job.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {job.end_time && ` – ${new Date(job.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                    </p>
                    {job.team_members?.name && <span className="text-xs text-gray-400">· {job.team_members.name}</span>}
                    {job.service_types?.name && <span className="text-xs text-gray-400">· {job.service_types.name}</span>}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-medium text-white">{job.price ? fmt(job.price) : '—'}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* UPCOMING 14 DAYS */}
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h3 className="font-semibold text-white text-sm">Upcoming 14 Days</h3>
            <Link href="/dashboard/bookings" className="text-xs text-blue-500 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-gray-800/50">
            {(!upcomingJobs || upcomingJobs.length === 0) ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No upcoming bookings
              </div>
            ) : ((upcomingJobs || []) as Record<string, unknown>[]).map(normalizeBooking).map((job) => {
              const jobDate = new Date(job.start_time)
              const isThisWeek = jobDate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).getTime()
              return (
                <Link key={job.id} href={`/dashboard/bookings/${job.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{job.clients?.name || 'Unknown'}</p>
                      {isThisWeek && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">This week</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {jobDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {jobDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      {job.team_members?.name && <span className="text-xs text-gray-400">· {job.team_members.name}</span>}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm text-gray-500">{job.service_types?.name || ''}</p>
                    <p className="text-xs text-gray-400">{job.price ? fmt(job.price) : ''}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* JOB MAP */}
      <div className="mb-6">
        <DashboardMap />
      </div>

      {/* QUICK LINKS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'New Client', href: '/dashboard/clients', icon: '◉', desc: 'Add a client' },
          { label: 'Campaigns', href: '/dashboard/campaigns', icon: '◆', desc: 'Send email or SMS' },
          { label: 'Schedules', href: '/dashboard/schedules', icon: '◈', desc: `${scheduleCount || 0} active` },
          { label: 'Finance', href: '/dashboard/finance', icon: '$', desc: 'Revenue & payroll' },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
            <span className="text-lg">{link.icon}</span>
            <p className="text-sm font-medium text-white mt-1.5">{link.label}</p>
            <p className="text-[11px] text-gray-400">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
