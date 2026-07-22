'use client'

import { useEffect, useState } from 'react'
import { downloadCSV } from '@/lib/csv'

type SalesPartner = {
  id: string
  name: string
  email: string
  phone: string | null
  referral_code: string
  tier: string
  commission_rate: number
  total_earned: number
  total_paid: number
  preferred_payout: string | null
  active: boolean
  approved_at: string
  created_at: string
  agreement_document_id: string | null
  documents: { status: string } | null
  stripe_connect_account_id: string | null
  stripe_ready_at: string | null
  stripe_ineligible: boolean
}

type Commission = {
  id: string
  sales_partner_id: string
  source: 'direct' | 'override'
  client_name: string | null
  commission_cents: number
  status: 'pending' | 'paid' | 'void'
  paid_via: string | null
  created_at: string
  sales_partners?: { name: string; referral_code: string } | null
}

type Tab = 'partners' | 'payouts'

const TIER_LABEL: Record<string, string> = { standard: 'Standard (10%)', tier2: 'Tier 2 (12%)', tier3: 'Tier 3 (15%)' }

export default function SalesPartnersPage() {
  const [partners, setPartners] = useState<SalesPartner[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('partners')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState('')
  const [busyId, setBusyId] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', tier: 'standard' })
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState('')
  const [addResult, setAddResult] = useState<{ signUrl: string; warning?: string } | null>(null)
  const [payoutError, setPayoutError] = useState('')
  const [inviteResult, setInviteResult] = useState<Record<string, { ok: boolean; message: string } | null>>({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [pRes, cRes] = await Promise.all([
      fetch('/api/sales-partners'),
      fetch('/api/sales-partner-commissions'),
    ])
    if (pRes.ok) setPartners(await pRes.json())
    if (cRes.ok) setCommissions(await cRes.json())
    setLoading(false)
  }

  async function toggleActive(p: SalesPartner) {
    setBusyId(p.id)
    const res = await fetch('/api/sales-partners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    })
    if (res.ok) setPartners((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
    setBusyId('')
  }

  async function setTier(p: SalesPartner, tier: string) {
    setBusyId(p.id)
    const res = await fetch('/api/sales-partners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, tier }),
    })
    if (res.ok) setPartners((prev) => prev.map((x) => (x.id === p.id ? { ...x, tier } : x)))
    setBusyId('')
  }

  async function markPaid(c: Commission, paidVia?: 'stripe_connect') {
    setBusyId(c.id)
    setPayoutError('')
    const res = await fetch('/api/sales-partner-commissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, status: 'paid', ...(paidVia ? { paid_via: paidVia } : {}) }),
    })
    const data = await res.json()
    if (res.ok) {
      setCommissions((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: 'paid' } : x)))
      const partnerId = c.sales_partner_id
      setPartners((prev) => prev.map((p) => (p.id === partnerId ? { ...p, total_paid: p.total_paid + c.commission_cents } : p)))
    } else {
      setPayoutError(data.error || 'Payout failed')
    }
    setBusyId('')
  }

  async function toggleStripeIneligible(p: SalesPartner) {
    setBusyId(p.id)
    const res = await fetch('/api/sales-partners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, stripe_ineligible: !p.stripe_ineligible }),
    })
    if (res.ok) setPartners((prev) => prev.map((x) => (x.id === p.id ? { ...x, stripe_ineligible: !x.stripe_ineligible } : x)))
    setBusyId('')
  }

  async function sendStripeInvite(p: SalesPartner) {
    setBusyId(p.id)
    setInviteResult((prev) => ({ ...prev, [p.id]: null }))
    try {
      const res = await fetch(`/api/sales-partners/${p.id}/stripe-invite`, { method: 'POST' })
      const data = await res.json()
      setInviteResult((prev) => ({
        ...prev,
        [p.id]: res.ok
          ? { ok: true, message: data.sentSms || data.sentEmail ? 'Invite sent' : 'Link ready (no SMS/email on file)' }
          : { ok: false, message: data.error || 'Could not send invite' },
      }))
    } finally {
      setBusyId('')
    }
  }

  async function addPartner() {
    setAddError('')
    setAddBusy(true)
    try {
      const res = await fetch('/api/sales-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error || 'Could not add partner')
        return
      }
      setAddResult({ signUrl: data.signUrl, warning: data.warning })
      await load()
    } finally {
      setAddBusy(false)
    }
  }

  function closeAddModal() {
    setShowAdd(false)
    setAddForm({ name: '', email: '', phone: '', tier: 'standard' })
    setAddError('')
    setAddResult(null)
  }

  function copyLink(code: string) {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/book?ref=${code}`
    navigator.clipboard.writeText(link)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

  const pendingCommissions = commissions.filter((c) => c.status === 'pending')
  const paidCommissions = commissions.filter((c) => c.status === 'paid')
  const totalEarned = partners.reduce((sum, p) => sum + p.total_earned, 0)
  const totalPending = partners.reduce((sum, p) => sum + (p.total_earned - p.total_paid), 0)
  const activeCount = partners.filter((p) => p.active).length

  const searchFiltered = search
    ? partners.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.referral_code.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()))
    : partners

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sales Partners</h2>
          <p className="text-sm text-slate-400">{partners.length} total &middot; {activeCount} active</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm text-white bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded-lg font-medium"
          >
            + Add Partner
          </button>
          <button
            onClick={() => downloadCSV(
              partners.map((p) => ({ ...p, total_earned: (p.total_earned / 100).toFixed(2), total_paid: (p.total_paid / 100).toFixed(2) })) as unknown as Record<string, unknown>[],
              'sales-partners',
              ['name', 'email', 'phone', 'referral_code', 'tier', 'total_earned', 'total_paid', 'active', 'created_at']
            )}
            className="text-sm text-slate-400 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-lg"
          >
            Export CSV
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {addResult ? (
              <>
                <h3 className="font-semibold text-slate-900 mb-2">Partner added</h3>
                <p className="text-sm text-slate-400 mb-3">
                  {addResult.warning ? addResult.warning : `Their agreement was emailed to ${addForm.email}.`} They&apos;ll be activated automatically once they sign.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-slate-400 mb-1">Signing link</p>
                  <p className="text-xs font-mono break-all text-slate-900">{addResult.signUrl}</p>
                </div>
                <button onClick={closeAddModal} className="w-full text-sm bg-slate-900 text-white rounded-lg py-2 font-medium">Done</button>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900 mb-4">Add Sales Partner</h3>
                {addError && <p className="text-sm text-red-600 mb-3">{addError}</p>}
                <div className="space-y-3 mb-4">
                  <input placeholder="Full name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-gray-500" />
                  <input placeholder="Email" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-gray-500" />
                  <input placeholder="Phone (optional)" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-gray-500" />
                  <select value={addForm.tier} onChange={(e) => setAddForm({ ...addForm, tier: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {Object.entries(TIER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <p className="text-xs text-slate-400 mb-4">They&apos;ll be emailed a Commission Sales Partner Agreement to sign. Their portal login activates automatically once signed.</p>
                <div className="flex gap-2">
                  <button onClick={closeAddModal} className="flex-1 text-sm border border-slate-200 rounded-lg py-2 font-medium text-slate-400">Cancel</button>
                  <button disabled={addBusy || !addForm.name || !addForm.email} onClick={addPartner} className="flex-1 text-sm bg-teal-600 text-white rounded-lg py-2 font-medium disabled:opacity-50">
                    {addBusy ? 'Sending…' : 'Send agreement'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Partners', value: activeCount, color: 'border-l-gray-400' },
          { label: 'Total Earned', value: fmt(totalEarned), color: 'border-l-purple-500' },
          { label: 'Pending Payout', value: fmt(totalPending), color: 'border-l-orange-500', sub: `${pendingCommissions.length} commissions` },
          { label: 'Paid Out', value: fmt(paidCommissions.reduce((s, c) => s + c.commission_cents, 0)), color: 'border-l-emerald-500' },
        ].map((card) => (
          <div key={card.label} className={`border border-slate-200 rounded-lg border-l-4 ${card.color} p-5`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            {card.sub && <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      <input
        placeholder="Search by name, email, or code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 placeholder-gray-500"
      />

      <div className="flex gap-1 mb-4">
        {([
          { value: 'partners', label: 'Partners' },
          { value: 'payouts', label: 'Payout Queue', count: pendingCommissions.length },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === tab.value ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            {tab.label} {'count' in tab && tab.count > 0 && <span className="ml-1 opacity-60">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'partners' && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-400">
                <th className="px-4 py-3 font-medium">Partner</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Earned</th>
                <th className="px-4 py-3 font-medium">Pending</th>
                <th className="px-4 py-3 font-medium">Agreement</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Stripe</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {searchFiltered.map((p) => (
                <tr key={p.id} className="border-b border-slate-200/50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-900">{p.referral_code}</span>
                      <button
                        onClick={() => copyLink(p.referral_code)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${copied === p.referral_code ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-400 hover:text-slate-400'}`}
                      >
                        {copied === p.referral_code ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.tier}
                      disabled={busyId === p.id}
                      onChange={(e) => setTier(p, e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1"
                    >
                      {Object.entries(TIER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{fmt(p.total_earned)}</td>
                  <td className="px-4 py-3 text-slate-400">{fmt(p.total_earned - p.total_paid)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.documents?.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {p.documents?.status === 'completed' ? 'Signed' : p.agreement_document_id ? 'Awaiting signature' : 'Not sent'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.stripe_ready_at ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">Instant pay ready</span>
                    ) : p.stripe_ineligible ? (
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">Stripe-ineligible (manual)</span>
                        <button
                          disabled={busyId === p.id}
                          onClick={() => toggleStripeIneligible(p)}
                          className="block text-[11px] text-slate-400 hover:text-slate-900 mt-1"
                        >
                          Unmark
                        </button>
                      </div>
                    ) : !p.active ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : (
                      <div>
                        {p.stripe_connect_account_id ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Onboarding started</span>
                        ) : (
                          <button
                            disabled={busyId === p.id}
                            onClick={() => sendStripeInvite(p)}
                            className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 px-2.5 py-1 rounded-lg font-medium disabled:opacity-50"
                          >
                            Send Connect invite
                          </button>
                        )}
                        {inviteResult[p.id] && (
                          <p className={`text-[11px] mt-1 ${inviteResult[p.id]?.ok ? 'text-green-600' : 'text-red-600'}`}>{inviteResult[p.id]?.message}</p>
                        )}
                        <button
                          disabled={busyId === p.id}
                          onClick={() => toggleStripeIneligible(p)}
                          className="block text-[11px] text-slate-400 hover:text-slate-900 mt-1"
                        >
                          Mark Stripe-ineligible
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busyId === p.id}
                      onClick={() => toggleActive(p)}
                      className="text-xs text-slate-400 hover:text-slate-900 border border-slate-200 px-2.5 py-1 rounded-lg"
                    >
                      {p.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {searchFiltered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">{search ? 'No matching partners' : 'No sales partners yet — add one above to send their agreement'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">Pending Payouts</h3>
            <span className="text-xs text-slate-400">{fmt(pendingCommissions.reduce((s, c) => s + c.commission_cents, 0))} pending</span>
          </div>
          {payoutError && <div className="px-5 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{payoutError}</div>}
          {pendingCommissions.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No pending payouts</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {pendingCommissions.map((c) => {
                const partner = partners.find((p) => p.id === c.sales_partner_id)
                const stripeReady = !!partner?.stripe_ready_at
                // Manual is only reachable for an admin-flagged Stripe-ineligible
                // partner (CHANNEL.md 16:55) -- not an implicit default for anyone
                // who simply hasn't connected yet.
                const manualAllowed = !!partner?.stripe_ineligible
                return (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.sales_partners?.name || 'Unknown partner'}</p>
                      <p className="text-xs text-slate-400">
                        {c.source === 'direct' ? 'Direct client' : 'Referrer override'} &middot; {c.client_name || 'a client'} &middot; {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900">{fmt(c.commission_cents)}</span>
                      {stripeReady ? (
                        <button
                          disabled={busyId === c.id}
                          onClick={() => markPaid(c, 'stripe_connect')}
                          className="text-xs bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg font-medium hover:bg-teal-100 disabled:opacity-50"
                        >
                          Pay via Stripe
                        </button>
                      ) : manualAllowed ? (
                        <button
                          disabled={busyId === c.id}
                          onClick={() => markPaid(c)}
                          className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          Pay Out
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400" title="Send them a Connect invite, or mark them Stripe-ineligible on the Partners tab">
                          Needs Stripe or ineligible flag
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {paidCommissions.length > 0 && (
            <>
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
                <h4 className="text-xs font-semibold text-slate-400 uppercase">Recently Paid</h4>
              </div>
              <div className="divide-y divide-slate-700/50">
                {paidCommissions.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm text-slate-400">{c.sales_partners?.name || 'Unknown partner'}</p>
                      <p className="text-xs text-slate-400">{c.source === 'direct' ? 'Direct client' : 'Referrer override'} &middot; {c.client_name || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">{fmt(c.commission_cents)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">Paid</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
