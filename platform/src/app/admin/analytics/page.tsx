import { supabaseAdmin } from '@/lib/supabase'

export default async function AnalyticsPage() {
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('industry, plan, status, team_size, created_at')

  const allTenants = tenants || []

  // Distributions
  const industryMap: Record<string, number> = {}
  const planMap: Record<string, number> = {}
  const teamMap: Record<string, number> = {}
  const statusMap: Record<string, number> = {}

  allTenants.forEach((t) => {
    const ind = t.industry || 'unknown'
    industryMap[ind] = (industryMap[ind] || 0) + 1
    const plan = t.plan || 'free'
    planMap[plan] = (planMap[plan] || 0) + 1
    const team = t.team_size || 'solo'
    teamMap[team] = (teamMap[team] || 0) + 1
    statusMap[t.status] = (statusMap[t.status] || 0) + 1
  })

  const industries = Object.entries(industryMap).sort((a, b) => b[1] - a[1])

  // Signups by month (last 6 months)
  const months: { label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const count = allTenants.filter((t) => {
      const created = new Date(t.created_at)
      return created >= monthStart && created <= monthEnd
    }).length
    months.push({ label, count })
  }
  const maxMonth = Math.max(...months.map((m) => m.count), 1)

  const [
    { count: totalBookings },
    { count: paidBookings },
  ] = await Promise.all([
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['paid', 'completed']),
  ])

  const planColors: Record<string, string> = {
    pro: 'bg-blue-500/20 text-blue-400',
    starter: 'bg-green-500/20 text-green-400',
    free: 'bg-slate-600 text-slate-400',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    setup: 'bg-blue-500/20 text-blue-400',
    suspended: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-sm text-slate-400">Aggregate data across all businesses</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Businesses', value: allTenants.length, color: 'border-l-gray-500' },
          { label: 'Total Bookings', value: totalBookings || 0, color: 'border-l-blue-500' },
          { label: 'Paid Bookings', value: paidBookings || 0, color: 'border-l-green-500' },
          { label: 'Industries', value: industries.length, color: 'border-l-purple-500' },
        ].map((s) => (
          <div key={s.label} className={`bg-slate-800 rounded-xl border border-slate-700 border-l-4 ${s.color} p-5`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* SIGNUP CHART */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-sm mb-4">Signups (Last 6 Months)</h2>
        <div className="flex items-end gap-3 h-32">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-slate-400 font-medium">{m.count}</span>
              <div
                className="w-full bg-teal-600 rounded-t transition-all"
                style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count > 0 ? '4px' : '0' }}
              />
              <span className="text-[10px] text-slate-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BREAKDOWNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Industry */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-sm">By Industry</h2>
          </div>
          <div className="p-4 space-y-2">
            {industries.slice(0, 10).map(([ind, count]) => {
              const pct = allTenants.length > 0 ? (count / allTenants.length * 100) : 0
              return (
                <div key={ind}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-400 capitalize truncate">{ind.replace(/_/g, ' ')}</span>
                    <span className="font-medium ml-2">{count}</span>
                  </div>
                  <div className="h-1 bg-slate-700 rounded-full">
                    <div className="h-1 bg-teal-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {industries.length === 0 && <p className="text-sm text-slate-400">No data</p>}
          </div>
        </div>

        {/* Plan */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-sm">By Plan</h2>
          </div>
          <div className="p-4 space-y-2.5">
            {Object.entries(planMap).sort((a, b) => b[1] - a[1]).map(([p, count]) => (
              <div key={p} className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColors[p] || 'bg-slate-600 text-slate-400'}`}>{p}</span>
                <span className="font-medium text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Size */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-sm">By Team Size</h2>
          </div>
          <div className="p-4 space-y-2.5">
            {Object.entries(teamMap).sort((a, b) => b[1] - a[1]).map(([size, count]) => (
              <div key={size} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{size === 'solo' ? 'Just Me' : size}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-sm">By Status</h2>
          </div>
          <div className="p-4 space-y-2.5">
            {Object.entries(statusMap).sort((a, b) => b[1] - a[1]).map(([s, count]) => (
              <div key={s} className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[s] || 'bg-slate-600 text-slate-400'}`}>{s}</span>
                <span className="font-medium text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
