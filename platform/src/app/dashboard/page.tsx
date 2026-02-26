import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'

export default async function DashboardPage() {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  // Get counts for this tenant
  const [
    { count: clientCount },
    { count: bookingCount },
    { count: teamCount },
    { count: scheduleCount },
  ] = await Promise.all([
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).in('status', ['scheduled', 'in_progress']),
    supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
    supabaseAdmin.from('recurring_schedules').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
  ])

  const stats = [
    { label: 'Active Clients', value: clientCount || 0 },
    { label: 'Upcoming Bookings', value: bookingCount || 0 },
    { label: 'Team Members', value: teamCount || 0 },
    { label: 'Active Schedules', value: scheduleCount || 0 },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h2>
      <p className="text-gray-500 text-sm mb-8">Welcome back, {tenant.name}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
