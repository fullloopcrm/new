'use client'

import { useEffect, useMemo, useState } from 'react'
import './team.css'
import TeamCoverageMap from '@/components/TeamCoverageMap'
import { type ServiceArea, NEUTRAL_SERVICE_AREA } from '@/lib/service-area'
import SalesAppsTab from './SalesAppsTab'

type Tab = 'team' | 'applications' | 'sales_apps' | 'ops_admin' | 'performance' | 'payroll'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'team', letter: 'A', label: 'Team' },
  { key: 'applications', letter: 'B', label: 'Applications' },
  { key: 'sales_apps', letter: 'C', label: 'Sales Apps' },
  { key: 'ops_admin', letter: 'D', label: 'Ops Admin' },
  { key: 'performance', letter: 'E', label: 'Performance' },
  { key: 'payroll', letter: 'F', label: 'Payroll' },
]

type TeamMember = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  status: string | null
  hourly_rate: number | null
  pay_rate: number | null
  notes: string | null
  preferred_language: string | null
}

type EnrichedMember = TeamMember & {
  jobs_this_week: number
  hours_this_week: number
  utilization_pct: number
  ltv_total_cents: number
}

type Booking = {
  id: string
  team_member_id: string | null
  start_time: string
  end_time: string | null
  price: number | null
  status: string
}

type Application = {
  id: string
  name: string
  email: string | null
  phone: string
  address: string | null
  experience: string | null
  availability: string | null
  referral_source: string | null
  references: { name: string; phone: string }[] | null
  notes: string | null
  photo_url: string | null
  service_zones: string[] | null
  has_car: boolean | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
}

const PALETTE = ['#D946A8', '#2563EB', '#EAB308', '#F97316', '#A855F7', '#F59E0B', '#DC2626', '#06B6D4', '#14B8A6']

function colorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>('team')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [appsLoading, setAppsLoading] = useState(true)
  const [serviceArea, setServiceArea] = useState<ServiceArea>(NEUTRAL_SERVICE_AREA)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/cleaners').then((r) => r.json()).catch(() => []),
      fetch('/api/bookings?limit=500').then((r) => r.json()).catch(() => ({ bookings: [] })),
    ]).then(([m, b]) => {
      setMembers(Array.isArray(m) ? m : [])
      setBookings((b?.bookings || []) as Booking[])
      setLoading(false)
    })
    fetch('/api/service-area')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.serviceArea) setServiceArea(d.serviceArea as ServiceArea) })
      .catch(() => {})
    loadApplications()
  }, [])

  async function loadApplications() {
    setAppsLoading(true)
    try {
      const res = await fetch('/api/team-applications')
      if (res.ok) {
        const json = await res.json()
        setApplications(Array.isArray(json) ? json : json?.applications || [])
      }
    } catch {}
    setAppsLoading(false)
  }

  const [bulkApproving, setBulkApproving] = useState(false)

  async function bulkApproveAll() {
    const pendingCount = applications.filter((a) => a.status === 'pending').length
    if (pendingCount === 0) return
    if (!confirm(`Approve all ${pendingCount} pending application${pendingCount === 1 ? '' : 's'}? Each applicant will be added to the team and emailed their portal PIN + login link.`)) return
    setBulkApproving(true)
    try {
      const res = await fetch('/api/team-applications/bulk-approve', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(`Failed: ${json.error || res.statusText}`)
        return
      }
      const failed = Array.isArray(json.failures) ? json.failures.length : 0
      alert(
        `Approved ${json.approved}. Emailed/provisioned ${json.provisioned}.` +
        (failed > 0 ? `\n${failed} applicant(s) approved but could not be emailed/provisioned — check their email/phone.` : '')
      )
      await loadApplications()
    } catch (e) {
      alert(`Failed: ${e instanceof Error ? e.message : 'network error'}`)
    } finally {
      setBulkApproving(false)
    }
  }

  async function updateApplication(id: string, status: 'approved' | 'rejected') {
    if (!confirm(`Mark this application as ${status}?`)) return
    const res = await fetch('/api/team-applications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Failed: ${err.error || res.statusText}`)
      return
    }
    loadApplications()
  }

  async function deleteApplication(id: string) {
    if (!confirm('Delete this application permanently?')) return
    const res = await fetch(`/api/team-applications?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Failed: ${err.error || res.statusText}`)
      return
    }
    loadApplications()
  }

  const enriched: EnrichedMember[] = useMemo(() => {
    const now = new Date()
    const dayIdx = (now.getDay() + 6) % 7
    const monday = new Date(now)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() - dayIdx)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 7)
    const targetHours = 40

    return members.map((m) => {
      const memberBookings = bookings.filter((b) => b.team_member_id === m.id)
      const weekBookings = memberBookings.filter((b) => {
        const t = new Date(b.start_time).getTime()
        return t >= monday.getTime() && t < sunday.getTime()
      })
      const hours = weekBookings.reduce((s, b) => {
        const start = new Date(b.start_time).getTime()
        const end = b.end_time ? new Date(b.end_time).getTime() : start + 3 * 3_600_000
        return s + Math.max(0.5, (end - start) / 3_600_000)
      }, 0)
      const ltv = memberBookings
        .filter((b) => b.status === 'completed')
        .reduce((s, b) => s + Number(b.price || 0), 0)

      return {
        ...m,
        jobs_this_week: weekBookings.length,
        hours_this_week: Math.round(hours * 10) / 10,
        utilization_pct: Math.round((hours / targetHours) * 100),
        ltv_total_cents: ltv,
      }
    }).sort((a, b) => b.utilization_pct - a.utilization_pct)
  }, [members, bookings])

  const stats = useMemo(() => {
    const active = enriched.filter((m) => (m.status || 'active') !== 'inactive').length
    const overcap = enriched.filter((m) => m.utilization_pct >= 100).length
    const idle = enriched.filter((m) => m.utilization_pct < 30).length
    const avgUtil = enriched.length > 0 ? Math.round(enriched.reduce((s, m) => s + m.utilization_pct, 0) / enriched.length) : 0
    const totalJobs = enriched.reduce((s, m) => s + m.jobs_this_week, 0)
    return { active, overcap, idle, avgUtil, totalJobs }
  }, [enriched])

  return (
    <div className="tm-scope">
      <div className="tm-portals-bar">
        <div className="tm-portal-item">
          <span className="tm-portal-label">Team Portal</span>
          <span className="tm-portal-url">/team</span>
          <span className="tm-portal-copy">Copy</span>
        </div>
        <span className="tm-portal-divider" />
        <div className="tm-portal-item">
          <span className="tm-portal-label">Apply</span>
          <span className="tm-portal-url">/apply</span>
          <span className="tm-portal-copy">Copy</span>
        </div>
      </div>

      <div className="tm-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tm-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} type="button">
            <span className="tm-tab-letter">{t.letter}</span>
            {t.label}
            {t.key === 'team' && stats.active > 0 && <span className="tm-tab-count">{stats.active}</span>}
            {t.key === 'applications' && applications.filter((a) => a.status === 'pending').length > 0 && (
              <span className="tm-tab-count">{applications.filter((a) => a.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="tm-bar-label">Roster · This Week</div>
      <div className="tm-outlook">
        <div className="tm-stat">
          <div className="tm-stat-label">Active <span className="tm-stat-tag">members</span></div>
          <div className="tm-stat-value">{stats.active}</div>
          <div className="tm-stat-sub">On roster</div>
        </div>
        <div className="tm-stat">
          <div className="tm-stat-label">Avg Utilization</div>
          <div className="tm-stat-value">{stats.avgUtil}<span className="pct">%</span></div>
          <div className="tm-stat-sub">Hours sold vs 40h target</div>
        </div>
        <div className="tm-stat">
          <div className="tm-stat-label">Overcapacity {stats.overcap > 0 && <span className="tm-stat-tag warn">flag</span>}</div>
          <div className="tm-stat-value">{stats.overcap}</div>
          <div className={`tm-stat-sub ${stats.overcap > 0 ? 'warn' : ''}`}>{stats.overcap > 0 ? '≥100% util' : 'None overloaded'}</div>
        </div>
        <div className="tm-stat">
          <div className="tm-stat-label">Idle {stats.idle > 0 && <span className="tm-stat-tag warn">slack</span>}</div>
          <div className="tm-stat-value">{stats.idle}</div>
          <div className="tm-stat-sub">Under 30% utilized</div>
        </div>
        <div className="tm-stat">
          <div className="tm-stat-label">Jobs This Week</div>
          <div className="tm-stat-value">{stats.totalJobs}</div>
          <div className="tm-stat-sub">Across team</div>
        </div>
        <div className="tm-stat">
          <div className="tm-stat-label">Avg Rating</div>
          <div className="tm-stat-value">—</div>
          <div className="tm-stat-sub">Wire reviews next pass</div>
        </div>
      </div>

      {tab === 'applications' && (
        <>
          <div className="tm-section-head">
            <h2 className="tm-section-title">Applications<em>.</em></h2>
            <div className="tm-section-actions">
              <span className="tm-section-meta">
                {applications.length} total · {applications.filter((a) => a.status === 'pending').length} pending
              </span>
              {applications.filter((a) => a.status === 'pending').length > 0 && (
                <button
                  type="button"
                  className="tm-bulk-approve-btn"
                  onClick={bulkApproveAll}
                  disabled={bulkApproving}
                >
                  {bulkApproving
                    ? 'Approving…'
                    : `Approve all pending (${applications.filter((a) => a.status === 'pending').length})`}
                </button>
              )}
            </div>
          </div>

          {appsLoading && <div className="tm-empty">Loading…</div>}
          {!appsLoading && applications.length === 0 && (
            <div className="tm-empty">
              No applications yet. Share the apply link: <code>/apply</code>
            </div>
          )}

          {!appsLoading && applications.length > 0 && (
            <div className="tm-apps">
              {applications.filter((a) => a.status === 'pending').length > 0 && (
                <div className="tm-apps-group">
                  <div className="tm-apps-group-head">Pending</div>
                  {applications
                    .filter((a) => a.status === 'pending')
                    .map((app) => (
                      <div key={app.id} className="tm-app-row">
                        <div className="tm-app-photo">
                          {app.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={app.photo_url} alt={app.name} />
                          ) : (
                            <span className="tm-app-photo-fallback">{initials(app.name)}</span>
                          )}
                        </div>
                        <div className="tm-app-body">
                          <div className="tm-app-name">{app.name}</div>
                          <div className="tm-app-meta">
                            {app.phone} · {app.email || 'no email'}
                          </div>
                          {app.address && <div className="tm-app-meta">📍 {app.address}</div>}
                          <div className="tm-app-meta">
                            {app.experience && <span>{app.experience} exp · </span>}
                            {app.availability && <span>{app.availability} · </span>}
                            {app.has_car !== null && <span>drives: {app.has_car ? 'yes' : 'no'}</span>}
                          </div>
                          {Array.isArray(app.service_zones) && app.service_zones.length > 0 && (
                            <div className="tm-app-meta">zones: {app.service_zones.join(', ')}</div>
                          )}
                          {Array.isArray(app.references) && app.references.length > 0 && (
                            <div className="tm-app-meta">
                              refs: {app.references.map((r) => `${r.name} (${r.phone})`).join('; ')}
                            </div>
                          )}
                          {app.notes && <div className="tm-app-notes">&ldquo;{app.notes}&rdquo;</div>}
                          <div className="tm-app-date">
                            applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="tm-app-actions">
                          <button className="tm-action-btn" type="button" onClick={() => updateApplication(app.id, 'approved')}>Approve</button>
                          <button className="tm-action-btn" type="button" onClick={() => updateApplication(app.id, 'rejected')}>Reject</button>
                          <button className="tm-action-btn" type="button" onClick={() => deleteApplication(app.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {applications.filter((a) => a.status !== 'pending').length > 0 && (
                <div className="tm-apps-group">
                  <div className="tm-apps-group-head">Past</div>
                  {applications
                    .filter((a) => a.status !== 'pending')
                    .map((app) => (
                      <div key={app.id} className="tm-app-row past">
                        <div className="tm-app-photo">
                          {app.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={app.photo_url} alt={app.name} />
                          ) : (
                            <span className="tm-app-photo-fallback">{initials(app.name)}</span>
                          )}
                        </div>
                        <div className="tm-app-body">
                          <div className="tm-app-name">{app.name}</div>
                          <div className="tm-app-meta">{app.phone} · {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                        <div className="tm-app-actions">
                          <span className={`tm-app-status ${app.status}`}>{app.status}</span>
                          <button className="tm-action-btn" type="button" onClick={() => deleteApplication(app.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'sales_apps' && (
        <SalesAppsTab />
      )}

      {tab !== 'team' && tab !== 'applications' && tab !== 'sales_apps' && (
        <div className="tm-coming-soon">
          <div className="tm-coming-soon-title">Coming soon.</div>
          <div>{TABS.find((t) => t.key === tab)?.label} view will land next pass.</div>
        </div>
      )}

      {tab === 'team' && (
        <>
          <TeamCoverageMap serviceArea={serviceArea} />

          <div className="tm-section-head">
            <h2 className="tm-section-title">Team<em>.</em></h2>
            <span className="tm-section-meta">{enriched.length} {enriched.length === 1 ? 'member' : 'members'}</span>
          </div>

          {loading && <div className="tm-empty">Loading…</div>}
          {!loading && enriched.length === 0 && <div className="tm-empty">No team members yet.</div>}

          <div className="tm-grid">
            {enriched.map((m) => {
              const cardClass = m.utilization_pct >= 100 ? 'over' : m.utilization_pct < 20 ? 'under' : ''
              const utilNumClass = m.utilization_pct >= 100 ? 'over' : m.utilization_pct < 30 ? 'low' : ''
              const utilFillClass = m.utilization_pct >= 100 ? 'over' : m.utilization_pct >= 75 ? 'full' : m.utilization_pct >= 40 ? 'med' : 'low'
              const statusClass = m.utilization_pct >= 100 ? 'over' : m.utilization_pct < 30 ? 'idle' : ''
              const statusLabel = m.utilization_pct >= 100 ? 'OVERCAP' : m.utilization_pct < 30 ? 'IDLE' : 'ACTIVE'
              return (
                <div key={m.id} className={`tm-card ${cardClass}`}>
                  <div className="tm-card-head">
                    <span className="tm-avatar" style={{ background: colorFor(m.id) }}>{initials(m.name)}</span>
                    <div className="tm-name-block">
                      <div className="tm-name">{m.name}</div>
                      <div className={`tm-status-row ${statusClass}`}>
                        <span className="tm-status-dot live" />
                        {statusLabel} · {m.role || 'worker'}
                      </div>
                    </div>
                  </div>

                  <div className="tm-util">
                    <div>
                      <span className={`tm-util-num ${utilNumClass}`}>{m.utilization_pct}</span>
                      <span className="tm-util-pct">%</span>
                    </div>
                    <div className="tm-util-label">Util · Wk</div>
                    <div className="tm-util-bar">
                      <div className={`tm-util-fill ${utilFillClass}`} style={{ width: `${Math.min(100, m.utilization_pct)}%` }} />
                    </div>
                  </div>

                  <div className="tm-metrics">
                    <div className="tm-metric">
                      <div className="tm-metric-label">Jobs · Wk</div>
                      <div className="tm-metric-value">{m.jobs_this_week}</div>
                    </div>
                    <div className="tm-metric">
                      <div className="tm-metric-label">Hours · Wk</div>
                      <div className="tm-metric-value">{m.hours_this_week}</div>
                    </div>
                    <div className="tm-metric">
                      <div className="tm-metric-label">Rate</div>
                      <div className="tm-metric-value">{m.hourly_rate ? `$${Math.round(Number(m.hourly_rate))}` : '—'}</div>
                      <div className="tm-metric-sub">per hour</div>
                    </div>
                    <div className="tm-metric">
                      <div className="tm-metric-label">LTV Earned</div>
                      <div className="tm-metric-value">${Math.round(m.ltv_total_cents / 100).toLocaleString('en-US')}</div>
                    </div>
                  </div>

                  <div className="tm-actions">
                    <button className="tm-action-btn" type="button">Schedule</button>
                    <button className="tm-action-btn" type="button">Pay</button>
                    <button className="tm-action-btn" type="button">Profile</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
