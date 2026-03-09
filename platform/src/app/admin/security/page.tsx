import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

const eventColors: Record<string, string> = {
  suspicious_login: 'bg-red-500/20 text-red-400',
  api_key_change: 'bg-yellow-500/20 text-yellow-400',
  status_change: 'bg-blue-500/20 text-blue-400',
  plan_change: 'bg-blue-500/20 text-blue-400',
  login: 'bg-green-500/20 text-green-400',
  impersonation: 'bg-purple-500/20 text-purple-400',
}

export default async function AdminSecurityPage() {
  const { data: events } = await supabaseAdmin
    .from('security_events')
    .select('*, tenants(name, slug)')
    .order('created_at', { ascending: false })
    .limit(100)

  const typeCounts: Record<string, number> = {}
  for (const e of events || []) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
  }

  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Security Events</h1>
        <p className="text-sm text-gray-500">Last 100 events across all businesses</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {typeEntries.length > 0 ? typeEntries.slice(0, 4).map(([type, count]) => (
          <div key={type} className={`bg-gray-900 rounded-xl border border-gray-800 border-l-4 ${
            type === 'suspicious_login' ? 'border-l-red-500' :
            type === 'api_key_change' ? 'border-l-yellow-500' :
            type === 'login' ? 'border-l-green-500' :
            'border-l-blue-500'
          } p-5`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{type.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold mt-1">{count}</p>
          </div>
        )) : (
          <div className="col-span-4 bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-sm text-gray-500">No security events recorded yet</p>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {(events || []).map((e) => {
              const tenant = e.tenants as unknown as { name: string; slug: string } | null
              return (
                <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    {tenant ? (
                      <Link href={`/admin/businesses/${e.tenant_id}`} className="text-blue-400 hover:text-blue-300 text-sm">
                        {tenant.name}
                      </Link>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${eventColors[e.type] || 'bg-gray-700 text-gray-400'}`}>
                      {e.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate text-sm">{e.description}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{e.ip_address || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </td>
                </tr>
              )
            })}
            {(!events || events.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">No events recorded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
