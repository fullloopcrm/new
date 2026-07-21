'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import HelpTip from '../_components/HelpTip'

/**
 * Master Budget — a real per-quote budget: an open list of line items
 * (each optionally tagged to the shared categories tree), set at proposal
 * time and compared against actual costs once work starts. Talks to
 * /api/quote-budgets.
 *
 * Line items replace the old 3 fixed labor/materials/other columns -- that
 * fit service/project fine but never fit equipment (a rental's real cost is
 * depreciation + maintenance + delivery, not "labor hours"). Tenants add
 * their own line ("Permit Fees", "Equipment Depreciation Allocation")
 * instead of stuffing everything into "Other".
 *
 * Actuals are entered by hand. There is no job-scoped time tracking or
 * expense tracking in this codebase yet, so there is nothing to roll up
 * automatically — this page is where the tenant records what labor and
 * materials actually cost as the job runs.
 */

type LineItem = {
  id?: string
  category_id: string | null
  label: string
  kind: 'labor' | 'materials' | 'other'
  budgeted_cents: number
  actual_cents: number
}

type Budget = {
  id?: string
  quote_id: string
  target_margin_bps: number | null
  notes: string | null
  budgeted_cents: number
  actual_cents: number
  line_items: LineItem[]
}

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

type Category = { id: string; name: string }

const STATUS_FILTERS = [
  { v: '', l: 'All (excl. declined/expired)' },
  { v: 'sent', l: 'Sent' },
  { v: 'viewed', l: 'Viewed' },
  { v: 'accepted', l: 'Accepted' },
  { v: 'converted', l: 'Converted' },
  { v: 'draft', l: 'Draft' },
]
const HIDDEN_BY_DEFAULT = ['declined', 'expired']
const KIND_LABELS: Record<string, string> = { labor: 'Labor', materials: 'Materials', other: 'Other' }

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
function emptyLine(kind: LineItem['kind'] = 'other'): LineItem {
  return { category_id: null, label: '', kind, budgeted_cents: 0, actual_cents: 0 }
}

const emptyForm = { line_items: [] as LineItem[], target_margin: '', notes: '' }

export default function BudgetTab() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [templateApplied, setTemplateApplied] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateMsg, setTemplateMsg] = useState('')
  const [newBudgetSearch, setNewBudgetSearch] = useState<string | null>(null)

  function load() {
    setLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    Promise.all([
      fetch(`/api/quote-budgets${qs}`).then((r) => r.json()).catch(() => ({ quotes: [] })),
      fetch('/api/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
    ]).then(([q, c]) => {
      setQuotes(q?.quotes || [])
      setCategories(c?.categories || [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleQuotes = useMemo(
    () => (statusFilter ? quotes : quotes.filter((q) => !HIDDEN_BY_DEFAULT.includes(q.status))),
    [quotes, statusFilter]
  )

  const searchResults = useMemo(() => {
    if (newBudgetSearch == null) return []
    const q = newBudgetSearch.trim().toLowerCase()
    if (!q) return quotes.slice(0, 8)
    return quotes.filter((row) =>
      row.quote_number.toLowerCase().includes(q) ||
      (row.title || '').toLowerCase().includes(q) ||
      (row.clients?.name || '').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [newBudgetSearch, quotes])

  const skipNextAutoSave = useRef(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function openBudget(row: QuoteRow) {
    setErr('')
    setTemplateMsg('')
    setNewBudgetSearch(null)
    skipNextAutoSave.current = true
    setOpenId(row.id)
    const b = row.budget
    if (b) {
      setTemplateApplied(false)
      setForm({
        line_items: b.line_items.length ? b.line_items : [emptyLine('labor'), emptyLine('materials'), emptyLine('other')],
        target_margin: b.target_margin_bps != null ? String(b.target_margin_bps / 100) : '',
        notes: b.notes || '',
      })
      return
    }
    // No budget yet -- start from the template-derived suggestion (per
    // matched catalog items' labor-hours/rate, materials cost, overhead,
    // target margin defaults) instead of a blank form.
    setForm({ ...emptyForm, line_items: [emptyLine('labor'), emptyLine('materials'), emptyLine('other')] })
    setTemplateApplied(false)
    try {
      const res = await fetch(`/api/quote-budgets/${row.id}`)
      const d = await res.json().catch(() => null)
      const s = d?.suggested as { target_margin_bps: number | null; line_items: LineItem[] } | null
      if (s) {
        skipNextAutoSave.current = true
        setTemplateApplied(true)
        setForm({
          line_items: s.line_items,
          target_margin: s.target_margin_bps != null ? String(s.target_margin_bps / 100) : '',
          notes: '',
        })
      }
    } catch { /* keep blank form on suggestion fetch failure */ }
  }

  // Auto-save: debounced PUT on any field change while a budget is open.
  // Skipped once right after openBudget populates the form (that's a load,
  // not an edit) via skipNextAutoSave.
  useEffect(() => {
    if (!openId) return
    if (skipNextAutoSave.current) { skipNextAutoSave.current = false; return }
    setAutoSaveStatus('saving')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => { save(openId, { silent: true }) }, 800)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, openId])

  async function saveAsTemplate(quoteId: string) {
    setSavingTemplate(true)
    setTemplateMsg('')
    try {
      const res = await fetch(`/api/quote-budgets/${quoteId}/save-as-template`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_items: form.line_items,
          target_margin_bps: form.target_margin.trim() ? Math.round(Number(form.target_margin) * 100) : null,
        }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok) { setTemplateMsg((d && d.error) || 'Could not save template.'); return }
      setTemplateMsg(`Template updated on ${d.updated_service_type_ids.length} catalog item${d.updated_service_type_ids.length === 1 ? '' : 's'}${d.skipped_materials ? ` (materials left as-is on ${d.skipped_materials} — driven by real inventory cost)` : ''}.`)
    } finally { setSavingTemplate(false) }
  }

  async function save(quoteId: string, opts?: { silent?: boolean }) {
    if (!opts?.silent) setErr('')
    setSaving(true)
    try {
      const res = await fetch(`/api/quote-budgets/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_items: form.line_items.filter((li) => li.label.trim()),
          target_margin_bps: form.target_margin.trim() ? Math.round(Number(form.target_margin) * 100) : null,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        if (opts?.silent) setAutoSaveStatus('idle')
        else setErr((d && d.error) || 'Could not save budget.')
        return
      }
      if (opts?.silent) {
        setAutoSaveStatus('saved')
      } else {
        setOpenId(null)
        load()
      }
    } finally { setSaving(false) }
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setForm((f) => ({ ...f, line_items: f.line_items.map((li, i) => (i === idx ? { ...li, ...patch } : li)) }))
  }
  function addLine() {
    setForm((f) => ({ ...f, line_items: [...f.line_items, emptyLine()] }))
  }
  function removeLine(idx: number) {
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }))
  }

  const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 13, color: 'var(--sl-ink)', width: '100%', background: '#fff' }
  const lbl: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, marginBottom: 3, display: 'block' }

  const formBudgetedTotal = form.line_items.reduce((s, li) => s + li.budgeted_cents, 0)
  const formActualTotal = form.line_items.reduce((s, li) => s + li.actual_cents, 0)

  return (
    <div style={{ paddingTop: 12 }}>
      {err && <div style={{ background: '#fdecea', color: '#c0392b', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div>}

      <div className="sl-section-head">
        <h2 className="sl-section-title">Master Budget<em>.</em></h2>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sl-section-meta">{visibleQuotes.length} proposal{visibleQuotes.length === 1 ? '' : 's'}</span>
          <button type="button" className="sl-newlead-btn" onClick={() => setNewBudgetSearch(newBudgetSearch == null ? '' : null)}>
            + New Budget
          </button>
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 14px' }}>
        Set line-item budgets and a target margin per proposal, then log actual costs as the job runs.
        <HelpTip text="There's no automated time tracking or job-scoped expense feed yet, so actuals are entered by hand here." />
      </p>

      {newBudgetSearch != null && (
        <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <input
            autoFocus
            style={inp}
            value={newBudgetSearch}
            onChange={(e) => setNewBudgetSearch(e.target.value)}
            placeholder="Search proposals by number, title, or client…"
          />
          <div style={{ marginTop: 8 }}>
            {searchResults.length === 0 && <div style={{ fontSize: 12, color: 'var(--sl-muted)', padding: '6px 2px' }}>No proposals match.</div>}
            {searchResults.map((row) => (
              <div
                key={row.id}
                onClick={() => openBudget(row)}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', borderTop: '1px solid var(--sl-line,#eee)', cursor: 'pointer', fontSize: 13 }}
              >
                <span>{row.quote_number}{row.title ? ` — ${row.title}` : ''}</span>
                <span style={{ color: 'var(--sl-muted)' }}>{row.clients?.name || 'No client'}{row.budget ? ' · has budget' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          const budgetedTotal = b?.budgeted_cents || 0
          const actualTotal = b?.actual_cents || 0
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
                {!b && !isOpen && (
                  <button
                    type="button"
                    className="sl-newlead-btn"
                    onClick={(e) => { e.stopPropagation(); openBudget(row) }}
                    style={{ fontSize: 11, padding: '6px 12px' }}
                  >
                    + Create Budget
                  </button>
                )}
              </div>

              {isOpen && (
                <div style={{ padding: 14, borderTop: '1px solid var(--sl-line,#e6e6e0)' }}>
                  {templateApplied && (
                    <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#1d4ed8', background: '#dbeafe', padding: '3px 10px', borderRadius: 999, marginBottom: 10 }}>
                      Template applied — pre-filled from catalog defaults
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ flex: '2 1 0', ...lbl }}>Line item</div>
                    <div style={{ flex: '1 1 0', ...lbl }}>Kind</div>
                    <div style={{ flex: '1.4 1 0', ...lbl }}>Category</div>
                    <div style={{ width: 100, ...lbl }}>Budgeted $</div>
                    <div style={{ width: 100, ...lbl }}>Actual $</div>
                    <div style={{ width: 24 }} />
                  </div>
                  {form.line_items.map((li, idx) => (
                    <div key={li.id || idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <input style={{ ...inp, flex: '2 1 0' }} value={li.label} onChange={(e) => updateLine(idx, { label: e.target.value })} placeholder="e.g. Labor, Permit Fees, Equipment Depreciation" />
                      <select style={{ ...inp, flex: '1 1 0' }} value={li.kind} onChange={(e) => updateLine(idx, { kind: e.target.value as LineItem['kind'] })}>
                        {Object.entries(KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <select style={{ ...inp, flex: '1.4 1 0' }} value={li.category_id || ''} onChange={(e) => updateLine(idx, { category_id: e.target.value || null })}>
                        <option value="">No category</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input style={{ ...inp, width: 100 }} value={(li.budgeted_cents / 100).toString()} onChange={(e) => updateLine(idx, { budgeted_cents: toCents(e.target.value) })} placeholder="0" />
                      <input style={{ ...inp, width: 100 }} value={(li.actual_cents / 100).toString()} onChange={(e) => updateLine(idx, { actual_cents: toCents(e.target.value) })} placeholder="0" />
                      <button type="button" onClick={() => removeLine(idx)} style={{ width: 24, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                  ))}
                  <button type="button" onClick={addLine} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', marginTop: 4, marginBottom: 12 }}>
                    + Add line item
                  </button>

                  <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--sl-muted)', marginBottom: 12 }}>
                    <span>Total budgeted: <strong style={{ color: 'var(--sl-ink)' }}>{money(formBudgetedTotal)}</strong></span>
                    <span>Total actual: <strong style={{ color: 'var(--sl-ink)' }}>{money(formActualTotal)}</strong></span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div><label style={lbl}>Target margin % <HelpTip text="The margin you want to hit on this job. Optional." /></label>
                      <input style={inp} value={form.target_margin} onChange={(e) => setForm({ ...form, target_margin: e.target.value.replace(/[^\d.]/g, '') })} placeholder="e.g. 35" /></div>
                    <div><label style={lbl}>Notes</label>
                      <input style={inp} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional — internal only" /></div>
                  </div>

                  {templateMsg && <div style={{ fontSize: 12, color: 'var(--sl-muted)', marginBottom: 8 }}>{templateMsg}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--sl-muted)' }}>
                      {autoSaveStatus === 'saving' && 'Saving…'}
                      {autoSaveStatus === 'saved' && 'Saved'}
                    </span>
                    <span style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        disabled={savingTemplate}
                        onClick={() => saveAsTemplate(row.id)}
                        title="Push labor/overhead/margin numbers back onto the matched catalog items' defaults so future quotes start from them. Materials are left alone when a real bill of materials exists."
                        style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 8, padding: '7px 13px', cursor: 'pointer' }}
                      >
                        {savingTemplate ? 'Saving template…' : 'Save as Template'}
                      </button>
                      <button type="button" onClick={() => setOpenId(null)} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 8, padding: '7px 13px', cursor: 'pointer' }}>Close</button>
                      <button type="button" className="sl-newlead-btn" disabled={saving} onClick={() => save(row.id)}>{saving ? 'Saving…' : 'Save now'}</button>
                    </span>
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
