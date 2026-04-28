'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import './clients.css'
import ClientDrawer from './client-drawer'

const ClientsMap = dynamic(() => import('@/components/ClientsMap'), { ssr: false })

type Stage = 'lead' | 'first' | 'active' | 'vip' | 'risk' | 'lapsed' | 'dns'
type HealthBand = 'vip' | 'healthy' | 'ok' | 'risk' | 'critical'

type EnrichedClient = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  status: string
  source: string | null
  created_at: string
  dns_status: boolean
  health: number
  health_band: HealthBand
  health_factors: { frequency: number; spend: number; payment: number; sentiment: number }
  stage: Stage
  ltv_actual_cents: number
  ltv_projected_cents: number
  bookings_count: number
  last_booking: { date: string; label: string; sub: string; overdue: boolean } | null
  recurring: { frequency: string; discount_pct: number; day: string; time: string; status: string } | null
  preferred_cleaner: { name: string; jobs_with: number; total_jobs: number } | null
  cohort: string
}

type Totals = {
  total: number
  healthy: number
  vip: number
  vip_projected_cents: number
  at_risk: number
  first_time: number
  active: number
  lapsed: number
  dns: number
  avg_health: number
  mrr_cents: number
  recurring: number
}

type Tab = 'all' | 'map' | 'lifecycle' | 'cohorts' | 'conversations' | 'reviews' | 'referrals'

const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'all', letter: 'A', label: 'All Clients' },
  { key: 'map', letter: 'B', label: 'Map' },
  { key: 'lifecycle', letter: 'C', label: 'Lifecycle' },
  { key: 'cohorts', letter: 'D', label: 'Cohorts' },
  { key: 'conversations', letter: 'E', label: 'Conversations' },
  { key: 'reviews', letter: 'F', label: 'Reviews' },
  { key: 'referrals', letter: 'G', label: 'Referrals' },
]

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function fmtMoney(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

function fmtMoneyShort(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `${(dollars / 1000).toFixed(1)}k`
  return `${Math.round(dollars)}`
}

function cohortLabel(yyyymm: string): string {
  if (!yyyymm || yyyymm.length < 7) return '—'
  const [y, m] = yyyymm.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const idx = parseInt(m, 10) - 1
  return `${months[idx]} '${y.slice(2)}`
}

function stageLabel(stage: Stage): string {
  if (stage === 'lead') return 'Lead'
  if (stage === 'first') return 'First-Time'
  if (stage === 'active') return 'Active'
  if (stage === 'vip') return 'VIP'
  if (stage === 'risk') return 'At-Risk'
  if (stage === 'lapsed') return 'Lapsed'
  return 'DNS'
}

export default function ClientsPage() {
  const [clients, setClients] = useState<EnrichedClient[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [cohortFilter, setCohortFilter] = useState<string | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'recurring' | 'one-time'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawerId, setDrawerId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/clients/enriched')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.clients)) {
          setClients(data.clients)
          setTotals(data.totals || null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const cohortOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of clients) {
      counts.set(c.cohort, (counts.get(c.cohort) || 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 5)
      .map(([cohort, count]) => ({ cohort, count }))
  }, [clients])

  const stageCounts = useMemo(() => {
    const counts: Record<Stage | 'all', number> = {
      all: clients.length,
      lead: 0, first: 0, active: 0, vip: 0, risk: 0, lapsed: 0, dns: 0,
    }
    for (const c of clients) counts[c.stage]++
    return counts
  }, [clients])

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (stageFilter !== 'all' && c.stage !== stageFilter) return false
      if (cohortFilter !== 'all' && c.cohort !== cohortFilter) return false
      if (typeFilter === 'recurring' && !c.recurring) return false
      if (typeFilter === 'one-time' && c.recurring) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${c.name} ${c.email || ''} ${c.phone || ''} ${c.address || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [clients, stageFilter, cohortFilter, typeFilter, search])

  const drawerClient = useMemo(() => clients.find((c) => c.id === drawerId) || null, [clients, drawerId])

  function toggleSelected(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((c) => c.id)))
  }

  return (
    <div className="clients-scope">
      {/* OUTLOOK BAR */}
      <div className="clients-bar-label">Health</div>
      <div className="clients-outlook">
        <div className="clients-stat">
          <div className="clients-stat-label">Total <span className="clients-stat-tag">all time</span></div>
          <div className="clients-stat-value">{totals?.total ?? clients.length}</div>
          <div className="clients-stat-sub">Roster + new + DNS</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            Healthy
            <span className="clients-stat-tag up">
              {totals && totals.total ? Math.round((totals.healthy / totals.total) * 100) : 0}%
            </span>
          </div>
          <div className="clients-stat-value">{totals?.healthy ?? 0}</div>
          <div className="clients-stat-sub">Score 70+ · active</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">VIPs <span className="clients-stat-tag vip">●</span></div>
          <div className="clients-stat-value">{totals?.vip ?? 0}</div>
          <div className="clients-stat-sub">
            <strong>{fmtMoney(totals?.vip_projected_cents ?? 0)}</strong> proj. LTV
          </div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">At-Risk <span className="clients-stat-tag warn">churn</span></div>
          <div className="clients-stat-value">{totals?.at_risk ?? 0}</div>
          <div className="clients-stat-sub warn">Selena drafted nudges</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">Avg Health</div>
          <div className="clients-stat-value">{totals?.avg_health ?? 0}</div>
          <div className="clients-stat-sub">Across {(totals?.active ?? 0) + (totals?.vip ?? 0)} active</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">MRR</div>
          <div className="clients-stat-value">
            <span className="unit">$</span>{fmtMoneyShort(totals?.mrr_cents ?? 0)}
          </div>
          <div className="clients-stat-sub">From <strong>{totals?.recurring ?? 0}</strong> recurring</div>
        </div>
      </div>

      {/* TABS */}
      <div className="clients-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`clients-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            <span className="clients-tab-letter">{t.letter}</span>
            {t.label}
            {t.key === 'all' && <span className="clients-tab-count">{stageCounts.all}</span>}
          </button>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="clients-toolbar">
        <div className="clients-ai-search">
          <span className="clients-ai-search-icon">Ask Selena</span>
          <input
            type="text"
            placeholder="biweekly clients in Murray Hill who haven't reviewed yet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="clients-ai-search-key">⌘K</span>
        </div>
        <div className="clients-toolbar-right">
          <button className="clients-btn clients-btn-ghost" type="button">
            <span className="clients-btn-icon">⚲</span>Filters
          </button>
          <button className="clients-btn clients-btn-ghost" type="button">
            <span className="clients-btn-icon">↓</span>Export
          </button>
          <button className="clients-btn clients-btn-ghost" type="button" disabled={selected.size === 0}>
            Bulk Actions{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
          <button className="clients-btn clients-btn-primary" type="button">
            <span className="clients-btn-icon">+</span>Add Client
          </button>
        </div>
      </div>

      {/* FILTER CHIPS */}
      <div className="clients-filter-row">
        <span className="clients-filter-label">Stage</span>
        {([
          ['all', 'All', null],
          ['first', 'First-Time', 'good'],
          ['active', 'Active', null],
          ['vip', 'VIP', 'vip'],
          ['risk', 'At-Risk', 'warn'],
          ['lapsed', 'Lapsed', null],
          ['dns', 'DNS', 'danger'],
        ] as Array<[Stage | 'all', string, string | null]>).map(([key, label, dot]) => (
          <span
            key={key}
            className={`clients-chip ${stageFilter === key ? 'active' : ''}`}
            onClick={() => setStageFilter(key)}
          >
            {dot && <span className={`clients-chip-dot ${dot}`} />}
            {label}
            <span className="clients-chip-count">{stageCounts[key as Stage] ?? stageCounts.all}</span>
          </span>
        ))}
      </div>

      <div className="clients-filter-row">
        <span className="clients-filter-label">Cohort</span>
        <span
          className={`clients-chip ${cohortFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCohortFilter('all')}
        >
          All <span className="clients-chip-count">{clients.length}</span>
        </span>
        {cohortOptions.map((c) => (
          <span
            key={c.cohort}
            className={`clients-chip ${cohortFilter === c.cohort ? 'active' : ''}`}
            onClick={() => setCohortFilter(c.cohort)}
          >
            {cohortLabel(c.cohort)} <span className="clients-chip-count">{c.count}</span>
          </span>
        ))}
        <span className="clients-filter-label" style={{ marginLeft: 14 }}>Type</span>
        <span className={`clients-chip ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>
          All <span className="clients-chip-count">{clients.length}</span>
        </span>
        <span className={`clients-chip ${typeFilter === 'recurring' ? 'active' : ''}`} onClick={() => setTypeFilter('recurring')}>
          Recurring <span className="clients-chip-count">{totals?.recurring ?? 0}</span>
        </span>
        <span className={`clients-chip ${typeFilter === 'one-time' ? 'active' : ''}`} onClick={() => setTypeFilter('one-time')}>
          One-Time <span className="clients-chip-count">{Math.max(0, clients.length - (totals?.recurring ?? 0))}</span>
        </span>
      </div>

      {/* MAP TAB */}
      {tab === 'map' && (
        <div style={{ height: 640, border: '1px solid var(--clients-line)', borderRadius: 4, overflow: 'hidden', marginBottom: 22 }}>
          <ClientsMap
            clients={filtered.map((c) => ({
              id: c.id,
              name: c.name,
              address: c.address || '',
              status: (c.stage === 'lead' ? 'potential' : c.stage === 'first' ? 'new' : c.stage === 'lapsed' || c.stage === 'risk' || c.stage === 'dns' ? 'inactive' : 'active') as 'potential' | 'new' | 'active' | 'inactive',
              totalBookings: c.bookings_count,
              totalSpent: c.ltv_actual_cents / 100,
              lastBooking: c.last_booking?.date || null,
              do_not_service: c.dns_status,
            }))}
            onClientClick={(id) => setDrawerId(id)}
          />
        </div>
      )}

      {/* TABLE */}
      {tab === 'all' && (
      <div className="clients-table">
        <div className="clients-thead">
          <div>
            <span
              className={`clients-check ${selected.size > 0 && selected.size === filtered.length ? 'checked' : ''}`}
              onClick={toggleAll}
            />
          </div>
          <div>Health</div>
          <div>Client</div>
          <div>Recurring Slot</div>
          <div>Affinity</div>
          <div>Stage</div>
          <div className="right">LTV</div>
          <div>Last</div>
          <div />
        </div>

        {loading && <div className="clients-empty">Loading clients…</div>}
        {!loading && filtered.length === 0 && <div className="clients-empty">No clients match these filters.</div>}

        {!loading &&
          filtered.map((c) => (
            <div key={c.id} className="clients-row" onClick={() => setDrawerId(c.id)}>
              <div onClick={(e) => e.stopPropagation()}>
                <span
                  className={`clients-check ${selected.has(c.id) ? 'checked' : ''}`}
                  onClick={() => toggleSelected(c.id)}
                />
              </div>
              <div className="clients-health-cell">
                <span className={`clients-health-num ${c.health_band}`}>{c.health}</span>
                <div className="clients-health-bar">
                  <div className={`clients-health-fill ${c.health_band}`} style={{ width: `${c.health}%` }} />
                </div>
              </div>
              <div className="clients-row-client">
                <span className={`clients-avatar ${c.stage === 'vip' ? 'vip' : ''}`}>{initials(c.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="clients-row-name">
                    {c.name}
                    {c.stage === 'vip' && <span className="clients-row-name-tag vip">VIP</span>}
                  </div>
                  {c.address && <div className="clients-row-addr">{c.address}</div>}
                </div>
              </div>
              <div className="clients-recurring-cell">
                {c.recurring ? (
                  <>
                    <span className="clients-recurring-tier">
                      {c.recurring.frequency}
                      {c.recurring.discount_pct > 0 ? ` · ${c.recurring.discount_pct}%` : ''}
                    </span>
                    <span className="clients-recurring-slot">
                      {c.recurring.day && c.recurring.time ? `${c.recurring.day} ${c.recurring.time}` : 'Recurring'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="clients-recurring-tier none">One-time</span>
                    <span className="clients-recurring-slot empty">No standing slot</span>
                  </>
                )}
              </div>
              <div className="clients-cleaner-cell">
                {c.preferred_cleaner ? (
                  <>
                    <div className="clients-cleaner-name">{c.preferred_cleaner.name}</div>
                    <div className="clients-cleaner-affinity">
                      {c.preferred_cleaner.jobs_with} of {c.preferred_cleaner.total_jobs} jobs
                    </div>
                  </>
                ) : (
                  <div className="clients-cleaner-affinity">—</div>
                )}
              </div>
              <div>
                <span className={`clients-stage ${c.stage}`}>{stageLabel(c.stage)}</span>
              </div>
              <div className="clients-ltv-cell">
                <div className="clients-ltv-actual">{fmtMoney(c.ltv_actual_cents)}</div>
                <div className={`clients-ltv-projected ${c.ltv_projected_cents === 0 ? 'muted' : ''}`}>
                  {fmtMoneyShort(c.ltv_projected_cents)}
                </div>
              </div>
              <div className={`clients-last-cell ${c.last_booking?.overdue ? 'muted' : ''}`}>
                {c.last_booking ? (
                  <>
                    <strong>{c.last_booking.label}</strong>
                    <div className="clients-last-cell-sub">{c.last_booking.sub}</div>
                  </>
                ) : (
                  <span className="clients-last-cell-sub">no bookings</span>
                )}
              </div>
              <div className="clients-row-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="clients-icon-btn"
                  onClick={() => {
                    if (c.email) window.location.href = `mailto:${c.email}`
                  }}
                  aria-label="Email client"
                >
                  ✉
                </button>
              </div>
            </div>
          ))}
      </div>
      )}

      {tab !== 'all' && tab !== 'map' && (
        <div style={{ padding: 60, textAlign: 'center', background: 'var(--clients-canvas)', border: '1px dashed var(--clients-line)', borderRadius: 4, marginBottom: 22 }}>
          <div style={{ fontFamily: 'var(--clients-display)', fontSize: 24, color: 'var(--clients-ink)', fontWeight: 500, marginBottom: 8 }}>Coming soon.</div>
          <div style={{ color: 'var(--clients-muted)' }}>{TABS.find((t) => t.key === tab)?.label} view will land next pass.</div>
        </div>
      )}

      <ClientDrawer
        client={drawerClient}
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
      />
    </div>
  )
}
