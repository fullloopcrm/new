'use client'

import { useCallback, useEffect, useState } from 'react'

type PayrollRow = {
  id: string
  name: string
  pay_rate: number | null
  status: string
  pending_hours: number
  pending_pay: number
  jobs: number
}

const METHODS = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'other', label: 'Other' },
]

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

type GlobalPayoutsRunResult = {
  paid: { teamMemberName: string; amountCents: number }[]
  skipped: { teamMemberName: string; reason: string }[]
  held: { teamMemberName: string; code: string; amountCents: number }[]
  error?: string
  message?: string
}

export default function PayrollTab() {
  const [rows, setRows] = useState<PayrollRow[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('stripe')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runningGlobalPayouts, setRunningGlobalPayouts] = useState(false)
  const [globalPayoutsResult, setGlobalPayoutsResult] = useState<GlobalPayoutsRunResult | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/payroll')
      if (res.ok) {
        const data = await res.json()
        setRows(data.payroll || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openPay = (row: PayrollRow) => {
    setPayingId(row.id)
    setAmount(row.pending_pay.toFixed(2))
    setMethod('stripe')
    setError(null)
  }

  const submitPay = async (row: PayrollRow) => {
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      setError('Enter a valid amount')
      return
    }
    // A payment under the full pending amount is recorded and posted to the
    // ledger, but the underlying jobs stay "pending" (the system can't tell
    // which specific jobs a partial amount covers) -- confirm the admin
    // actually means to do that rather than silently under-crediting hours.
    if (amt < row.pending_pay - 0.01) {
      const ok = confirm(
        `${money(amt)} is less than the ${money(row.pending_pay)} owed. This will be recorded, but ${row.name}'s jobs will stay marked pending until paid in full. Continue?`
      )
      if (!ok) return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/finance/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_member_id: row.id, amount: amt, method }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Payment failed')
        return
      }
      setPayingId(null)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const totalPending = rows.reduce((s, r) => s + r.pending_pay, 0)
  const owedRows = rows.filter((r) => r.pending_pay > 0)

  const runGlobalPayouts = async () => {
    if (!confirm('Run Global Payouts now? This automatically funds and sends real money to every cleaner owed pay who has a Global Payouts recipient on file.')) return
    setRunningGlobalPayouts(true)
    setGlobalPayoutsResult(null)
    try {
      const res = await fetch('/api/team-members/global-payouts/run', { method: 'POST' })
      const body = await res.json()
      setGlobalPayoutsResult(res.ok ? body : { paid: [], skipped: [], held: [], error: body.error || 'Run failed' })
      if (res.ok) await load()
    } catch {
      setGlobalPayoutsResult({ paid: [], skipped: [], held: [], error: 'Network error' })
    } finally {
      setRunningGlobalPayouts(false)
    }
  }

  return (
    <>
      <div className="tm-section-head">
        <h2 className="tm-section-title">Payroll<em>.</em></h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="tm-section-meta">{owedRows.length} owed · {money(totalPending)} pending</span>
          <button
            type="button"
            disabled={runningGlobalPayouts}
            onClick={runGlobalPayouts}
            style={{ background: '#1E2A4A', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: runningGlobalPayouts ? 0.5 : 1 }}
          >
            {runningGlobalPayouts ? 'Running…' : 'Run Global Payouts'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted, #6b7280)', margin: '4px 0 16px' }}>
        Pending hours/pay come from completed, unclosed-out jobs. Recording a payment here posts it to the ledger
        (Finance → Books) and marks those jobs paid — same source of truth Finance reports from.
        &quot;Run Global Payouts&quot; auto-funds and pays every cleaner with a Global Payouts recipient on file, subject
        to guardrails (a per-run cap and a per-person hold-for-review threshold that texts you for approval).
      </p>

      {globalPayoutsResult && (
        <div style={{ fontSize: 12, border: '1px solid var(--line, #e5e7eb)', borderRadius: 10, padding: 10, marginBottom: 16, background: globalPayoutsResult.error ? '#fef2f2' : '#f0fdf4' }}>
          {globalPayoutsResult.error && <div style={{ color: '#b91c1c' }}>{globalPayoutsResult.error}</div>}
          {globalPayoutsResult.message && <div>{globalPayoutsResult.message}</div>}
          {globalPayoutsResult.paid.length > 0 && (
            <div>Paid: {globalPayoutsResult.paid.map(p => `${p.teamMemberName} (${money(p.amountCents / 100)})`).join(', ')}</div>
          )}
          {globalPayoutsResult.held.length > 0 && (
            <div>Held for approval (texted you): {globalPayoutsResult.held.map(h => `${h.teamMemberName} (${money(h.amountCents / 100)}, code ${h.code})`).join(', ')}</div>
          )}
          {globalPayoutsResult.skipped.length > 0 && (
            <div style={{ color: '#b45309' }}>Skipped: {globalPayoutsResult.skipped.map(s => `${s.teamMemberName}: ${s.reason}`).join(', ')}</div>
          )}
        </div>
      )}

      {loading && <div className="tm-empty">Loading…</div>}
      {!loading && rows.length === 0 && <div className="tm-empty">No active team members.</div>}

      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows
            .slice()
            .sort((a, b) => b.pending_pay - a.pending_pay)
            .map((row) => (
              <div key={row.id} style={{ border: '1px solid var(--line, #e5e7eb)', borderRadius: 12, padding: 14, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--ink, #1E2A4A)', fontSize: 15 }}>{row.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted, #6b7280)' }}>
                      {row.jobs} {row.jobs === 1 ? 'job' : 'jobs'} · {row.pending_hours.toFixed(1)}h pending
                      {row.pay_rate != null && ` · $${row.pay_rate}/hr`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: row.pending_pay > 0 ? 'var(--ink, #1E2A4A)' : '#9ca3af' }}>
                      {money(row.pending_pay)}
                    </div>
                    {row.pending_pay > 0 && payingId !== row.id && (
                      <button
                        type="button"
                        onClick={() => openPay(row)}
                        style={{ background: '#1E2A4A', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>

                {payingId === row.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line, #e5e7eb)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#374151' }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={{ width: 100, border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 8px', fontSize: 13 }}
                    />
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 8px', fontSize: 13 }}
                    >
                      {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitPay(row)}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
                    >
                      {submitting ? 'Recording…' : 'Confirm payment'}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => { setPayingId(null); setError(null) }}
                      style={{ background: 'transparent', color: '#6b7280', border: 'none', fontSize: 13, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    {error && <span style={{ fontSize: 12, color: '#b91c1c', width: '100%' }}>{error}</span>}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </>
  )
}
