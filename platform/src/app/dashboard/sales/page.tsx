'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import './sales.css'
import CalendarBoard from '../calendar/CalendarBoard'

// The sales process IS the tabs, left→right. Deals move between them via the
// stage dropdown on each card. Schedule is the calendar.
type Tab = 'pipeline' | 'leads' | 'qualify' | 'quotes' | 'sales' | 'schedule'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'pipeline', letter: 'A', label: 'Pipeline' },
  { key: 'leads', letter: 'B', label: 'Leads' },
  { key: 'qualify', letter: 'C', label: 'Qualify' },
  { key: 'quotes', letter: 'D', label: 'Quotes' },
  { key: 'sales', letter: 'E', label: 'Sales' },
  { key: 'schedule', letter: 'F', label: 'Schedule' },
]
const TAB_TIPS: Record<Tab, string> = {
  pipeline: 'The whole board — every deal across Lead → Qualify → Quote → Sale. Use a card’s dropdown to move it.',
  leads: 'New leads — every one auto-creates a client. Reach out fast, then move it to Qualify.',
  qualify: 'Confirm scope & fit. Book a site visit if it needs a quote, then move to Quote.',
  quotes: 'Quote sent — awaiting the yes. When accepted, move it to Sale.',
  sales: 'The close — Pending / Sold / Lost. Bookings auto-land here when scheduled.',
  schedule: 'The calendar — sold jobs and bookings land here as scheduled work.',
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
  last_activity_at: string | null
  created_at: string
  clients: { name: string | null; address: string | null } | null
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

function SalesPageInner() {
  const sp = useSearchParams()
  const [tab, setTab] = useState<Tab>('pipeline')
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewLead, setShowNewLead] = useState(false)
  const [nl, setNl] = useState({ name: '', phone: '', email: '', service: '', value: '', notes: '' })
  const [nlSaving, setNlSaving] = useState(false)
  const [nlErr, setNlErr] = useState('')

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

  async function moveDeal(id: string, stage: string) {
    try {
      await fetch(`/api/deals/${id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
    } catch { /* ignore */ }
    loadDeals()
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
        <button type="button" className="sl-newlead-btn" onClick={() => setShowNewLead(true)}>+ New Lead</button>
      </div>

      {tab === 'schedule' && <CalendarBoard />}

      {tab !== 'schedule' && (
        <>
          <div className="sl-section-head">
            <h2 className="sl-section-title">{activeLabel}<em>.</em></h2>
            <span className="sl-section-meta">{stageDeals.length} {stageDeals.length === 1 ? 'deal' : 'deals'} · {fmtMoney(stageTotal)}</span>
          </div>

          <div className="sl-stage-list">
            {loading && <div className="sl-empty">Loading…</div>}
            {!loading && stageDeals.length === 0 && <div className="sl-empty">Nothing in {activeLabel} yet.</div>}
            {stageDeals.map((d) => {
              const age = ageDays(d.last_activity_at || d.created_at)
              const ageClass = age >= 14 ? 'danger' : age >= 7 ? 'warn' : ''
              const dealClass = d.probability && d.probability >= 75 ? 'hot' : age >= 14 ? 'stale' : age >= 7 ? 'aging' : ''
              const src = (d.source || 'web').toLowerCase()
              const srcSafe: 'selena' | 'web' | 'referral' | 'repeat' =
                src.includes('selena') ? 'selena' : src === 'referral' ? 'referral' : src === 'repeat' ? 'repeat' : 'web'
              return (
                <div key={d.id} className={`sl-deal ${dealClass}`}>
                  <div className="sl-deal-name">{d.clients?.name || d.title || 'Untitled'}</div>
                  <div className="sl-deal-meta">
                    <span className="sl-deal-ctx">{d.title || (d.clients?.address ?? '—')}</span>
                    <span className="sl-deal-value">{fmtMoney(d.value_cents)}</span>
                  </div>
                  <div className="sl-deal-foot">
                    {['pending', 'sold', 'lost'].includes(d.stage)
                      ? <span className={`sl-deal-status ${d.stage}`}>{cap(d.stage)}</span>
                      : <span className={`sl-deal-source ${srcSafe}`}>{srcSafe}</span>}
                    <span className={`sl-deal-age ${ageClass}`}>{age === 0 ? 'today' : `${age}d`}</span>
                  </div>
                  <select className="sl-deal-move" value={d.stage} onChange={(e) => moveDeal(d.id, e.target.value)}>
                    {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
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
