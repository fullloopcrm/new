'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface Commission {
  id: string
  source: 'direct' | 'override'
  status: 'pending' | 'paid' | 'void'
  client_name: string | null
  gross_amount_cents: number
  commission_rate: number
  commission_cents: number
  paid_at: string | null
  paid_via: string | null
  created_at: string
  sales_partners: { name: string; email: string; referral_code: string } | null
  referrers: { name: string; referral_code: string } | null
  bookings: { start_time: string; price: number } | null
}

interface Breakdown {
  commission: {
    id: string
    source: 'direct' | 'override'
    status: string
    client_name: string | null
    gross_amount_cents: number
    commission_rate: number
    commission_cents: number
    paid_at: string | null
    paid_via: string | null
    created_at: string
    sales_partner: { name: string; email: string; referral_code: string } | null
    referrer: { name: string; referral_code: string } | null
  }
  booking: {
    id: string
    start_time: string
    service_type: string | null
    price: number
    payment_status: string | null
    payment_method: string | null
    status: string
  } | null
}

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`
const fmtPct = (rate: number) => `${Math.round(rate * 1000) / 10}%`
const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  return d.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

// Same compact key/value row as the booking closeout breakdown
// (src/components/closeout-detail.tsx) — kept local since it's a five-line
// presentational helper, matching how that file keeps its own copy too.
const KV = ({ k, v, valueClass = '' }: { k: ReactNode; v: ReactNode; valueClass?: string }) => (
  <div className="flex items-baseline gap-2 leading-tight">
    <span className="text-gray-600 whitespace-nowrap">{k}</span>
    <span className="flex-1 border-b border-dotted border-gray-200 translate-y-[-3px]" aria-hidden />
    <span className={'whitespace-nowrap text-gray-900 ' + valueClass}>{v}</span>
  </div>
)

function CommissionBreakdownDetail({ commissionId, onPaid }: { commissionId: string; onPaid: () => void }) {
  const [data, setData] = useState<Breakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/sales-partner-commissions/${commissionId}/breakdown`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed to load breakdown')
      setData(j as Breakdown)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [commissionId])

  const markPaid = async () => {
    const method = window.prompt('Payment method? (zelle / apple_cash / stripe_connect / other)', 'zelle')
    if (!method) return
    setPaying(true)
    try {
      const r = await fetch('/api/sales-partner-commissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commissionId, status: 'paid', paid_via: method.toLowerCase().trim() }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Payout failed')
      await refresh()
      onPaid()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <div className="p-3 text-xs text-gray-500">Loading detail…</div>
  if (error) return <div className="p-3 text-xs text-red-600">Error: {error}</div>
  if (!data) return null

  const c = data.commission
  const b = data.booking

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 grid md:grid-cols-2 gap-x-6 gap-y-4 text-xs max-w-3xl">
      {/* JOB — the booking this commission traces back to */}
      <section>
        <h4 className="font-bold text-[#1E2A4A] uppercase tracking-wide text-[10px] mb-1.5">Job</h4>
        <div className="space-y-1">
          <KV k="Client" v={c.client_name || '—'} />
          <KV k="Service" v={b?.service_type || '—'} />
          <KV k="Date" v={b ? fmtDate(b.start_time) : '—'} />
          <KV k="Job status" v={b?.status || '—'} />
          <KV k="Client payment" v={b?.payment_status || '—'} />
        </div>
      </section>

      {/* COMMISSION — the math: gross × rate = commission */}
      <section>
        <h4 className="font-bold text-[#1E2A4A] uppercase tracking-wide text-[10px] mb-1.5">Commission</h4>
        <div className="space-y-1">
          <KV k="Source" v={c.source === 'direct' ? 'Direct' : `Override via ${c.referrer?.name || 'referrer'}`} />
          <KV k={`Gross × ${fmtPct(c.commission_rate)}`} v={fmtUsd(c.gross_amount_cents)} />
          <KV k={<span className="font-semibold">Commission</span>} v={fmtUsd(c.commission_cents)} valueClass="font-bold" />
        </div>
      </section>

      {/* PAYOUT — who it's owed to and whether it's been paid */}
      <section className="md:col-span-2">
        <h4 className="font-bold text-[#1E2A4A] uppercase tracking-wide text-[10px] mb-1.5">Payout</h4>
        <div className="bg-gray-50 rounded p-2">
          <div className="flex justify-between items-start mb-1">
            <span className="font-semibold text-gray-900">{c.sales_partner?.name || '—'}</span>
            <span className={'font-bold ' + (c.status === 'paid' ? 'text-emerald-700' : 'text-red-600')}>
              {c.status === 'paid' ? 'Paid ✓' : `Owed ${fmtUsd(c.commission_cents)}`}
            </span>
          </div>
          {c.status === 'paid' ? (
            <div className="space-y-0.5">
              <KV k="Paid via" v={c.paid_via || '—'} />
              <KV k="Paid at" v={fmtDate(c.paid_at)} />
            </div>
          ) : (
            <button
              disabled={paying}
              onClick={markPaid}
              className="mt-1 w-full px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[11px] font-semibold"
            >
              {paying ? 'Recording…' : `Mark paid ${fmtUsd(c.commission_cents)}`}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

export default function CommissionsPanel() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = () => {
    setLoading(true)
    fetch('/api/sales-partner-commissions')
      .then((r) => r.json())
      .then((d) => setCommissions(Array.isArray(d) ? d : []))
      .catch(() => setCommissions([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const pending = commissions.filter((c) => c.status === 'pending')
  const paid = commissions.filter((c) => c.status === 'paid')
  const totalPending = pending.reduce((sum, c) => sum + c.commission_cents, 0)

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading commissions...</div>
  }

  return (
    <div className="py-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-yellow-600">Pending Payouts</p>
          <p className="text-2xl font-bold text-yellow-800 mt-1">{fmtUsd(totalPending)}</p>
          <p className="text-xs text-yellow-500 mt-0.5">{pending.length} commissions</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">Total Paid</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{fmtUsd(paid.reduce((s, c) => s + c.commission_cents, 0))}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">All Commissions</p>
          <p className="text-2xl font-bold text-[#1E2A4A] mt-1">{commissions.length}</p>
        </div>
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-500 font-medium">No commissions yet</p>
          <p className="text-gray-400 text-sm mt-1">Sales partner and referrer payouts will show up here as jobs complete.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-50">
          {commissions.map((c) => {
            const isExpanded = expanded.has(c.id)
            return (
              <div key={c.id} className="px-5 py-4">
                <button onClick={() => toggle(c.id)} className="w-full flex items-center justify-between gap-3 text-left hover:opacity-80 transition-opacity">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block transition-transform text-gray-400">{isExpanded ? '▾' : '▸'}</span>
                      <span className="font-semibold text-[#1E2A4A]">{c.sales_partners?.name || '—'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.source === 'direct' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {c.source === 'direct' ? 'Direct' : `Override via ${c.referrers?.name || 'referrer'}`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 ml-5">{c.client_name || 'Unknown client'}&apos;s job &middot; {fmtDate(c.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-[#1E2A4A]">{fmtUsd(c.commission_cents)}</p>
                    <p className={'text-xs font-medium ' + (c.status === 'paid' ? 'text-green-600' : 'text-yellow-600')}>{c.status === 'paid' ? 'Paid' : 'Pending'}</p>
                  </div>
                </button>
                {isExpanded && <CommissionBreakdownDetail commissionId={c.id} onPaid={load} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
