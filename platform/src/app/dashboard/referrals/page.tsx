'use client'

import { useEffect, useState } from 'react'
import { downloadCSV } from '@/lib/csv'
import { usePageSettings, PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'

type Referral = {
  id: string
  referral_code: string
  referrer_client_id: string | null
  referred_client_id: string | null
  status: string
  reward_amount: number | null
  created_at: string
  clients?: { name: string } | null
}

type Tab = 'overview' | 'payouts' | 'referrers'

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ referrer_client_id: '', reward_amount: '50' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [copied, setCopied] = useState('')
  const [search, setSearch] = useState('')

  const referralsSettings = usePageSettings('referrals')

  useEffect(() => {
    fetch('/api/referrals').then((r) => r.json()).then((data) => setReferrals(data.referrals || []))
    fetch('/api/clients').then((r) => r.json()).then((data) => setClients(data.clients || []))
  }, [])

  async function createReferral(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer_client_id: form.referrer_client_id,
        reward_amount: Math.round(Number(form.reward_amount) * 100),
      }),
    })
    if (res.ok) {
      const { referral } = await res.json()
      setReferrals((prev) => [referral, ...prev])
      setShowCreate(false)
    }
    setSaving(false)
  }

  async function markPaid(id: string) {
    await fetch(`/api/referrals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    setReferrals((prev) => prev.map((r) => r.id === id ? { ...r, status: 'paid' } : r))
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  // Stats
  const totalReferrals = referrals.length
  const converted = referrals.filter(r => r.status === 'converted' || r.status === 'paid').length
  const pendingPayouts = referrals.filter(r => r.status === 'converted')
  const paidOut = referrals.filter(r => r.status === 'paid')
  const totalEarned = referrals
    .filter(r => r.status === 'converted' || r.status === 'paid')
    .reduce((sum, r) => sum + (r.reward_amount || 0), 0)
  const totalPaid = paidOut.reduce((sum, r) => sum + (r.reward_amount || 0), 0)
  const pendingAmount = pendingPayouts.reduce((sum, r) => sum + (r.reward_amount || 0), 0)
  const convRate = totalReferrals > 0 ? Math.round((converted / totalReferrals) * 100) : 0

  // Leaderboard
  const referrerMap: Record<string, { name: string; count: number; earned: number }> = {}
  for (const r of referrals) {
    const name = r.clients?.name || 'Unknown'
    const key = r.referrer_client_id || name
    if (!referrerMap[key]) referrerMap[key] = { name, count: 0, earned: 0 }
    referrerMap[key].count++
    if (r.status === 'converted' || r.status === 'paid') {
      referrerMap[key].earned += r.reward_amount || 0
    }
  }
  const leaderboard = Object.values(referrerMap).sort((a, b) => b.count - a.count)

  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

  const searchFiltered = search ? referrals.filter(r => r.referral_code.toLowerCase().includes(search.toLowerCase()) || r.clients?.name?.toLowerCase().includes(search.toLowerCase())) : referrals

  return (
    <div>
      {/* PORTAL LINK */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Referral Signup Page:</span>
          <code className="text-blue-400 font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/referral/signup` : '/referral/signup'}</code>
        </div>
        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/referral/signup`)} className="text-xs text-gray-400 hover:text-white transition-colors">Copy Link</button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Referrals</h2>
            <p className="text-sm text-gray-500">{totalReferrals} total &middot; {converted} converted &middot; {convRate}% rate</p>
          </div>
          <PageSettingsGear open={referralsSettings.open} setOpen={referralsSettings.setOpen} title="Referrals" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV(
            referrals.map(r => ({
              ...r,
              referrer: r.clients?.name || '',
              reward: r.reward_amount ? (r.reward_amount / 100).toFixed(2) : '',
            })) as unknown as Record<string, unknown>[],
            'referrals',
            ['referral_code', 'referrer', 'status', 'reward', 'created_at']
          )} className="text-sm text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg">
            Export CSV
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
            {showCreate ? 'Cancel' : '+ Create Referral'}
          </button>
        </div>
      </div>

      <PageSettingsPanel
        {...referralsSettings}
        title="Referrals"
        tips={[
          'Share referral links with your top clients to grow organically',
          'Track clicks, conversions, and commissions for each referrer',
          'Set commission rates in Settings > Referrals & Policies',
        ]}
      >
        {({ config, updateConfig }) => (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Commission Rate % Override</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={(config.commission_rate as number) ?? ''}
                onChange={(e) => updateConfig('commission_rate', parseFloat(e.target.value) || 0)}
                placeholder="e.g. 10"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-32"
              />
              <span className="text-xs text-gray-500 ml-2">%</span>
            </div>
            <div className="border-t border-gray-800" />
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Minimum Payout Amount</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={(config.min_payout as number) ?? 50}
                  onChange={(e) => updateConfig('min_payout', parseInt(e.target.value) || 0)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-32"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">Referrers must earn at least this amount before payout</p>
            </div>
            <div className="border-t border-gray-800" />
            <div className="flex items-center justify-between max-w-sm">
              <label className="text-sm text-gray-300">Auto-generate referral codes for new clients</label>
              <button
                onClick={() => updateConfig('auto_generate_codes', !config.auto_generate_codes)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.auto_generate_codes ? 'bg-blue-500' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.auto_generate_codes ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </PageSettingsPanel>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Referrals', value: totalReferrals, color: 'border-l-gray-400' },
          { label: 'Converted', value: converted, color: 'border-l-green-500', sub: `${convRate}% rate` },
          { label: 'Total Earned', value: fmt(totalEarned), color: 'border-l-purple-500' },
          { label: 'Pending Payout', value: fmt(pendingAmount), color: 'border-l-orange-500', sub: `${pendingPayouts.length} awaiting` },
        ].map((card) => (
          <div key={card.label} className={`bg-gray-900 rounded-xl border border-gray-800 border-l-4 ${card.color} p-5`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
            {card.sub && <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* CREATE FORM */}
      {showCreate && (
        <form onSubmit={createReferral} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">Create Referral</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Referrer Client *</label>
              <select value={form.referrer_client_id} onChange={(e) => setForm({ ...form, referrer_client_id: e.target.value })} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Select Client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Reward Amount ($)</label>
              <input type="number" step="0.01" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.referrer_client_id}
              className="bg-white text-gray-900 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Referral'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      <input
        placeholder="Search by code or referrer name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:w-64 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mb-4 placeholder-gray-500"
      />

      {/* TABS */}
      <div className="flex gap-1 mb-4">
        {([
          { value: 'overview', label: 'Overview' },
          { value: 'payouts', label: 'Payout Queue', count: pendingPayouts.length },
          { value: 'referrers', label: 'Leaderboard' },
        ] as const).map((tab) => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab.value
                ? 'bg-white text-gray-900'
                : 'text-gray-500 hover:bg-gray-800'
            }`}>
            {tab.label} {'count' in tab && tab.count > 0 && <span className="ml-1 opacity-60">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reward</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {searchFiltered.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-white">{r.referral_code}</span>
                      <button onClick={() => copyCode(r.referral_code)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                          copied === r.referral_code ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500 hover:text-gray-400'
                        }`}>
                        {copied === r.referral_code ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{r.clients?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      r.status === 'converted' ? 'bg-green-500/20 text-green-400' :
                      r.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {r.reward_amount ? fmt(r.reward_amount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'converted' && (
                      <button onClick={() => markPaid(r.id)}
                        className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg font-medium hover:bg-emerald-500/30">
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {searchFiltered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{search ? 'No matching referrals' : 'No referrals yet — create your first one above'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYOUT QUEUE TAB */}
      {activeTab === 'payouts' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Pending Payouts</h3>
            <span className="text-xs text-gray-400">{fmt(pendingAmount)} pending</span>
          </div>
          {pendingPayouts.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No pending payouts</div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {pendingPayouts.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{r.clients?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">Code: {r.referral_code} &middot; {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">{r.reward_amount ? fmt(r.reward_amount) : '—'}</span>
                    <button onClick={() => markPaid(r.id)}
                      className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-500/30">
                      Pay Out
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {paidOut.length > 0 && (
            <>
              <div className="px-5 py-3 border-t border-gray-800 bg-gray-800/30">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Recently Paid ({fmt(totalPaid)} total)</h4>
              </div>
              <div className="divide-y divide-gray-800/50">
                {paidOut.slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm text-gray-400">{r.clients?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{r.referral_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{r.reward_amount ? fmt(r.reward_amount) : '—'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">Paid</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {activeTab === 'referrers' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="font-semibold text-white text-sm">Top Referrers</h3>
          </div>
          {leaderboard.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No referrers yet</div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {leaderboard.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      i === 1 ? 'bg-gray-700 text-gray-400' :
                      i === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-800 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">{entry.name}</p>
                      <p className="text-xs text-gray-400">{entry.count} referral{entry.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white">{fmt(entry.earned)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
