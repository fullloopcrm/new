import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export default async function AdminOverviewPage() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    { count: totalTenants },
    { count: activeTenants },
    { count: newThisWeek },
    { count: totalBookings },
    { count: totalClients },
    { count: totalTeamMembers },
    { data: recentTenants },
    { data: recentAnnouncements },
    { data: revenueData },
    { count: pendingRequests },
    { data: recentRequests },
  ] = await Promise.all([
    supabaseAdmin.from('tenants').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('tenants').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tenants').select('id, name, industry, status, plan, created_at, last_active_at').order('created_at', { ascending: false }).limit(8),
    supabaseAdmin.from('platform_announcements').select('id, title, type, published, created_at').order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('bookings').select('final_price').in('status', ['paid', 'completed']).gte('created_at', monthAgo.toISOString()),
    supabaseAdmin.from('partner_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('partner_requests').select('id, business_name, service_category, city, state, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
  ])

  const monthlyRevenue = (revenueData || []).reduce((sum, b) => sum + (b.final_price || 0), 0)

  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

  function timeAgo(dateStr: string | null): string {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Platform Overview</h1>
        <p className="text-sm text-slate-400">All businesses across Full Loop CRM</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Businesses', value: totalTenants || 0, color: 'border-l-gray-500' },
          { label: 'Active', value: activeTenants || 0, color: 'border-l-green-500' },
          { label: 'New This Week', value: newThisWeek || 0, color: 'border-l-teal-500' },
          { label: '30-Day Revenue', value: fmt(monthlyRevenue), color: 'border-l-purple-500' },
          { label: 'Pending Requests', value: pendingRequests || 0, color: 'border-l-yellow-500' },
        ].map((s) => (
          <div key={s.label} className={`bg-slate-800 rounded-xl border border-slate-700 border-l-4 ${s.color} p-5`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold font-mono mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Bookings', value: totalBookings || 0, href: '/admin/analytics' },
          { label: 'Clients', value: totalClients || 0 },
          { label: 'Team Members', value: totalTeamMembers || 0 },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              {s.href && <Link href={s.href} className="text-[10px] text-teal-400 hover:text-teal-300">View</Link>}
            </div>
            <p className="text-xl font-bold font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* RECENT SIGNUPS */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-sm">Recent Signups</h2>
            <Link href="/admin/businesses" className="text-xs text-teal-400 hover:text-teal-300">View All</Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {(recentTenants || []).map((t) => (
              <Link key={t.id} href={`/admin/businesses/${t.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{t.industry?.replace(/_/g, ' ')}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                    t.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    t.status === 'setup' ? 'bg-teal-500/20 text-teal-400' :
                    'bg-slate-600 text-slate-400'
                  }`}>
                    {t.status}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(t.last_active_at)}</p>
                </div>
              </Link>
            ))}
            {(!recentTenants || recentTenants.length === 0) && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No businesses yet</div>
            )}
          </div>
        </div>

        {/* RECENT ANNOUNCEMENTS */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-sm">Recent Announcements</h2>
            <Link href="/admin/announcements" className="text-xs text-teal-400 hover:text-teal-300">Manage</Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {(recentAnnouncements || []).map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-slate-400 capitalize">{a.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${a.published ? 'bg-green-400' : 'bg-slate-600'}`} />
                  <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {(!recentAnnouncements || recentAnnouncements.length === 0) && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No announcements yet</div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT REQUESTS */}
      <div className="bg-slate-800 border border-slate-700 border-l-4 border-l-yellow-500 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">Recent Requests</h2>
            {(pendingRequests || 0) > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-400">
                {pendingRequests} pending
              </span>
            )}
          </div>
          <Link href="/admin/requests" className="text-xs text-teal-400 hover:text-teal-300">View All</Link>
        </div>
        <div className="divide-y divide-slate-700/50">
          {(recentRequests || []).map((r) => (
            <Link key={r.id} href="/admin/requests"
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/30 transition-colors">
              <div>
                <p className="text-sm font-medium">{r.business_name}</p>
                <p className="text-xs text-slate-400 capitalize">{r.service_category?.replace(/_/g, ' ')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{r.city}, {r.state}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(r.created_at)}</p>
              </div>
            </Link>
          ))}
          {(!recentRequests || recentRequests.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No pending requests</div>
          )}
        </div>
      </div>
    </div>
  )
}
