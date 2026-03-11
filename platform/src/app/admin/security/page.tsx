import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

const eventColors: Record<string, string> = {
  suspicious_login: 'bg-red-50 text-red-600 border border-red-200',
  api_key_change: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
  status_change: 'bg-teal-50 text-teal-600 border border-teal-200',
  plan_change: 'bg-teal-50 text-teal-600 border border-teal-200',
  login: 'bg-green-50 text-green-600 border border-green-200',
  impersonation: 'bg-purple-50 text-purple-600 border border-purple-200',
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
        <h1 className="text-slate-900 font-heading text-2xl font-bold">Security Events</h1>
        <p className="text-sm text-slate-500">Last 100 events across all businesses</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 border-b border-slate-200 pb-6">
        {typeEntries.length > 0 ? typeEntries.slice(0, 4).map(([type, count]) => (
          <div key={type} className={`border-l-4 ${
            type === 'suspicious_login' ? 'border-l-red-500' :
            type === 'api_key_change' ? 'border-l-yellow-500' :
            type === 'login' ? 'border-l-green-500' :
            'border-l-teal-500'
          } pl-4 py-3`}>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">{type.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{count}</p>
          </div>
        )) : (
          <div className="col-span-4 py-5">
            <p className="text-sm text-slate-500">No security events recorded yet</p>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(events || []).map((e) => {
              const tenant = e.tenants as unknown as { name: string; slug: string } | null
              return (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    {tenant ? (
                      <Link href={`/admin/businesses/${e.tenant_id}`} className="text-teal-600 hover:text-teal-700 text-sm">
                        {tenant.name}
                      </Link>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${eventColors[e.type] || 'bg-slate-200 text-slate-400'}`}>
                      {e.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-sm">{e.description}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{e.ip_address || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {new Date(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </td>
                </tr>
              )
            })}
            {(!events || events.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">No events recorded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
