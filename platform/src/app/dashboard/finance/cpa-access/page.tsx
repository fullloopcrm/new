'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type Tok = {
  id: string
  token: string
  cpa_name: string | null
  cpa_email: string | null
  expires_at: string | null
  last_used_at: string | null
  use_count: number
  entities: { name: string } | null
}

export default function CpaAccessPage() {
  const [tokens, setTokens] = useState<Tok[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [days, setDays] = useState('90')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/finance/cpa-tokens').then(r => r.json()).then(d => { setTokens(d.tokens || []); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    await fetch('/api/finance/cpa-tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpa_name: name, cpa_email: email, expires_in_days: parseInt(days) || null }),
    })
    setName(''); setEmail(''); load()
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this token?')) return
    await fetch('/api/finance/cpa-tokens', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  return (
    <div>
      <Link href="/dashboard/finance" className="text-xs text-slate-500 hover:underline">← Finance</Link>
      <h1 className="font-heading text-2xl font-bold text-slate-900 mt-1 mb-6">CPA Access</h1>

      <section className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h3 className="font-heading font-semibold text-slate-900 text-sm mb-3">Generate new read-only token</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input placeholder="CPA name" value={name} onChange={e => setName(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="CPA email" value={email} onChange={e => setEmail(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Expires in (days)" value={days} onChange={e => setDays(e.target.value)} className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={create} className="px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700">
          Create token
        </button>
      </section>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
          : tokens.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No active tokens.</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2 font-medium">CPA</th>
                <th className="px-5 py-2 font-medium">Link</th>
                <th className="px-5 py-2 font-medium">Expires</th>
                <th className="px-5 py-2 font-medium">Uses</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tokens.map(t => {
                const url = `${typeof window === 'undefined' ? '' : window.location.origin}/api/cpa/${t.token}/year-end-zip?year=${new Date().getUTCFullYear() - 1}`
                return (
                  <tr key={t.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{t.cpa_name || '—'}</p>
                      <p className="text-xs text-slate-500">{t.cpa_email || ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => { navigator.clipboard.writeText(url); alert('CPA link copied') }}
                        className="text-xs text-teal-600 hover:underline">Copy link</button>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{t.use_count}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => revoke(t.id)} className="text-xs text-red-500 hover:text-red-700">Revoke</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
