'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import './clients.css'
import ClientDrawer from './client-drawer'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import { useUserPrefs } from '@/lib/use-user-prefs'
import ClientsSettings from './clients-settings'
import { SettingsHint } from '@/components/page-settings'
import { InfoTip } from '@/components/info-tip'
import { formatPhone as formatPhoneDisplay } from '@/lib/format'
import { stripPhone } from '@/lib/phone'
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-sources'
import { CallTextCopy } from '../_components/CallTextCopy'

const ClientsMap = dynamic(() => import('@/components/ClientsMap'), { ssr: false })

// Row-level Call/Text/Directions — same pattern as the bookings list, so a
// client row can be worked without opening the drawer.
function ContactChips({ phone, address }: { phone?: string | null; address?: string | null }) {
  if (!phone && !address) return null
  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
      {phone && (
        <>
          <span className="text-[11px] text-gray-500 whitespace-nowrap">{formatPhoneDisplay(phone)}</span>
          <CallTextCopy phone={phone} size="xs" />
        </>
      )}
      {address && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-gray-400 hover:text-blue-600 hover:underline truncate max-w-[160px]"
          title="Get directions"
        >
          {address}
        </a>
      )}
    </div>
  )
}

type Stage = 'lead' | 'first' | 'active' | 'vip' | 'risk' | 'lapsed' | 'dns'
type HealthBand = 'vip' | 'healthy' | 'ok' | 'risk' | 'critical'

type EnrichedClient = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  customer_number: number | null
  status: string
  source: string | null
  created_at: string
  dns_status: boolean
  dns_reason: string | null
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

function fmtDateAdded(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' , timeZone: 'America/New_York' })
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
  const { tenant } = useTenantSettings()
  const agentName = tenant?.agent_name as string || 'Selena'
  const requireClientPhone = !!(tenant?.selena_config as Record<string, unknown> | undefined)?.require_client_phone
  const clientsPrefs = useUserPrefs('clients', { default_tab: 'all', default_stage_filter: 'all', default_type_filter: 'all' })
  const [clients, setClients] = useState<EnrichedClient[]>([])
  const [tenantSlug, setTenantSlug] = useState('')
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [cohortFilter, setCohortFilter] = useState<string | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'recurring' | 'one-time'>('all')

  // Apply saved defaults once the per-user prefs load — same pattern every
  // page uses so a setting saved in the drawer actually changes what the
  // page opens to.
  useEffect(() => {
    if (!clientsPrefs.loaded) return
    setTab(clientsPrefs.prefs.default_tab as Tab)
    setStageFilter(clientsPrefs.prefs.default_stage_filter as Stage | 'all')
    setTypeFilter(clientsPrefs.prefs.default_type_filter as 'all' | 'recurring' | 'one-time')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsPrefs.loaded])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', address: '', notes: '', source: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  function loadClients() {
    setLoading(true)
    fetch('/api/clients/enriched')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.clients)) {
          setClients(data.clients)
          setTotals(data.totals || null)
          setTenantSlug(data.tenant_slug || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadClients()
  }, [])

  async function handleAddClient() {
    if (!addForm.name.trim()) {
      setAddError('Name is required')
      return
    }
    if (!addForm.source) {
      setAddError('Lead source is required')
      return
    }
    if (requireClientPhone && !addForm.phone.trim()) {
      setAddError('Phone number is required')
      return
    }
    setAddSaving(true)
    setAddError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          phone: addForm.phone || undefined,
          email: addForm.email || undefined,
          address: addForm.address || undefined,
          notes: addForm.notes || undefined,
          source: addForm.source,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error || 'Failed to add client')
        return
      }
      setShowAddModal(false)
      setAddForm({ name: '', phone: '', email: '', address: '', notes: '', source: '' })
      loadClients()
    } catch {
      setAddError('Failed to add client')
    } finally {
      setAddSaving(false)
    }
  }

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
        const hay = `${c.name} ${c.email || ''} ${c.address || ''}`.toLowerCase()
        const textMatch = hay.includes(q)
        const searchDigits = stripPhone(search)
        const phoneMatch = searchDigits.length > 0 && stripPhone(c.phone || '').includes(searchDigits)
        if (!textMatch && !phoneMatch) return false
      }
      return true
    })
  }, [clients, stageFilter, cohortFilter, typeFilter, search])

  // ClientsMap keys its geocoding effect off this array's identity — building
  // it inline in JSX allocated a new array (and re-ran the whole geocode pass)
  // on every unrelated re-render of this page, never letting a full pass
  // finish before the next one restarted it.
  const mapClients = useMemo(
    () =>
      filtered.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address || '',
        lat: c.latitude,
        lng: c.longitude,
        status: (c.stage === 'lead' ? 'potential' : c.stage === 'first' ? 'new' : c.stage === 'lapsed' || c.stage === 'risk' || c.stage === 'dns' ? 'inactive' : 'active') as 'potential' | 'new' | 'active' | 'inactive',
        totalBookings: c.bookings_count,
        totalSpent: c.ltv_actual_cents / 100,
        lastBooking: c.last_booking?.date || null,
        do_not_service: c.dns_status,
      })),
    [filtered]
  )

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
      <ClientsSettings />
      {/* OUTLOOK BAR */}
      <div className="clients-bar-label">
        Health
        <InfoTip text="Each client's 0-100 score: the average of booking frequency, spend, on-time payment, and review sentiment. Higher = more engaged and reliable." />
      </div>
      <div className="clients-outlook">
        <div className="clients-stat">
          <div className="clients-stat-label">Total <span className="clients-stat-tag">all time</span></div>
          <div className="clients-stat-value">{totals?.total ?? clients.length}</div>
          <div className="clients-stat-sub">Roster + new + DNS</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            <span className="inline-flex items-center">
              Healthy
              <InfoTip text="Clients with a Health score of 70 or higher — booking regularly, paying on time, and not flagged as VIP-only." />
            </span>
            <span className="clients-stat-tag up">
              {totals && totals.total ? Math.round((totals.healthy / totals.total) * 100) : 0}%
            </span>
          </div>
          <div className="clients-stat-value">{totals?.healthy ?? 0}</div>
          <div className="clients-stat-sub">Score 70+ · active</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            <span className="inline-flex items-center">
              VIPs
              <InfoTip text="Your highest-value clients based on spend and loyalty. Shown with the gold VIP tag throughout the CRM." />
            </span>
            <span className="clients-stat-tag vip">●</span>
          </div>
          <div className="clients-stat-value">{totals?.vip ?? 0}</div>
          <div className="clients-stat-sub">
            <strong>{fmtMoney(totals?.vip_projected_cents ?? 0)}</strong> proj. LTV
          </div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            <span className="inline-flex items-center">
              At-Risk
              <InfoTip text="Churn risk: clients whose Health score has dropped or who haven't booked in a while. These are candidates for a win-back nudge." />
            </span>
            <span className="inline-flex items-center">
              <span className="clients-stat-tag warn">churn</span>
              <SettingsHint label="Win-back message settings" fieldKey="retention" />
            </span>
          </div>
          <div className="clients-stat-value">{totals?.at_risk ?? 0}</div>
          <div className="clients-stat-sub warn">{agentName} drafted nudges</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            <span className="inline-flex items-center">
              Avg Health
              <InfoTip text="The average Health score across all active and VIP clients. A quick pulse-check on the overall book of business." />
            </span>
          </div>
          <div className="clients-stat-value">{totals?.avg_health ?? 0}</div>
          <div className="clients-stat-sub">Across {(totals?.active ?? 0) + (totals?.vip ?? 0)} active</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            <span className="inline-flex items-center">
              MRR
              <InfoTip text="Monthly Recurring Revenue — the predictable monthly value from all clients on a standing recurring schedule." />
            </span>
          </div>
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
          <span className="clients-ai-search-icon">Ask {agentName}</span>
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
          <button className="clients-btn clients-btn-primary" type="button" onClick={() => setShowAddModal(true)}>
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
        <span className="clients-filter-label">
          Cohort
          <InfoTip text="Clients grouped by the month they first signed up. Useful for comparing how each signup month is retaining over time." />
        </span>
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

      {/* MAP — always on top: every client + lead (lead-stage rows show as potential pins) */}
      <div style={{ height: 420, border: '1px solid var(--clients-line)', borderRadius: 4, overflow: 'hidden', marginBottom: 22 }}>
          <ClientsMap
            clients={mapClients}
            onClientClick={(id) => setDrawerId(id)}
          />
      </div>

      {/* TABLE — also shown on Lifecycle: same stage-filtered data, just entered
          via the Lifecycle tab instead of All Clients. Stage filter chips above
          already compute `filtered` off stageFilter regardless of which tab is
          active, so this reuses that instead of duplicating the table. */}
      {(tab === 'all' || tab === 'lifecycle') && (
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
          <div>Date Added</div>
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
                  <ContactChips phone={c.phone} address={c.address} />
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
              <div className="clients-last-cell">{fmtDateAdded(c.created_at)}</div>
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
                <button
                  className="clients-icon-btn"
                  onClick={async () => {
                    if (!confirm(`Delete ${c.name}? This cannot be undone.`)) return
                    const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      loadClients()
                    } else {
                      const j = await res.json().catch(() => ({}))
                      alert(j.message || j.error || 'Failed to delete client')
                    }
                  }}
                  aria-label="Delete client"
                  title="Delete client"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
      </div>
      )}

      {tab !== 'all' && tab !== 'map' && tab !== 'lifecycle' && (
        <div style={{ padding: 60, textAlign: 'center', background: 'var(--clients-canvas)', border: '1px dashed var(--clients-line)', borderRadius: 4, marginBottom: 22 }}>
          <div style={{ fontFamily: 'var(--clients-display)', fontSize: 24, color: 'var(--clients-ink)', fontWeight: 500, marginBottom: 8 }}>Coming soon.</div>
          <div style={{ color: 'var(--clients-muted)' }}>{TABS.find((t) => t.key === tab)?.label} view will land next pass.</div>
        </div>
      )}

      <ClientDrawer
        client={drawerClient}
        tenantSlug={tenantSlug}
        open={!!drawerId}
        onClose={() => setDrawerId(null)}
        onClientUpdated={loadClients}
        agentName={agentName}
      />

      {showAddModal && (
        <div
          className="fixed inset-0 bg-[rgba(28,28,28,0.5)] flex items-center justify-center z-[60]"
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{ background: 'var(--clients-canvas, #fff)', borderRadius: 8, padding: 24, width: 420, maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--clients-display)', fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Add Client</div>
            {addError && <div style={{ color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{addError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clients-muted)' }}>Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clients-muted)' }}>Phone{requireClientPhone ? ' *' : ''}</label>
                <input
                  type="tel"
                  required={requireClientPhone}
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="212-555-1234"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clients-muted)' }}>Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="jane@email.com"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clients-muted)' }}>Address</label>
                <input
                  type="text"
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="123 Main St, New York, NY"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clients-muted)' }}>Lead Source *</label>
                <select
                  value={addForm.source}
                  onChange={(e) => setAddForm({ ...addForm, source: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">How did they find you?</option>
                  {LEAD_SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--clients-muted)' }}>Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="clients-btn clients-btn-ghost" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="button" className="clients-btn clients-btn-primary" onClick={handleAddClient} disabled={addSaving}>
                {addSaving ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
