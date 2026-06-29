'use client'

import { useEffect, useMemo, useState } from 'react'
import './bookings-list.css'

type Booking = {
  id: string
  start_time: string
  end_time: string | null
  status: string
  payment_status: string | null
  service_type: string | null
  price: number | null
  hourly_rate: number | null
  pay_rate: number | null
  notes: string | null
  source: string | null
  team_member_id: string | null
  clients: { name: string | null; phone: string | null; address: string | null } | null
  team_members: { name: string | null; phone: string | null } | null
}

type StatusKey = 'all' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
const STATUS_FILTERS: Array<{ key: StatusKey; label: string; dot?: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending', dot: 'warn' },
  { key: 'scheduled', label: 'Scheduled', dot: 'scheduled' },
  { key: 'in_progress', label: 'In Progress', dot: 'progress' },
  { key: 'completed', label: 'Completed', dot: 'completed' },
  { key: 'cancelled', label: 'Cancelled', dot: 'cancelled' },
]

type SmartKey = 'high_risk' | 'low_margin' | 'late' | 'unassigned' | 'overdue_pay' | 'no_review'
const SMART_FILTERS: Array<{ key: SmartKey; label: string; dot?: string }> = [
  { key: 'high_risk', label: 'High Risk', dot: 'danger' },
  { key: 'low_margin', label: 'Low Margin' },
  { key: 'late', label: 'Late Arrivals' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'overdue_pay', label: 'Overdue Pay' },
  { key: 'no_review', label: 'Awaiting Review' },
]

function initials(name: string | null): string {
  if (!name) return '—'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function fmtMoney(cents: number | null | undefined): string {
  if (!cents) return '$0'
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

function fmtDate(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase()
  return { date, time }
}

function computeMargin(b: Booking): { cents: number; pct: number; band: 'good' | 'low' | 'bad' } {
  const price = Number(b.price || 0)
  const payRate = Number(b.pay_rate || 0)
  const endIso = b.end_time
  const start = new Date(b.start_time).getTime()
  const end = endIso ? new Date(endIso).getTime() : start + 3 * 3_600_000
  const hours = Math.max(0.5, (end - start) / 3_600_000)
  const cost = payRate ? Math.round(payRate * hours * 100) : Math.round(price * 0.45) // assume 45% if no pay rate
  const margin = price - cost
  const pct = price > 0 ? Math.round((margin / price) * 100) : 0
  return {
    cents: margin,
    pct,
    band: pct >= 60 ? 'good' : pct >= 40 ? 'low' : 'bad',
  }
}

function riskFor(b: Booking): { level: 'low' | 'med' | 'high' | 'live'; label: string } {
  if (b.status === 'in_progress') return { level: 'live', label: 'Live' }
  if (!b.team_member_id && b.status !== 'cancelled') return { level: 'high', label: 'No team' }
  if (b.payment_status === 'unpaid' && new Date(b.start_time).getTime() < Date.now()) return { level: 'med', label: 'Owed' }
  return { level: 'low', label: 'OK' }
}

function teamColor(id: string | null): string {
  const palette = ['#D946A8', '#2563EB', '#EAB308', '#F97316', '#A855F7', '#F59E0B', '#DC2626', '#06B6D4', '#14B8A6']
  if (!id) return '#A8A8A4'
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

export default function BookingsListTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all')
  const [smartFilter, setSmartFilter] = useState<SmartKey | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    fetch('/api/bookings?limit=200')
      .then((r) => r.json())
      .then((d) => setBookings((d?.bookings || []) as Booking[]))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { all: bookings.length, pending: 0, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 }
    for (const b of bookings) {
      const s = (b.status || 'scheduled') as StatusKey
      if (c[s] !== undefined) c[s]++
    }
    return c
  }, [bookings])

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false
      if (smartFilter) {
        if (smartFilter === 'unassigned' && b.team_member_id) return false
        if (smartFilter === 'low_margin' && computeMargin(b).pct >= 50) return false
        if (smartFilter === 'high_risk' && riskFor(b).level !== 'high') return false
        if (smartFilter === 'overdue_pay') {
          const past = new Date(b.start_time).getTime() < Date.now()
          if (!(past && b.payment_status === 'unpaid')) return false
        }
        if (smartFilter === 'late') {
          if (b.status !== 'in_progress') return false
        }
        if (smartFilter === 'no_review') {
          if (b.status !== 'completed') return false
        }
      }
      if (search) {
        const q = search.toLowerCase()
        const hay = `${b.clients?.name || ''} ${b.clients?.address || ''} ${b.service_type || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [bookings, statusFilter, smartFilter, search])

  const selectedTotal = useMemo(() => {
    let cents = 0
    for (const b of bookings) if (selected.has(b.id)) cents += Number(b.price || 0)
    return cents
  }, [bookings, selected])

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((b) => b.id)))
  }

  return (
    <div className="bk-scope">
      <div className="bk-toolbar">
        <div className="bk-ai-search">
          <span className="bk-ai-search-icon">Ask Selena</span>
          <input
            type="text"
            placeholder="show me low-margin jobs from first-time clients this month…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="bk-ai-search-key">⌘K</span>
        </div>
        <div className="bk-view-mode">
          <button className="bk-view-mode-btn active" type="button">Table</button>
          <button className="bk-view-mode-btn" type="button" disabled>Lanes</button>
          <button className="bk-view-mode-btn" type="button" disabled>Timeline</button>
        </div>
        <div className="bk-toolbar-right">
          <button className="bk-btn bk-btn-ghost" type="button">Filters</button>
          <button className="bk-btn bk-btn-ghost" type="button">Waitlist</button>
          <button className="bk-btn bk-btn-ghost" type="button">Close Out</button>
          <button className="bk-btn bk-btn-primary" type="button">+ New Booking</button>
        </div>
      </div>

      <div className="bk-filter-row">
        <span className="bk-filter-label">Status</span>
        {STATUS_FILTERS.map((f) => (
          <span
            key={f.key}
            className={`bk-chip ${statusFilter === f.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.dot && <span className={`bk-chip-dot ${f.dot}`} />}
            {f.label}
            <span className="bk-chip-count">{counts[f.key]}</span>
          </span>
        ))}
      </div>
      <div className="bk-filter-row">
        <span className="bk-filter-label">Smart</span>
        {SMART_FILTERS.map((f) => (
          <span
            key={f.key}
            className={`bk-chip ${smartFilter === f.key ? 'active' : ''}`}
            onClick={() => setSmartFilter(smartFilter === f.key ? null : f.key)}
          >
            {f.dot && <span className={`bk-chip-dot ${f.dot}`} />}
            {f.label}
          </span>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="bk-bulk-bar">
          <span className="bk-bulk-count">{selected.size} selected</span>
          <span className="bk-bulk-divider" />
          <button className="bk-bulk-action" type="button">Mark Paid</button>
          <button className="bk-bulk-action" type="button">Send Review Request</button>
          <button className="bk-bulk-action" type="button">Clone Next Week</button>
          <span style={{ marginLeft: 'auto', opacity: 0.6, fontFamily: 'var(--bk-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {fmtMoney(selectedTotal)} · {selected.size} {selected.size === 1 ? 'booking' : 'bookings'}
          </span>
          <button className="bk-bulk-action primary" type="button">Send to QB →</button>
        </div>
      )}

      <div className="bk-table">
        <div className="bk-thead">
          <div>
            <span
              className={`bk-check ${selected.size > 0 && selected.size === filtered.length ? 'checked' : ''}`}
              onClick={toggleAll}
            />
          </div>
          <div>Risk</div>
          <div>Client</div>
          <div>Service</div>
          <div>When</div>
          <div>Cleaner</div>
          <div>Rate</div>
          <div className="right">Margin</div>
          <div>On-Time</div>
          <div>Source</div>
          <div>Status</div>
          <div />
        </div>

        {loading && <div className="bk-empty">Loading…</div>}
        {!loading && filtered.length === 0 && <div className="bk-empty">No bookings match these filters.</div>}

        {!loading && filtered.map((b) => {
          const risk = riskFor(b)
          const margin = computeMargin(b)
          const when = fmtDate(b.start_time)
          const cleanerColor = teamColor(b.team_member_id)
          const status = (b.status || 'scheduled') as StatusKey | 'in_progress'
          const statusClass = status === 'in_progress' ? 'in-progress' : status
          const ontime: 'on' | 'late' | 'scheduled' = b.status === 'completed' ? 'on' : b.status === 'in_progress' ? 'on' : 'scheduled'
          const sourceClass = (b.source as 'web' | 'selena' | 'referral' | null) || 'web'
          return (
            <div
              key={b.id}
              className={`bk-row ${b.status === 'in_progress' ? 'in-progress' : ''} ${b.status === 'cancelled' ? 'cancelled' : ''} ${risk.level === 'high' ? 'high-risk' : ''}`}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <span
                  className={`bk-check ${selected.has(b.id) ? 'checked' : ''}`}
                  onClick={() => toggleOne(b.id)}
                />
              </div>
              <div className="bk-risk">
                <span className={`bk-risk-dot ${risk.level}`} />
                <span className={`bk-risk-label ${risk.level}`}>{risk.label}</span>
              </div>
              <div className="bk-row-client">
                <span className="bk-avatar">{initials(b.clients?.name ?? null)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="bk-row-name">{b.clients?.name || '—'}</div>
                  {b.clients?.address && <div className="bk-row-addr">{b.clients.address}</div>}
                </div>
              </div>
              <div className="bk-service-cell">
                <span className="bk-service-type">{b.service_type || 'Standard'}</span>
                <span className="bk-service-detail">{fmtMoney(b.price)}</span>
              </div>
              <div className="bk-when-cell">
                <div className="bk-when-date">{when.date}</div>
                <div className={`bk-when-time ${b.status === 'in_progress' ? 'live' : ''}`}>{when.time}</div>
              </div>
              <div className={`bk-cleaner-mini ${b.team_member_id ? '' : 'unassigned'}`}>
                {b.team_member_id ? (
                  <>
                    <span className="bk-cleaner-pill" style={{ background: cleanerColor }} />
                    <span>{b.team_members?.name || 'Assigned'}</span>
                  </>
                ) : (
                  <span>Unassigned</span>
                )}
              </div>
              <div className="bk-rate">{b.hourly_rate ? `$${Math.round(Number(b.hourly_rate))}/h` : '—'}</div>
              <div style={{ textAlign: 'right' }}>
                <div className="bk-margin-cell">{fmtMoney(margin.cents)}</div>
                <div className={`bk-margin-pct ${margin.band === 'good' ? '' : margin.band}`}>{margin.pct}%</div>
              </div>
              <div>
                <span className={`bk-ontime ${ontime}`}>
                  {ontime === 'on' ? 'On time' : 'Pending'}
                </span>
              </div>
              <div>
                <span className={`bk-source ${sourceClass}`}>
                  {sourceClass === 'selena' ? 'Selena' : sourceClass === 'referral' ? 'Referral' : 'Web'}
                </span>
              </div>
              <div>
                <span className={`bk-status ${statusClass}`}>{status === 'in_progress' ? 'In Progress' : (status as string).replace('_', ' ')}</span>
              </div>
              <div className="bk-row-actions" onClick={(e) => e.stopPropagation()}>
                <button className="bk-icon-btn" type="button">⋯</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
