'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import '../clients/clients.css'
import './recurring.css'
import ClientDrawer from '../clients/client-drawer'
import { ContactChips } from '../bookings/ContactChips'
import CreateBookingForm from '../bookings/CreateBookingForm'
import SidePanel from '@/components/SidePanel'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import { useTenantTimezone } from '@/hooks/useTenantTimezone'
import { parseTenantNaiveString } from '@/lib/tenant-time'
import { formatRecurringFrequency } from '@/lib/recurring'

// One row per recurring client (not per occurrence) — the roster of clients
// on a standing schedule, so ops can focus service quality on the people who
// book week after week rather than getting lost in a flat feed of every
// future date. Data comes from /api/clients/enriched (health/LTV, already
// live on the Clients page) merged with /api/admin/recurring-schedules
// (next visit date + assigned team member, which enriched doesn't carry).
// Both endpoints are live queries against recurring_schedules -- a newly
// created recurring booking always inserts a schedule row with
// status:'active' (see POST /api/admin/recurring-schedules), so a brand new
// series shows up here on next load with no extra plumbing required.

type EnrichedClient = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  customer_number: number | null
  status: string
  source: string | null
  created_at: string
  dns_status: boolean
  dns_reason: string | null
  health: number
  health_band: 'vip' | 'healthy' | 'ok' | 'risk' | 'critical'
  health_factors: { frequency: number; spend: number; payment: number; sentiment: number }
  stage: 'lead' | 'first' | 'active' | 'vip' | 'risk' | 'lapsed' | 'dns'
  ltv_actual_cents: number
  ltv_projected_cents: number
  bookings_count: number
  last_booking: { date: string; label: string; sub: string; overdue: boolean } | null
  recurring: { frequency: string; discount_pct: number; day: string; time: string; status: string } | null
  preferred_cleaner: { name: string; jobs_with: number; total_jobs: number } | null
  cohort: string
}

type Totals = { mrr_cents: number; recurring: number }

type ScheduleInfo = {
  next_booking_date: string | null
  next_booking_id: string | null
  team_members: { id: string; name: string } | null
  status: string
}

function fmtMoney(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

// .clients-ltv-projected has a CSS ::before { content: '→ $' } — the value
// here must NOT include its own '$' or it renders as '→ $$824'.
function fmtMoneyShort(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `${(dollars / 1000).toFixed(1)}k`
  return `${Math.round(dollars)}`
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function stageLabel(stage: EnrichedClient['stage']): string {
  if (stage === 'first') return 'First-Time'
  if (stage === 'vip') return 'VIP'
  if (stage === 'risk') return 'At-Risk'
  if (stage === 'lapsed') return 'Lapsed'
  if (stage === 'dns') return 'DNS'
  return 'Active'
}

// next_booking_date is a naive tenant-local wall-clock string (no zone
// suffix) -- new Date(iso) would parse it in the browser's local zone, not
// the tenant's configured one. parseTenantNaiveString resolves the real
// instant against the tenant's actual timezone first.
function fmtVisitDate(iso: string, timezone: string): string {
  return parseTenantNaiveString(iso, timezone).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: timezone })
}
function fmtVisitTime(iso: string, timezone: string): string {
  return parseTenantNaiveString(iso, timezone).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })
}

export default function RecurringPage() {
  const { tenant } = useTenantSettings()
  const timezone = useTenantTimezone()
  const agentName = (tenant?.agent_name as string) || 'Selena'

  const [clients, setClients] = useState<EnrichedClient[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [tenantSlug, setTenantSlug] = useState('')
  const [scheduleByClient, setScheduleByClient] = useState<Record<string, ScheduleInfo>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [drawerId, setDrawerId] = useState<string | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createInitialValues, setCreateInitialValues] = useState<{ clientId?: string; repeatEnabled?: boolean }>({})
  const [formInstanceKey, setFormInstanceKey] = useState(0)

  // Resend/30-min-alert menu — same actions + same endpoints as the row
  // actions on the Bookings list (BookingsAdmin.tsx), scoped to each
  // client's next upcoming booking. Portal'd to body + fixed-positioned
  // because .clients-table has overflow:hidden, which would clip an
  // absolutely-positioned dropdown anchored inside a row.
  const [resendMenuId, setResendMenuId] = useState<string | null>(null)
  const [resendMenuPos, setResendMenuPos] = useState<{ top: number; left: number } | null>(null)

  async function handleResend(bookingId: string, channel: 'email' | 'sms') {
    setResendMenuId(null)
    const res = await fetch('/api/send-booking-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, clientOnly: true, ...(channel === 'sms' ? { channel: 'sms' } : {}) }),
    })
    if (res.ok) {
      alert(channel === 'sms' ? 'Confirmation text sent!' : 'Confirmation email sent!')
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || `Failed to send ${channel}`)
    }
  }

  async function handleSend30MinAlert(bookingId: string) {
    setResendMenuId(null)
    const res = await fetch('/api/team-portal/30min-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, force: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data.error || 'Failed to send 30-min alert')
    } else if (data.skipped) {
      alert('Already paid — no alert sent')
    } else if (data.clientNotified === false) {
      alert('Admin notified, but client text failed to send — check Notifications')
    } else {
      alert('30-min alert sent!')
    }
  }

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/clients/enriched').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/recurring-schedules?active=true').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([enriched, schedules]) => {
        if (enriched && Array.isArray(enriched.clients)) {
          setClients(enriched.clients)
          setTotals(enriched.totals || null)
          setTenantSlug(enriched.tenant_slug || '')
        }
        const byClient: Record<string, ScheduleInfo> = {}
        if (Array.isArray(schedules)) {
          for (const s of schedules) {
            const cid = s.client_id as string | undefined
            if (!cid) continue
            // A client can only have one *active* schedule at a time in
            // practice; if more than one active/paused row somehow exists,
            // keep whichever has the soonest next visit.
            const existing = byClient[cid]
            if (!existing || (s.next_booking_date && (!existing.next_booking_date || s.next_booking_date < existing.next_booking_date))) {
              byClient[cid] = {
                next_booking_date: s.next_booking_date || null,
                next_booking_id: s.next_booking_id || null,
                team_members: s.team_members || null,
                status: s.status,
              }
            }
          }
        }
        setScheduleByClient(byClient)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const recurringClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients
      .filter((c) => !!c.recurring)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))
      .sort((a, b) => {
        const av = scheduleByClient[a.id]?.next_booking_date
        const bv = scheduleByClient[b.id]?.next_booking_date
        if (av && bv) return av < bv ? -1 : av > bv ? 1 : 0
        if (av) return -1
        if (bv) return 1
        return a.name.localeCompare(b.name)
      })
  }, [clients, search, scheduleByClient])

  const atRiskCount = useMemo(
    () => clients.filter((c) => c.recurring && (c.stage === 'risk' || c.stage === 'lapsed')).length,
    [clients]
  )
  const vipCount = useMemo(
    () => clients.filter((c) => c.recurring && c.stage === 'vip').length,
    [clients]
  )

  const drawerClient = drawerId ? clients.find((c) => c.id === drawerId) || null : null

  function openCreateForClient(clientId?: string) {
    setCreateInitialValues({ clientId, repeatEnabled: true })
    setFormInstanceKey((k) => k + 1)
    setShowCreateModal(true)
  }

  return (
    <div className="clients-scope">
      <div className="clients-bar-label">Reoccurring Clients</div>
      <p style={{ margin: '4px 0 16px', color: 'var(--clients-muted, #6b7280)', fontSize: 13, maxWidth: 640 }}>
        Every client on a standing recurring schedule, in one place — so the team can focus on them and keep service quality high for the people who book week after week.
      </p>

      <div className="clients-outlook">
        <div className="clients-stat">
          <div className="clients-stat-label">Recurring Clients</div>
          <div className="clients-stat-value">{totals?.recurring ?? recurringClients.length}</div>
          <div className="clients-stat-sub">On a standing schedule</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            <span className="inline-flex items-center">
              MRR
            </span>
          </div>
          <div className="clients-stat-value">
            <span className="unit">$</span>{Math.round((totals?.mrr_cents ?? 0) / 100).toLocaleString('en-US')}
          </div>
          <div className="clients-stat-sub">Monthly recurring revenue</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            <span className="inline-flex items-center">
              At-Risk
              <span className="clients-stat-tag warn">churn</span>
            </span>
          </div>
          <div className="clients-stat-value">{atRiskCount}</div>
          <div className="clients-stat-sub warn">{agentName} drafted nudges</div>
        </div>
        <div className="clients-stat">
          <div className="clients-stat-label">
            <span className="inline-flex items-center">
              VIPs
              <span className="clients-stat-tag vip">●</span>
            </span>
          </div>
          <div className="clients-stat-value">{vipCount}</div>
          <div className="clients-stat-sub">Recurring + highest value</div>
        </div>
      </div>

      <div className="clients-toolbar">
        <div className="clients-ai-search">
          <span className="clients-ai-search-icon">Search</span>
          <input
            type="text"
            placeholder="Search recurring clients by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="clients-toolbar-right">
          <button className="clients-btn clients-btn-primary" type="button" onClick={() => openCreateForClient(undefined)}>
            <span className="clients-btn-icon">+</span>Add New Booking
          </button>
        </div>
      </div>

      <div className="clients-table">
        <div className="recurring-thead">
          <div>Health</div>
          <div>Client</div>
          <div>Recurring</div>
          <div>Next Visit</div>
          <div>Assigned</div>
          <div>Stage</div>
          <div className="right">LTV</div>
          <div className="right">Actions</div>
        </div>

        {loading && <div className="clients-empty">Loading recurring clients…</div>}
        {!loading && recurringClients.length === 0 && (
          <div className="clients-empty">No recurring clients yet — they'll show up here the moment a recurring booking is created.</div>
        )}

        {!loading &&
          recurringClients.map((c) => {
            const sched = scheduleByClient[c.id]
            return (
              <div key={c.id} className="recurring-row" onClick={() => setDrawerId(c.id)}>
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
                      {sched?.status === 'paused' && <span className="clients-row-name-tag">Paused</span>}
                    </div>
                    <ContactChips phone={c.phone} address={c.address} />
                  </div>
                </div>
                <div className="clients-recurring-cell">
                  <span className="clients-recurring-tier">
                    {formatRecurringFrequency(c.recurring?.frequency)}
                    {c.recurring && c.recurring.discount_pct > 0 ? ` · ${c.recurring.discount_pct}%` : ''}
                  </span>
                  <span className="clients-recurring-slot">
                    {c.recurring?.day && c.recurring?.time ? `${c.recurring.day} ${c.recurring.time}` : 'Recurring'}
                  </span>
                </div>
                <div className="clients-last-cell">
                  {sched?.next_booking_date ? (
                    <>
                      <strong>{fmtVisitDate(sched.next_booking_date, timezone)}</strong>
                      <div className="clients-last-cell-sub">{fmtVisitTime(sched.next_booking_date, timezone)}</div>
                    </>
                  ) : (
                    <span className="clients-last-cell-sub">none scheduled</span>
                  )}
                </div>
                <div className="clients-cleaner-cell">
                  {sched?.team_members ? (
                    <div className="clients-cleaner-name">{sched.team_members.name}</div>
                  ) : (
                    <div className="clients-cleaner-affinity">Unassigned</div>
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
                <div className="recurring-row-actions" onClick={(e) => e.stopPropagation()}>
                  {sched?.next_booking_id && (
                    <button
                      className="clients-icon-btn"
                      onClick={(e) => {
                        if (resendMenuId === c.id) {
                          setResendMenuId(null)
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setResendMenuPos({ top: rect.bottom + 4, left: rect.right - 130 })
                          setResendMenuId(c.id)
                        }
                      }}
                      title="Resend confirmation / 30-min alert"
                      aria-label="Resend confirmation / 30-min alert"
                    >
                      ✉
                    </button>
                  )}
                  {resendMenuId === c.id && resendMenuPos && sched?.next_booking_id && createPortal(
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={() => setResendMenuId(null)} />
                      <div
                        className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] py-1 min-w-[150px]"
                        style={{ top: resendMenuPos.top, left: resendMenuPos.left }}
                      >
                        <button onClick={() => handleResend(sched.next_booking_id as string, 'email')} className="w-full text-left px-3 py-1.5 text-sm text-slate-900 hover:bg-gray-50 transition-colors">Resend Email</button>
                        <button onClick={() => handleResend(sched.next_booking_id as string, 'sms')} className="w-full text-left px-3 py-1.5 text-sm text-slate-900 hover:bg-gray-50 transition-colors">Resend Text</button>
                        <button onClick={() => handleSend30MinAlert(sched.next_booking_id as string)} className="w-full text-left px-3 py-1.5 text-sm text-slate-900 hover:bg-gray-50 transition-colors whitespace-nowrap">30-Min Alert</button>
                      </div>
                    </>,
                    document.body
                  )}
                  <button
                    className="clients-icon-btn"
                    onClick={() => openCreateForClient(c.id)}
                    title="New booking for this client"
                    aria-label="New booking for this client"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
      </div>

      <ClientDrawer
        client={drawerClient}
        tenantSlug={tenantSlug}
        open={!!drawerClient}
        onClose={() => setDrawerId(null)}
        onClientUpdated={load}
        agentName={agentName}
      />

      {showCreateModal && (
        <SidePanel open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New Booking" width="max-w-lg">
          <CreateBookingForm
            key={formInstanceKey}
            initialValues={createInitialValues}
            onCreated={() => { setShowCreateModal(false); load() }}
            onCancel={() => setShowCreateModal(false)}
          />
        </SidePanel>
      )}
    </div>
  )
}
