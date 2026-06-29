'use client'

import { useEffect, useState, type ReactNode } from 'react'

interface DiscountLine { label: string; cents: number }
interface PaymentRow {
  id: string
  amount: number | null
  tip: number | null
  method: string | null
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  reference_id: string | null
  notes: string | null
  created_at: string
}
interface CleanerSummary {
  cleaner_id: string
  name: string
  phone: string | null
  is_lead: boolean
  base_cents: number
  tip_cents: number
  total_due_cents: number
  total_paid_cents: number
  outstanding_cents: number
  payouts: Array<{ id: string; amount: number; method: string | null; created_at: string }>
}
interface Summary {
  booking: {
    id: string
    status: string
    payment_status: string | null
    payment_method: string | null
    payment_received_at: string | null
    notes: string | null
  }
  time: {
    check_in: string | null
    check_out: string | null
    raw_minutes: number
    billed_blocks: number
    remainder_minutes: number
    billed_hours: number
    max_hours_cap: number | null
    capped_at_max: boolean
  }
  bill: {
    hourly_rate: number
    team_size: number
    gross_cents: number
    discounts: DiscountLine[]
    total_discount_cents: number
    final_cents: number
    cc_cents: number
  }
  payments: PaymentRow[]
  payment_totals: {
    paid_cents: number
    expected_cents: number
    overpayment_cents: number
    is_overpaid: boolean
    is_underpaid: boolean
    tip_cents: number
  }
  cleaner_payouts: CleanerSummary[]
  sms_log: Array<{ id: string; sms_type: string; recipient: string; status: string; created_at: string }>
}

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`
const fmtTime = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  return d.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

export function CloseoutDetail({ bookingId, onAnyChange }: { bookingId: string; onAnyChange?: () => void }) {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/bookings/${bookingId}/closeout-summary`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Failed to load summary')
      setData(j as Summary)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [bookingId])

  const markPaid = async (cleanerId: string, amountCents: number) => {
    const method = window.prompt('Payment method? (zelle / venmo / cashapp / cash / other)', 'zelle')
    if (!method) return
    setPaying(cleanerId)
    try {
      const r = await fetch(`/api/admin/bookings/${bookingId}/cleaner-payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleaner_id: cleanerId, amount_cents: amountCents, method: method.toLowerCase().trim() }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Payout failed')
      await refresh()
      onAnyChange?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed')
    } finally {
      setPaying(null)
    }
  }

  if (loading) return <div className="p-3 text-xs text-gray-500">Loading detail…</div>
  if (error) return <div className="p-3 text-xs text-red-600">Error: {error}</div>
  if (!data) return null

  const t = data.time
  const b = data.bill
  const pt = data.payment_totals

  // Compact key/value row — value sits close to label with a thin dotted spacer.
  const KV = ({ k, v, valueClass = '' }: { k: ReactNode; v: ReactNode; valueClass?: string }) => (
    <div className="flex items-baseline gap-2 leading-tight">
      <span className="text-gray-600 whitespace-nowrap">{k}</span>
      <span className="flex-1 border-b border-dotted border-gray-200 translate-y-[-3px]" aria-hidden />
      <span className={'whitespace-nowrap text-gray-900 ' + valueClass}>{v}</span>
    </div>
  )

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 grid md:grid-cols-2 gap-x-6 gap-y-4 text-xs max-w-3xl">
      {/* TIME */}
      <section>
        <h4 className="font-bold text-[#1E2A4A] uppercase tracking-wide text-[10px] mb-1.5">Time</h4>
        <div className="space-y-1">
          <KV k="Check-in" v={fmtTime(t.check_in)} />
          <KV k="Check-out" v={t.check_out ? fmtTime(t.check_out) : <em className="text-amber-600">in progress</em>} />
          <KV k="Raw minutes" v={t.raw_minutes} />
          <KV k="30-min blocks" v={`${t.billed_blocks} (${t.remainder_minutes}m into next)`} />
          <KV k="Billed hours" valueClass="font-semibold" v={<>{t.billed_hours}{t.capped_at_max && <span className="ml-1 text-amber-600">capped @ {t.max_hours_cap}</span>}</>} />
        </div>
      </section>

      {/* BILL */}
      <section>
        <h4 className="font-bold text-[#1E2A4A] uppercase tracking-wide text-[10px] mb-1.5">Bill</h4>
        <div className="space-y-1">
          <KV k={`${t.billed_hours}h × $${b.hourly_rate}/hr × ${b.team_size}`} v={fmtUsd(b.gross_cents)} />
          {b.discounts.map((d, i) => (
            <KV key={i} k={<span className="text-emerald-700">− {d.label}</span>} v={<span className="text-emerald-700">−{fmtUsd(d.cents)}</span>} />
          ))}
          {b.discounts.length > 0 && <div className="border-t border-gray-200 my-0.5" />}
          <KV k={<span className="font-semibold">Final due (Zelle)</span>} v={fmtUsd(b.final_cents)} valueClass="font-bold" />
          <KV k={<span className="text-gray-500">Card (+4% fee)</span>} v={<span className="text-gray-700">{fmtUsd(b.cc_cents)}</span>} />
        </div>
      </section>

      {/* PAYMENTS RECEIVED */}
      <section className="md:col-span-2">
        <h4 className="font-bold text-[#1E2A4A] uppercase tracking-wide text-[10px] mb-1.5">Payments received</h4>
        {data.payments.length === 0 ? (
          <p className="text-gray-400 italic">No payments recorded.</p>
        ) : (
          <div className="space-y-1">
            {data.payments.map(p => (
              <div key={p.id} className="flex items-baseline gap-3 px-2 py-1 bg-gray-50 rounded">
                <span className="text-gray-700 whitespace-nowrap">{fmtTime(p.created_at)}</span>
                <span className="text-gray-500 capitalize whitespace-nowrap">{p.method || '?'}</span>
                <span className="flex-1 border-b border-dotted border-gray-300 translate-y-[-3px]" aria-hidden />
                <span className="font-semibold text-gray-900 whitespace-nowrap">{fmtUsd(p.amount || 0)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1 mt-2">
          <KV k="Total paid" v={fmtUsd(pt.paid_cents)} valueClass="font-semibold" />
          <KV k="Expected" v={fmtUsd(pt.expected_cents)} />
          <KV
            k={<span className={pt.is_overpaid ? 'text-emerald-700 font-semibold' : pt.is_underpaid ? 'text-red-600 font-semibold' : 'text-gray-500'}>{pt.is_overpaid ? 'Tip / overpayment' : pt.is_underpaid ? 'Underpaid' : 'Balanced'}</span>}
            v={<span className={pt.is_overpaid ? 'text-emerald-700' : pt.is_underpaid ? 'text-red-600' : 'text-gray-500'}>{pt.overpayment_cents >= 0 ? '+' : ''}{fmtUsd(pt.overpayment_cents)}</span>}
            valueClass="font-bold"
          />
        </div>
      </section>

      {/* CLEANER PAYOUTS */}
      <section className="md:col-span-2">
        <h4 className="font-bold text-[#1E2A4A] uppercase tracking-wide text-[10px] mb-1.5">Cleaner payouts</h4>
        {data.cleaner_payouts.length === 0 ? (
          <p className="text-gray-400 italic">No cleaner assigned.</p>
        ) : (
          <div className={'space-y-2 ' + (data.cleaner_payouts.length > 1 ? 'md:grid md:grid-cols-2 md:gap-2 md:space-y-0' : '')}>
            {data.cleaner_payouts.map(c => (
              <div key={c.cleaner_id} className="bg-gray-50 rounded p-2">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    {c.is_lead && <span className="ml-2 text-[9px] uppercase tracking-wide bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Lead</span>}
                  </div>
                  <span className={'font-bold ' + (c.outstanding_cents > 0 ? 'text-red-600' : 'text-emerald-700')}>
                    {c.outstanding_cents > 0 ? `Owed ${fmtUsd(c.outstanding_cents)}` : 'Paid ✓'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <KV k="Base" v={fmtUsd(c.base_cents)} />
                  {c.tip_cents > 0 && <KV k="Tip share" v={fmtUsd(c.tip_cents)} />}
                  <KV k={<span className="font-medium">Total due</span>} v={fmtUsd(c.total_due_cents)} valueClass="font-medium" />
                  <KV k="Paid so far" v={fmtUsd(c.total_paid_cents)} />
                </div>
                {c.payouts.length > 0 && (
                  <div className="mt-1 pl-2 border-l border-gray-300 text-gray-500">
                    {c.payouts.map(p => (
                      <div key={p.id} className="flex items-baseline gap-2">
                        <span className="whitespace-nowrap">{fmtTime(p.created_at)} · {p.method || '?'}</span>
                        <span className="flex-1 border-b border-dotted border-gray-300 translate-y-[-3px]" aria-hidden />
                        <span className="whitespace-nowrap">{fmtUsd(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {c.outstanding_cents > 0 && (
                  <button
                    disabled={paying === c.cleaner_id}
                    onClick={() => markPaid(c.cleaner_id, c.outstanding_cents)}
                    className="mt-2 w-full px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[11px] font-semibold"
                  >
                    {paying === c.cleaner_id ? 'Recording…' : `Mark paid ${fmtUsd(c.outstanding_cents)}`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AUDIT */}
      {data.sms_log.length > 0 && (
        <section className="md:col-span-2">
          <h4 className="font-bold text-[#1E2A4A] uppercase tracking-wide text-[10px] mb-1.5">SMS audit ({data.sms_log.length})</h4>
          <div className="max-h-32 overflow-y-auto pl-1 text-gray-500 space-y-0.5">
            {data.sms_log.slice(-10).map(s => (
              <div key={s.id} className="flex items-baseline gap-2">
                <span className="whitespace-nowrap">{fmtTime(s.created_at)}</span>
                <span className="text-gray-700 whitespace-nowrap">{s.sms_type}</span>
                <span className="flex-1 border-b border-dotted border-gray-200 translate-y-[-3px]" aria-hidden />
                <span className="font-mono text-[10px] whitespace-nowrap">{s.status}</span>
              </div>
            ))}
            {data.sms_log.length > 10 && <div className="italic text-gray-400">…showing last 10 of {data.sms_log.length}</div>}
          </div>
        </section>
      )}
    </div>
  )
}
