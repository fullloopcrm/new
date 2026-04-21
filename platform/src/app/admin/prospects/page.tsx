'use client'

import { useCallback, useEffect, useState } from 'react'

type P = {
  id: string
  business_name: string
  owner_name: string
  owner_email: string
  owner_phone: string | null
  trade: string
  primary_city: string | null
  primary_state: string | null
  primary_zip: string | null
  annual_revenue_bracket: string | null
  launch_timeline: string | null
  tier_interest: string | null
  status: string
  slot_taken_at_submit: boolean | null
  stripe_checkout_url: string | null
  reject_reason: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700', reviewing: 'bg-amber-50 text-amber-700',
  approved: 'bg-violet-50 text-violet-700', paid: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600', cancelled: 'bg-slate-100 text-slate-400',
}

export default function ProspectsAdminPage() {
  const [rows, setRows] = useState<P[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const url = filter ? `/api/admin/prospects?status=${filter}` : '/api/admin/prospects'
    fetch(url).then(r => r.json()).then(d => { setRows(d.prospects || []); setLoading(false) })
  }, [filter])

  useEffect(() => { load() }, [load])

  async function act(id: string, action: 'approve' | 'reject' | 'review', tier?: string) {
    setBusy(id); setMsg('')
    const body: Record<string, unknown> = { action }
    if (action === 'approve') body.tier = tier
    if (action === 'reject') body.reject_reason = prompt('Reason (internal):') || ''
    const res = await fetch(`/api/admin/prospects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Failed'); setBusy(null); return }
    if (action === 'approve' && data.prospect?.stripe_checkout_url) {
      navigator.clipboard.writeText(data.prospect.stripe_checkout_url)
      setMsg('Checkout link copied. Email it to the prospect.')
    }
    setBusy(null); load()
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Prospects</h1>
          <p className="text-sm text-slate-500">Review applications, approve to generate Stripe link, reject with reason.</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All</option><option value="new">New</option><option value="reviewing">Reviewing</option>
          <option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option>
        </select>
      </div>

      {msg && <div className="mb-3 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">{msg}</div>}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? <div className="p-10 text-center text-slate-400 text-sm">Loading…</div> :
          rows.length === 0 ? <div className="p-10 text-center text-slate-500 text-sm">No prospects.</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Business</th>
                <th className="px-4 py-2">Trade / Area</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Revenue</th>
                <th className="px-4 py-2">Tier</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.business_name}</p>
                    <p className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="capitalize">{p.trade.replace(/_/g,' ')}</p>
                    <p className="text-slate-500">{p.primary_city || ''} {p.primary_state || ''} {p.primary_zip || ''}</p>
                    {p.slot_taken_at_submit && <span className="text-red-600 text-[10px]">⚠ slot taken</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{p.owner_name}</p>
                    <p className="text-slate-500">{p.owner_email}</p>
                    {p.owner_phone && <p className="text-slate-500">{p.owner_phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs">{p.annual_revenue_bracket || '—'}</td>
                  <td className="px-4 py-3 text-xs">{p.tier_interest || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                  <td className="px-4 py-3">
                    {['new','reviewing'].includes(p.status) && (
                      <div className="flex gap-1">
                        <button disabled={busy === p.id} onClick={() => act(p.id, 'approve', p.tier_interest || 'growth')}
                          className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                          Approve
                        </button>
                        <button disabled={busy === p.id} onClick={() => act(p.id, 'reject')}
                          className="text-xs px-2 py-1 rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
                          Reject
                        </button>
                      </div>
                    )}
                    {p.status === 'approved' && p.stripe_checkout_url && (
                      <button onClick={() => { navigator.clipboard.writeText(p.stripe_checkout_url!); setMsg('Copied') }}
                        className="text-xs px-2 py-1 rounded bg-white border border-slate-300 hover:bg-slate-50">
                        Copy link
                      </button>
                    )}
                    {p.status === 'rejected' && p.reject_reason && (
                      <span className="text-xs text-slate-500" title={p.reject_reason}>reason ℹ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
