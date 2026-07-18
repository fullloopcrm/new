'use client'

import { useEffect, useMemo, useState } from 'react'
import HelpTip from '../_components/HelpTip'

/**
 * Master Budget — a real per-quote budget: labor budget, materials/supplies
 * budget, and a target margin, set at proposal time and compared against
 * actual costs once work starts. Talks to /api/quote-budgets.
 *
 * Actuals are entered by hand. There is no job-scoped time tracking or
 * expense tracking in this codebase yet, so there is nothing to roll up
 * automatically — this page is where the tenant records what labor and
 * materials actually cost as the job runs.
 */

type QuoteRow = {
  id: string
  quote_number: string
  title: string | null
  status: string
  total_cents: number
  client_id: string | null
  clients: { id: string; name: string } | null
  budget: Budget | null
}

type Budget = {
  id?: string
  quote_id: string
  labor_budget_cents: number
  materials_budget_cents: number
  other_budget_cents: number
  target_margin_bps: number | null
  labor_actual_cents: number
  materials_actual_cents: number
  other_actual_cents: number
  notes: string | null
}

const STATUS_FILTERS = [
  { v: '', l: 'All (excl. declined/expired)' },
  { v: 'sent', l: 'Sent' },
  { v: 'viewed', l: 'Viewed' },
  { v: 'accepted', l: 'Accepted' },
  { v: 'converted', l: 'Converted' },
  { v: 'draft', l: 'Draft' },
]
const HIDDEN_BY_DEFAULT = ['declined', 'expired']

function money(cents: number | null | undefined): string {
  return '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
}
function toCents(v: string): number {
  const n = Number(v.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
function pct(bps: number | null | undefined): string {
  if (bps == null) return '—'
  return (bps / 100).toFixed(1) + '%'
}

const emptyForm = { labor_budget: '', materials_budget: '', other_budget: '', target_margin: '', labor_actual: '', materials_actual: '', other_actual: '', notes: '' }

export default function BudgetTab() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function load() {
    setLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    fetch(`/api/quote-budgets${qs}`)
      .then((r) => r.json())
      .then((d) => setQuotes(d?.quotes || []))
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleQuotes = useMemo(
    () => (statusFilter ? quotes : quotes.filter((q) => !HIDDEN_BY_DEFAULT.includes(q.status))),
    [quotes, statusFilter]
  )

  async function openBudget(row: QuoteRow) {
    setErr('')
    setOpenId(row.id)
    const b = row.budget
    if (b) {
      setForm({
        labor_budget: String((b.labor_budget_cents || 0) / 100),
        materials_budget: String((b.materials_budget_cents || 0) / 100),
        other_budget: String((b.other_budget_cents || 0) / 100),
        target_margin: b.target_margin_bps != null ? String(b.target_margin_bps / 100) : '',
        labor_actual: String((b.labor_actual_cents || 0) / 100),
        materials_actual: String((b.materials_actual_cents || 0) / 100),
        other_actual: String((b.other_actual_cents || 0) / 100),
        notes: b.notes || '',
      })
      return
    }
    // No budget yet -- start from the template-derived suggestion (per
    // matched catalog items' labor-hours/rate, materials cost, overhead,
    // target margin defaults) instead of a blank form.
    setForm({ ...emptyForm })
    try {
      const res = await fetch(`/api/quote-budgets/${row.id}`)
      const d = await res.json().catch(() => null)
      const s = d?.suggested as {
        labor_budget_cents: number
        materials_budget_cents: number
        other_budget_cents: number
        target_margin_bps: number | null
      } | null
      if (s) {
        setForm({
          ...emptyForm,
          labor_budget: s.labor_budget_cents ? String(s.labor_budget_cents / 100) : '',
          materials_budget: s.materials_budget_cents ? String(s.materials_budget_cents / 100) : '',
          other_budget: s.other_budget_cents ? String(s.other_budget_cents / 100) : '',
          target_margin: s.target_margin_bps != null ? String(s.target_margin_bps / 100) : '',
        })
      }
    } catch { /* keep blank form on suggestion fetch failure */ }
  }

  async function save(quoteId: string) {
    setErr('')
    setSaving(true)
    try {
      const res = await fetch(`/api/quote-budgets/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labor_budget_cents: toCents(form.labor_budget),
          materials_budget_cents: toCents(form.materials_budget),
          other_budget_cents: toCents(form.other_budget),
          target_margin_bps: form.target_margin.trim() ? Math.round(Number(form.target_margin) * 100) : null,
          labor_actual_cents: toCents(form.labor_actual),
          materials_actual_cents: toCents(form.materials_actual),
          other_actual_cents: toCents(form.other_actual),
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not save budget.'); return }
      setOpenId(null)
      load()
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 13, color: 'var(--sl-ink)', width: '100%', background: '#fff' }
  const lbl: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, marginBottom: 3, display: 'block' }

  return (
    <div style={{ paddingTop: 12 }}>
      {err && <div style={{ background: '#fdecea', color: '#c0392b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div className="sl-section-head">
        <h2 className="sl-section-title">Master Budget<em>.</em></h2>
        <span className="sl-section-meta">{visibleQuotes.length} proposal{visibleQuotes.length === 1 ? '' : 's'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 14px' }}>
        Set a labor + materials budget and target margin per proposal, then log actual costs as the job runs.
        <HelpTip text="There's no automated time tracking or job-scoped expense feed yet, so actuals are entered by hand here." />
      </p>

      <div style={{ marginBottom: 14 }}>
        <select style={{ ...inp, width: 260 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && visibleQuotes.length === 0 && <div className="sl-empty">No proposals to budget yet.</div>}

      <div>
        {visibleQuotes.map((row) => {
          const b = row.budget
          const budgetedTotal = b ? b.labor_budget_cents + b.materials_budget_cents + b.other_budget_cents : 0
          const actualTotal = b ? b.labor_actual_cents + b.materials_actual_cents + b.other_actual_cents : 0
          const varianceCents = budgetedTotal - actualTotal
          const projectedMarginBps = row.total_cents > 0 ? Math.round(((row.total_cents - actualTotal) / row.total_cents) * 10000) : null
          const isOpen = openId === row.id

          return (
            <div key={row.id} style={{ border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: isOpen ? 'var(--sl-canvas,#fafaf8)' : '#fff' }}
                onClick={() => (isOpen ? setOpenId(null) : openBudget(row))}
              >
                <span className={`sl-deal-status ${row.status === 'accepted' || row.status === 'converted' ? 'sold' : row.status === 'declined' || row.status === 'expired' ? 'lost' : 'pending'}`} style={{ minWidth: 76, textAlign: 'center' }}>{row.status}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--sl-ink)' }}>{row.quote_number}{row.title ? ` — ${row.title}` : ''}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--sl-muted)' }}>{row.clients?.name || 'No client'}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--sl-muted)', minWidth: 90, textAlign: 'right' }}>
                  Contract<br /><strong style={{ color: 'var(--sl-ink)', fontSize: 14 }}>{money(row.total_cents)}</strong>
                </span>
                <span style={{ fontSize: 12, color: 'var(--sl-muted)', minWidth: 90, textAlign: 'right' }}>
                  Budgeted<br /><strong style={{ color: 'var(--sl-ink)', fontSize: 14 }}>{b ? money(budgetedTotal) : '—'}</strong>
                </span>
                <span style={{ fontSize: 12, color: 'var(--sl-muted)', minWidth: 90, textAlign: 'right' }}>
                  Actual<br /><strong style={{ color: 'var(--sl-ink)', fontSize: 14 }}>{b ? money(actualTotal) : '—'}</strong>
                </span>
                <span style={{ fontSize: 12, color: 'var(--sl-muted)', minWidth: 100, textAlign: 'right' }}>
                  Variance<br />
                  <strong style={{ fontSize: 14, color: !b ? 'var(--sl-ink)' : varianceCents < 0 ? '#c0392b' : 'var(--sl-good,#1f4d2c)' }}>{b ? money(varianceCents) : '—'}</strong>
                </span>
                <span style={{ fontSize: 12, color: 'var(--sl-muted)', minWidth: 90, textAlign: 'right' }}>
                  Margin<br />
                  <strong style={{ fontSize: 14, color: 'var(--sl-ink)' }}>
                    {projectedMarginBps == null ? '—' : pct(projectedMarginBps)}
                    {b?.target_margin_bps != null && ` / ${pct(b.target_margin_bps)}`}
                  </strong>
                </span>
              </div>

              {isOpen && (
                <div style={{ padding: 14, borderTop: '1px solid var(--sl-line,#e6e6e0)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={lbl}>Labor budget $ <HelpTip text="What you expect to spend on labor for this job." /></label>
                      <input style={inp} value={form.labor_budget} onChange={(e) => setForm({ ...form, labor_budget: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
                    <div><label style={lbl}>Materials/supplies budget $</label>
                      <input style={inp} value={form.materials_budget} onChange={(e) => setForm({ ...form, materials_budget: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
                    <div><label style={lbl}>Other budget $ <HelpTip text="Equipment rental, subcontractors, permits — anything else." /></label>
                      <input style={inp} value={form.other_budget} onChange={(e) => setForm({ ...form, other_budget: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
                    <div><label style={lbl}>Target margin % <HelpTip text="The margin you want to hit on this job. Optional." /></label>
                      <input style={inp} value={form.target_margin} onChange={(e) => setForm({ ...form, target_margin: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 35" /></div>
                  </div>

                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, margin: '14px 0 8px' }}>
                    Actuals — logged by hand as the job runs
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={lbl}>Labor actual $</label>
                      <input style={inp} value={form.labor_actual} onChange={(e) => setForm({ ...form, labor_actual: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
                    <div><label style={lbl}>Materials/supplies actual $</label>
                      <input style={inp} value={form.materials_actual} onChange={(e) => setForm({ ...form, materials_actual: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
                    <div><label style={lbl}>Other actual $</label>
                      <input style={inp} value={form.other_actual} onChange={(e) => setForm({ ...form, other_actual: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={lbl}>Notes</label>
                    <input style={inp} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional — internal only" />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" onClick={() => setOpenId(null)} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 8, padding: '7px 13px', cursor: 'pointer' }}>Cancel</button>
                    <button type="button" className="sl-newlead-btn" disabled={saving} onClick={() => save(row.id)}>{saving ? 'Saving…' : 'Save budget'}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
