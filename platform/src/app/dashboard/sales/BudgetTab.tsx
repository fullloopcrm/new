'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import HelpTip from '../_components/HelpTip'

/**
 * Budgets — a real per-quote budget: compared against actual costs
 * once work starts. Talks to /api/quote-budgets.
 *
 * A quote's budget ALWAYS comes from applying a saved Budget Template
 * (a standalone, reusable package built on the Templates tab of this same
 * page, see BudgetTemplatesTab.tsx) -- there is no ad-hoc/blank line-item
 * builder here and no auto-derived
 * suggestion from catalog defaults. Building a budget from scratch, tied
 * to a specific customer's name, was the wrong first step; templates are
 * built once, then applied to whichever quote needs them.
 *
 * Once applied, budgeted $ per line stays editable here (per-job
 * adjustment) and actual $ is entered by hand as the job runs -- there is
 * no job-scoped time/expense tracking in this codebase yet to roll up
 * automatically.
 */

type LineItem = {
  id?: string
  category_id: string | null
  label: string
  kind: 'labor' | 'materials' | 'equipment' | 'other'
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
const KIND_LABELS: Record<string, string> = { labor: 'Labor', materials: 'Materials', equipment: 'Equipment', other: 'Other' }

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

const emptyForm = { line_items: [] as LineItem[], target_margin: '', notes: '' }

export default function BudgetTab({ onSwitchToTemplates }: { onSwitchToTemplates: () => void }) {
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [templateMsg, setTemplateMsg] = useState('')
  const [savedTemplates, setSavedTemplates] = useState<{ id: string; name: string }[]>([])
  const [applyingTemplateId, setApplyingTemplateId] = useState('')

  function load() {
    setLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    Promise.all([
      fetch(`/api/quote-budgets${qs}`).then((r) => r.json()).catch(() => ({ quotes: [] })),
      fetch('/api/categories').then((r) => r.json()).catch(() => ({ categories: [] })),
      fetch('/api/budget-templates').then((r) => r.json()).catch(() => ({ templates: [] })),
    ]).then(([q, c, t]) => {
      setQuotes(q?.quotes || [])
      setCategories(c?.categories || [])
      setSavedTemplates(t?.templates || [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleQuotes = useMemo(
    () => (statusFilter ? quotes : quotes.filter((q) => !HIDDEN_BY_DEFAULT.includes(q.status))),
    [quotes, statusFilter]
  )

  const skipNextAutoSave = useRef(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openBudget(row: QuoteRow) {
    setErr('')
    setTemplateMsg('')
    setApplyingTemplateId('')
    skipNextAutoSave.current = true
    setOpenId(row.id)
    const b = row.budget
    setForm(
      b
        ? { line_items: b.line_items, target_margin: b.target_margin_bps != null ? String(b.target_margin_bps / 100) : '', notes: b.notes || '' }
        : { ...emptyForm }
    )
  }

  async function applySavedTemplate(quoteId: string, templateId: string) {
    if (!templateId) return
    setTemplateMsg('')
    const res = await fetch(`/api/budget-templates/${templateId}/apply-to-quote/${quoteId}`, { method: 'POST' })
    if (!res.ok) {
      const d = await res.json().catch(() => null)
      setTemplateMsg((d && d.error) || 'Could not apply template.')
      return
    }
    skipNextAutoSave.current = true
    const budgetRes = await fetch(`/api/quote-budgets/${quoteId}`)
    const d = await budgetRes.json().catch(() => null)
    if (d?.budget) {
      setForm({
        line_items: d.budget.line_items,
        target_margin: d.budget.target_margin_bps != null ? String(d.budget.target_margin_bps / 100) : '',
        notes: d.budget.notes || '',
      })
    }
    setApplyingTemplateId('')
    load()
  }

  // Auto-save: debounced PUT on any field change while a budget is open.
  // Skipped once right after openBudget/applySavedTemplate populates the
  // form (that's a load, not an edit) via skipNextAutoSave.
  useEffect(() => {
    if (!openId) return
    if (skipNextAutoSave.current) { skipNextAutoSave.current = false; return }
    if (!form.line_items.length) return // nothing to save until a template's been applied
    setAutoSaveStatus('saving')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => { save(openId, { silent: true }) }, 800)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, openId])

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
        <h2 className="sl-section-title">Budgets<em>.</em></h2>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="sl-section-meta">{visibleQuotes.length} proposal{visibleQuotes.length === 1 ? '' : 's'}</span>
          <button type="button" className="sl-newlead-btn" onClick={onSwitchToTemplates}>
            + New Budget
          </button>
        </span>
      </div>
      <ol style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 14px', paddingLeft: 18 }}>
        <li><strong style={{ color: 'var(--sl-ink)' }}>Build a template</strong> on the Templates tab (once, reusable) <HelpTip text="A template is a costed version of a package you sell — its own labor, materials, and target gross margin. Build it once, apply it to as many proposals as fit." /></li>
        <li><strong style={{ color: 'var(--sl-ink)' }}>Apply it</strong> to a proposal below — its line items copy in</li>
        <li><strong style={{ color: 'var(--sl-ink)' }}>Adjust</strong> the dollar amounts for this specific job if needed</li>
        <li><strong style={{ color: 'var(--sl-ink)' }}>Log actuals</strong> by hand as the job runs <HelpTip text="There's no automated time tracking or job-scoped expense feed yet, so actual costs are entered here manually." /> — Actual vs. Target Gross Margin shows on each row</li>
      </ol>
      <p style={{ fontSize: 11, color: 'var(--sl-muted)', margin: '0 0 14px' }}>
        This controls <strong>Gross Margin</strong> — revenue minus the direct job costs (COGS) you enter here. It does not cover <strong>Net Margin</strong>, which also subtracts company-wide overhead (rent, insurance, admin) — that&apos;s not tracked per-job.
      </p>
      <button type="button" onClick={onSwitchToTemplates} style={{ fontSize: 12, background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginBottom: 14, display: 'block' }}>Manage templates →</button>

      <div style={{ marginBottom: 14 }}>
        <select style={{ ...inp, width: 260 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && visibleQuotes.length === 0 && <div className="sl-empty">No proposals to budget yet.</div>}
      {!loading && visibleQuotes.length > 0 && savedTemplates.length === 0 && (
        <div className="sl-empty">No Budget Templates yet — <button type="button" onClick={onSwitchToTemplates} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>build one first</button>, then come back to apply it to a proposal.</div>
      )}

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
                <span style={{ fontSize: 12, color: 'var(--sl-muted)', minWidth: 110, textAlign: 'right' }}>
                  Gross Margin <HelpTip text="Actual = (contract price − actual costs logged) / contract price. Target = the goal set on the applied template. Red means you're under target." />
                  <br />
                  <strong style={{
                    fontSize: 14,
                    color: !b || projectedMarginBps == null || b.target_margin_bps == null
                      ? 'var(--sl-ink)'
                      : projectedMarginBps >= b.target_margin_bps ? 'var(--sl-good,#1f4d2c)' : '#c0392b',
                  }}>
                    {projectedMarginBps == null ? '—' : pct(projectedMarginBps)}
                  </strong>
                  {b?.target_margin_bps != null && <span style={{ fontSize: 11 }}> / target {pct(b.target_margin_bps)}</span>}
                </span>
                {!b && !isOpen && (
                  <button
                    type="button"
                    className="sl-newlead-btn"
                    onClick={(e) => { e.stopPropagation(); openBudget(row) }}
                    style={{ fontSize: 11, padding: '6px 12px' }}
                  >
                    + Apply Budget
                  </button>
                )}
              </div>

              {isOpen && (
                <div style={{ padding: 14, borderTop: '1px solid var(--sl-line,#e6e6e0)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <label style={{ ...lbl, marginBottom: 0 }}>{form.line_items.length ? 'Replace with a different package' : 'Apply a package'} <HelpTip text="Budgets always start from a Budget Template. Pick one to pull its line items in, then adjust the dollar amounts here for this specific job." /></label>
                    <select
                      style={{ ...inp, width: 240 }}
                      value={applyingTemplateId}
                      disabled={!savedTemplates.length}
                      onChange={(e) => { setApplyingTemplateId(e.target.value); applySavedTemplate(row.id, e.target.value) }}
                    >
                      <option value="">{savedTemplates.length ? 'Choose a template…' : 'No templates yet'}</option>
                      {savedTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {form.line_items.length > 0 && <span style={{ fontSize: 11, color: 'var(--sl-muted)' }}>Overwrites current line items</span>}
                  </div>

                  {form.line_items.length === 0 ? (
                    <div className="sl-empty" style={{ marginBottom: 8 }}>
                      {savedTemplates.length ? 'Pick a template above to start this budget.' : (<>No Budget Templates exist yet — <button type="button" onClick={onSwitchToTemplates} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>build one</button> first.</>)}
                    </div>
                  ) : (
                    <>
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
                          <div style={{ ...inp, flex: '2 1 0', background: 'var(--sl-canvas,#fafaf8)' }}>{li.label}</div>
                          <div style={{ ...inp, flex: '1 1 0', background: 'var(--sl-canvas,#fafaf8)' }}>{KIND_LABELS[li.kind]}</div>
                          <select style={{ ...inp, flex: '1.4 1 0' }} value={li.category_id || ''} onChange={(e) => updateLine(idx, { category_id: e.target.value || null })}>
                            <option value="">No category</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <input style={{ ...inp, width: 100 }} value={(li.budgeted_cents / 100).toString()} onChange={(e) => updateLine(idx, { budgeted_cents: toCents(e.target.value) })} placeholder="0" title="Adjust for this specific job" />
                          <input style={{ ...inp, width: 100 }} value={(li.actual_cents / 100).toString()} onChange={(e) => updateLine(idx, { actual_cents: toCents(e.target.value) })} placeholder="0" />
                          <button type="button" onClick={() => removeLine(idx)} title="Remove this line from this job only" style={{ width: 24, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 16 }}>×</button>
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--sl-muted)', margin: '8px 0 12px' }}>
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
                          <button type="button" onClick={() => setOpenId(null)} style={{ fontSize: 12, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 8, padding: '7px 13px', cursor: 'pointer' }}>Close</button>
                          <button type="button" className="sl-newlead-btn" disabled={saving} onClick={() => save(row.id)}>{saving ? 'Saving…' : 'Save now'}</button>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
