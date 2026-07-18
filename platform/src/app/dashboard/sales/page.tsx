'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import './sales.css'
import CalendarShell from '../calendar/CalendarShell'

// The sales process IS the tabs, left→right. Deals move between them via the
// stage dropdown on each card. Schedule is the calendar. (The Master Catalog is
// its own page under Sales in the main menu — it lives in proposal creation.)
type Tab = 'pipeline' | 'leads' | 'qualify' | 'quotes' | 'sales' | 'schedule'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'pipeline', letter: 'A', label: 'Pipeline' },
  { key: 'leads', letter: 'B', label: 'Leads' },
  { key: 'qualify', letter: 'C', label: 'Qualify' },
  { key: 'quotes', letter: 'D', label: 'Quotes' },
  { key: 'sales', letter: 'E', label: 'Sales' },
  { key: 'schedule', letter: 'F', label: 'Schedule' },
]
// Tips teach the process. It all starts with a Lead and flows left → right.
const TAB_TIPS: Record<Tab, string> = {
  pipeline: 'The whole pipeline at a glance. Every deal flows left → right: Lead → Qualify → Quote → Sold → Schedule. It all starts on the Leads tab.',
  leads: 'Step 1 — it all starts here. Every lead (web form or + New Lead) becomes a client automatically. Open one, log your first call/text/email, and it moves to Qualify.',
  qualify: 'Step 2 — work the lead. Confirm scope & fit in the notes. Mark Qualified to send a proposal, or Not Qualified to close it out with a reason.',
  quotes: 'Step 3 — the proposal. Build a real quote (line items + optional deposit) and send it by email + text. When the customer signs, it moves toward Sold.',
  sales: 'Step 4 — the close. Signed proposals land here: Pending (awaiting deposit) or Sold. Instant bookings auto-land here too.',
  schedule: 'Step 5 — put it on the calendar. A sold job opens the schedule window — pick the date and the visit lands on the calendar.',
}

// Locked stage spine (matches DB + pipeline.ts). Labels are operator-facing.
type Stage = 'new' | 'qualifying' | 'quoted' | 'pending' | 'sold' | 'lost'
const STAGES: Array<{ key: Stage; label: string }> = [
  { key: 'new', label: 'Lead' },
  { key: 'qualifying', label: 'Qualify' },
  { key: 'quoted', label: 'Quote' },
  { key: 'pending', label: 'Pending' },
  { key: 'sold', label: 'Sold' },
  { key: 'lost', label: 'Lost' },
]
// Which stage(s) each deal tab shows.
const TAB_STAGES: Record<Exclude<Tab, 'schedule'>, Stage[]> = {
  pipeline: ['new', 'qualifying', 'quoted', 'pending', 'sold', 'lost'],
  leads: ['new'],
  qualify: ['qualifying'],
  quotes: ['quoted'],
  sales: ['pending', 'sold', 'lost'],
}

// Canned "why we lost it" reasons for the Not-Qualified / Lost tag.
const LOST_REASONS: Array<{ key: string; label: string }> = [
  { key: 'not_qualified', label: 'Not qualified' },
  { key: 'no_budget', label: 'No budget' },
  { key: 'went_elsewhere', label: 'Went elsewhere' },
  { key: 'no_response', label: 'No response' },
  { key: 'other', label: 'Other' },
]
function lostReasonLabel(key: string | null): string {
  if (!key) return 'Lost'
  return LOST_REASONS.find((r) => r.key === key)?.label || 'Lost'
}

// Activity channels the operator can log from a card.
type ActType = 'note' | 'call' | 'text' | 'email'
const ACT_TYPES: Array<{ key: ActType; label: string }> = [
  { key: 'note', label: 'Note' },
  { key: 'call', label: 'Call' },
  { key: 'text', label: 'Text' },
  { key: 'email', label: 'Email' },
]

type Deal = {
  id: string
  client_id: string | null
  title: string
  stage: string
  value_cents: number
  probability: number | null
  source: string | null
  notes: string | null
  status: string | null
  lost_reason: string | null
  last_activity_at: string | null
  last_contacted_at: string | null
  created_at: string
  clients: { name: string | null; email: string | null; phone: string | null; address: string | null } | null
}

type Activity = {
  id: string
  type: string
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

type Quote = {
  id: string
  quote_number: string | null
  status: string
  total_cents: number | null
  deposit_cents: number | null
  deposit_paid_at: string | null
  converted_job_id: string | null
  sent_at: string | null
  accepted_at: string | null
  declined_at: string | null
}

function fmtMoney(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}
function ageDays(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000))
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function relTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const ACT_ICON: Record<string, string> = {
  note: '📝', call: '📞', text: '💬', email: '✉️',
  stage_change: '↗', follow_up_set: '⏰', quote_sent: '📄',
  auto_created: '✨',
}

function SalesPageInner() {
  const sp = useSearchParams()
  const [tab, setTab] = useState<Tab>('pipeline')
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewLead, setShowNewLead] = useState(false)
  const [nl, setNl] = useState({ name: '', phone: '', email: '', service: '', value: '', notes: '' })
  const [nlSaving, setNlSaving] = useState(false)
  const [nlErr, setNlErr] = useState('')

  // Per-card working state.
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activities, setActivities] = useState<Record<string, Activity[]>>({})
  const [actLoading, setActLoading] = useState<Record<string, boolean>>({})
  const [quotesByDeal, setQuotesByDeal] = useState<Record<string, Quote[]>>({})
  const [composer, setComposer] = useState<{ type: ActType; text: string }>({ type: 'note', text: '' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reasonFor, setReasonFor] = useState<string | null>(null)
  const [reason, setReason] = useState<string>('not_qualified')
  const [schedFor, setSchedFor] = useState<string | null>(null)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('09:00')
  const [schedDuration, setSchedDuration] = useState('2')
  const [schedCrew, setSchedCrew] = useState('')
  const [crews, setCrews] = useState<Array<{ id: string; name: string }>>([])

  const loadDeals = () => {
    setLoading(true)
    fetch('/api/deals')
      .then((r) => r.json())
      .then((d) => setDeals((d?.deals || []) as Deal[]))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadDeals() }, [])
  // Open the tab named in ?tab= (sidebar deep-links point here).
  useEffect(() => {
    const t = sp.get('tab')
    if (t && TABS.some((x) => x.key === t)) setTab(t as Tab)
  }, [sp])

  async function loadActivities(id: string) {
    setActLoading((m) => ({ ...m, [id]: true }))
    try {
      const r = await fetch(`/api/deals/${id}/activities`)
      const d = await r.json()
      setActivities((m) => ({ ...m, [id]: Array.isArray(d) ? d : [] }))
    } catch {
      setActivities((m) => ({ ...m, [id]: [] }))
    } finally {
      setActLoading((m) => ({ ...m, [id]: false }))
    }
  }

  async function loadQuotes(id: string) {
    try {
      const r = await fetch(`/api/quotes?deal_id=${id}`)
      const d = await r.json()
      setQuotesByDeal((m) => ({ ...m, [id]: (d?.quotes || []) as Quote[] }))
    } catch {
      setQuotesByDeal((m) => ({ ...m, [id]: [] }))
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    setComposer({ type: 'note', text: '' })
    setReasonFor(null)
    if (!activities[id]) loadActivities(id)
    loadQuotes(id)
    if (crews.length === 0) {
      fetch('/api/crews').then((r) => r.json())
        .then((d) => setCrews((d?.crews || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))))
        .catch(() => {})
    }
  }

  async function moveDeal(id: string, stage: string, lostReason?: string) {
    setBusyId(id)
    try {
      await fetch(`/api/deals/${id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, ...(lostReason ? { lost_reason: lostReason } : {}) }),
      })
    } catch { /* ignore */ }
    setReasonFor(null)
    if (expandedId === id) await loadActivities(id)
    loadDeals()
    setBusyId(null)
  }

  async function scheduleSession(dealId: string, jobId: string) {
    if (!schedDate) return
    setBusyId(dealId)
    try {
      const startIso = new Date(`${schedDate}T${schedTime || '09:00'}`).toISOString()
      const res = await fetch(`/api/jobs/${jobId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startIso,
          duration_hours: Number(schedDuration) || 2,
          ...(schedCrew ? { crew_id: schedCrew } : {}),
        }),
      })
      if (res.ok) {
        setSchedFor(null)
        setSchedDate('')
        await loadActivities(dealId)
      }
    } catch { /* ignore */ }
    setBusyId(null)
  }

  async function logActivity(id: string, stage: string) {
    const text = composer.text.trim()
    if (!text) return
    setBusyId(id)
    try {
      await fetch(`/api/deals/${id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: composer.type, description: text }),
      })
      setComposer({ type: 'note', text: '' })
      await loadActivities(id)
      // First outbound touch on a raw lead advances it into Qualifying.
      if (stage === 'new' && (composer.type === 'call' || composer.type === 'text' || composer.type === 'email')) {
        await moveDeal(id, 'qualifying')
      } else {
        loadDeals()
      }
    } catch { /* ignore */ }
    setBusyId(null)
  }

  async function submitNewLead() {
    setNlErr('')
    if (!nl.name.trim()) { setNlErr('Name is required.'); return }
    if (nl.phone.replace(/\D/g, '').length < 10) { setNlErr('A valid phone is required.'); return }
    if (!/^\S+@\S+\.\S+$/.test(nl.email.trim())) { setNlErr('A valid email is required.'); return }
    setNlSaving(true)
    try {
      const res = await fetch('/api/deals/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nl.name.trim(),
          phone: nl.phone.trim() || undefined,
          email: nl.email.trim() || undefined,
          service: nl.service.trim() || undefined,
          value_cents: nl.value ? Math.round(Number(nl.value) * 100) : 0,
          notes: nl.notes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setNlErr((data && data.error) || 'Could not create lead.'); setNlSaving(false); return }
      setShowNewLead(false)
      setNl({ name: '', phone: '', email: '', service: '', value: '', notes: '' })
      loadDeals()
    } catch {
      setNlErr('Network error.')
    } finally {
      setNlSaving(false)
    }
  }

  const byStage = useMemo(() => {
    const map = new Map<Stage, Deal[]>()
    for (const s of STAGES) map.set(s.key, [])
    for (const d of deals) {
      const stage = (d.stage as Stage) || 'new'
      if (map.has(stage)) map.get(stage)!.push(d)
    }
    return map
  }, [deals])

  const stageDeals = tab === 'schedule' ? [] : TAB_STAGES[tab].flatMap((s) => byStage.get(s) || [])
  const stageTotal = stageDeals.reduce((sum, d) => sum + d.value_cents, 0)
  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? ''

  return (
    <div className="sl-scope">
      <div className="sl-tabs">
        {TABS.map((t) => {
          const count = t.key === 'schedule' ? 0 : TAB_STAGES[t.key].flatMap((s) => byStage.get(s) || []).length
          return (
            <button key={t.key} className={`sl-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} type="button">
              <span className="sl-tab-letter">{t.letter}</span>
              {t.label}
              {count > 0 && <span className="sl-tab-count">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="sl-tabbar-note">
        <span className="sl-tab-tip"><span className="sl-tab-tip-letter">{TABS.find((t) => t.key === tab)?.letter}</span>{TAB_TIPS[tab]}</span>
        {tab === 'leads' && <button type="button" className="sl-newlead-btn" onClick={() => setShowNewLead(true)}>+ New Lead</button>}
      </div>

      {tab === 'schedule' && <CalendarShell />}

      {tab !== 'schedule' && (
        <>
          <div className="sl-section-head">
            <h2 className="sl-section-title">{activeLabel}<em>.</em></h2>
            <span className="sl-section-meta">{stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'} · {fmtMoney(stageTotal)}</span>
          </div>

          <div className="sl-stage-list">
            {!loading && stageDeals.length > 0 && (
              <div className="sl-thead">
                <span />
                <span>Name</span>
                <span>Detail</span>
                <span>Source</span>
                <span>Value</span>
                <span>Date</span>
                <span>Age</span>
                <span>Stage</span>
              </div>
            )}
            {loading && <div className="sl-empty">Loading…</div>}
            {!loading && stageDeals.length === 0 && <div className="sl-empty">Nothing in {activeLabel} yet.</div>}
            {stageDeals.map((d) => {
              const age = ageDays(d.last_activity_at || d.created_at)
              const ageClass = age >= 14 ? 'danger' : age >= 7 ? 'warn' : ''
              const dealClass = d.probability && d.probability >= 75 ? 'hot' : age >= 14 ? 'stale' : age >= 7 ? 'aging' : ''
              const src = (d.source || 'web').toLowerCase()
              const srcSafe: 'selena' | 'web' | 'referral' | 'repeat' =
                src.includes('selena') ? 'selena' : src === 'referral' ? 'referral' : src === 'repeat' ? 'repeat' : 'web'
              const isOpen = expandedId === d.id
              const acts = activities[d.id] || []
              return (
                <div key={d.id} className={`sl-deal ${dealClass} ${isOpen ? 'open' : ''}`}>
                  <div className="sl-row" onClick={() => toggleExpand(d.id)}>
                    <span className="sl-row-caret">{isOpen ? '▾' : '▸'}</span>
                    <span className="sl-row-name">{d.clients?.name || d.title || 'Untitled'}</span>
                    <span className="sl-row-ctx">{d.title || (d.clients?.address ?? '—')}</span>
                    <span className="sl-row-chip">
                      {d.stage === 'lost'
                        ? <span className="sl-deal-status lost">{lostReasonLabel(d.lost_reason)}</span>
                        : ['pending', 'sold'].includes(d.stage)
                          ? <span className={`sl-deal-status ${d.stage}`}>{cap(d.stage)}</span>
                          : <span className={`sl-deal-source ${srcSafe}`}>{srcSafe}</span>}
                    </span>
                    <span className="sl-row-value">{fmtMoney(d.value_cents)}</span>
                    <span className="sl-row-date">{new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className={`sl-row-age ${ageClass}`}>{age === 0 ? 'today' : `${age}d`}</span>
                    <select className="sl-row-move" value={d.stage} onClick={(e) => e.stopPropagation()} onChange={(e) => moveDeal(d.id, e.target.value)}>
                      {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>

                  {isOpen && (
                    <div className="sl-deal-panel">
                      {/* Contact info + deal notes */}
                      {(d.clients?.phone || d.clients?.email || d.clients?.address || d.notes) && (
                        <div className="sl-proposal">
                          {(d.clients?.phone || d.clients?.email || d.clients?.address) && (
                            <>
                              <div className="sl-proposal-head">Contact</div>
                              <div className="sl-contact-line">
                                {d.clients?.phone && <a href={`tel:${d.clients.phone}`} className="sl-contact-item">{d.clients.phone}</a>}
                                {d.clients?.email && <a href={`mailto:${d.clients.email}`} className="sl-contact-item">{d.clients.email}</a>}
                                {d.clients?.address && <span className="sl-contact-item">{d.clients.address}</span>}
                              </div>
                            </>
                          )}
                          {d.notes && (
                            <>
                              <div className="sl-proposal-head">Notes</div>
                              <div className="sl-contact-notes">{d.notes}</div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Stage-driven primary actions */}
                      <div className="sl-actions">
                        {d.stage === 'new' && (
                          <span className="sl-action-hint">Log a call/text/email below to move this into Qualify.</span>
                        )}
                        {d.stage === 'qualifying' && reasonFor !== d.id && (
                          <>
                            <button type="button" className="sl-act-btn go" disabled={busyId === d.id} onClick={() => moveDeal(d.id, 'quoted')}>Qualified → Proposal</button>
                            <button type="button" className="sl-act-btn kill" disabled={busyId === d.id} onClick={() => { setReasonFor(d.id); setReason('not_qualified') }}>Not Qualified</button>
                          </>
                        )}
                        {d.stage === 'qualifying' && reasonFor === d.id && (
                          <div className="sl-reason">
                            <select value={reason} onChange={(e) => setReason(e.target.value)}>
                              {LOST_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                            </select>
                            <button type="button" className="sl-act-btn kill" disabled={busyId === d.id} onClick={() => moveDeal(d.id, 'lost', reason)}>Confirm — mark Lost</button>
                            <button type="button" className="sl-act-btn ghost" onClick={() => setReasonFor(null)}>Cancel</button>
                          </div>
                        )}
                      </div>

                      {/* Proposal — build/send an actual quote, linked to this deal */}
                      {(['quoted', 'pending', 'sold'].includes(d.stage) || (quotesByDeal[d.id]?.length ?? 0) > 0) && (
                        <div className="sl-proposal">
                          <div className="sl-proposal-head">Proposal</div>
                          {(quotesByDeal[d.id] || []).map((q) => (
                            <a key={q.id} href={`/dashboard/sales/quotes/${q.id}`} className="sl-proposal-row">
                              <span className="sl-proposal-num">{q.quote_number || 'Draft'}</span>
                              <span className={`sl-proposal-status ${q.status}`}>{q.status}</span>
                              <span className="sl-proposal-total">{fmtMoney(q.total_cents || 0)}</span>
                            </a>
                          ))}
                          <a href={`/dashboard/sales/quotes/new?deal=${d.id}`} className="sl-act-btn go">
                            {(quotesByDeal[d.id]?.length ?? 0) > 0 ? '+ New proposal' : 'Build Proposal →'}
                          </a>
                        </div>
                      )}

                      {/* Schedule — once the sale is a Job, drop visits on the calendar */}
                      {(() => {
                        const jobId = (quotesByDeal[d.id] || []).map((q) => q.converted_job_id).find(Boolean) || null
                        if (!jobId) return null
                        return (
                          <div className="sl-proposal">
                            <div className="sl-proposal-head">Schedule</div>
                            {schedFor === d.id ? (
                              <div className="sl-reason">
                                <input type="date" className="sl-sched-input" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
                                <input type="time" className="sl-sched-input" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
                                <input type="number" min="0.5" step="0.5" className="sl-sched-input" style={{ width: 62 }} value={schedDuration} onChange={(e) => setSchedDuration(e.target.value)} title="Hours" />
                                <select className="sl-sched-input" value={schedCrew} onChange={(e) => setSchedCrew(e.target.value)} title="Crew">
                                  <option value="">No crew</option>
                                  {crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button type="button" className="sl-act-btn go" disabled={busyId === d.id || !schedDate} onClick={() => scheduleSession(d.id, jobId)}>Add to calendar</button>
                                <button type="button" className="sl-act-btn ghost" onClick={() => setSchedFor(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button type="button" className="sl-act-btn go" onClick={() => { setSchedFor(d.id); setSchedDate('') }}>+ Schedule a visit</button>
                            )}
                          </div>
                        )
                      })()}

                      {/* Ongoing-notes composer — carries through every stage */}
                      <div className="sl-composer">
                        <div className="sl-composer-types">
                          {ACT_TYPES.map((a) => (
                            <button key={a.key} type="button" className={`sl-chan ${composer.type === a.key ? 'active' : ''}`} onClick={() => setComposer((c) => ({ ...c, type: a.key }))}>{a.label}</button>
                          ))}
                        </div>
                        <textarea
                          className="sl-composer-input"
                          rows={2}
                          placeholder={composer.type === 'note' ? 'Add a note…' : `Log the ${composer.type}…`}
                          value={composer.text}
                          onChange={(e) => setComposer((c) => ({ ...c, text: e.target.value }))}
                        />
                        <button type="button" className="sl-act-btn" disabled={busyId === d.id || !composer.text.trim()} onClick={() => logActivity(d.id, d.stage)}>
                          {busyId === d.id ? 'Saving…' : 'Log it'}
                        </button>
                      </div>

                      {/* Timeline */}
                      <div className="sl-timeline">
                        {actLoading[d.id] && <div className="sl-tl-empty">Loading history…</div>}
                        {!actLoading[d.id] && acts.length === 0 && <div className="sl-tl-empty">No activity yet.</div>}
                        {acts.map((a) => (
                          <div key={a.id} className="sl-tl-row">
                            <span className="sl-tl-icon">{ACT_ICON[a.type] || '•'}</span>
                            <div className="sl-tl-body">
                              <div className="sl-tl-desc">{a.description}</div>
                              <div className="sl-tl-time">{relTime(a.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {showNewLead && (
        <div className="sl-modal-overlay" role="dialog" aria-modal="true" onClick={() => !nlSaving && setShowNewLead(false)}>
          <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Lead</h3>
            <p className="sl-modal-tip">Adds a lead at the <strong>Lead</strong> stage and creates the client automatically.</p>
            <div className="sl-field">
              <label>Name *</label>
              <input value={nl.name} onChange={(e) => setNl({ ...nl, name: e.target.value })} placeholder="First and last" />
            </div>
            <div className="sl-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label>Phone *</label>
                <input value={nl.phone} onChange={(e) => setNl({ ...nl, phone: e.target.value })} placeholder="(212) 555-1234" />
              </div>
              <div>
                <label>Email *</label>
                <input value={nl.email} onChange={(e) => setNl({ ...nl, email: e.target.value })} placeholder="you@example.com" />
              </div>
            </div>
            <p className="sl-modal-tip">Name, phone, and email are all required.</p>
            <div className="sl-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label>Service</label>
                <input value={nl.service} onChange={(e) => setNl({ ...nl, service: e.target.value })} placeholder="e.g. Kitchen remodel" />
              </div>
              <div>
                <label>Est. value ($)</label>
                <input value={nl.value} onChange={(e) => setNl({ ...nl, value: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" inputMode="decimal" />
              </div>
            </div>
            <div className="sl-field">
              <label>Notes</label>
              <textarea rows={2} value={nl.notes} onChange={(e) => setNl({ ...nl, notes: e.target.value })} placeholder="Anything useful for follow-up" />
            </div>
            {nlErr && <div style={{ marginTop: 10, color: '#c0392b', fontSize: 13 }}>{nlErr}</div>}
            <div className="sl-modal-actions">
              <button type="button" className="sl-newlead-btn" style={{ background: 'transparent', color: 'var(--sl-ink)' }} onClick={() => setShowNewLead(false)} disabled={nlSaving}>Cancel</button>
              <button type="button" className="sl-newlead-btn" style={{ flex: 1 }} onClick={submitNewLead} disabled={nlSaving}>{nlSaving ? 'Creating…' : 'Create lead'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SalesPage() {
  return (
    <Suspense fallback={null}>
      <SalesPageInner />
    </Suspense>
  )
}
