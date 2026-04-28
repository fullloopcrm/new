'use client'

import { useEffect, useMemo, useState } from 'react'
import './leads.css'

type Tab = 'live' | 'funnel' | 'network' | 'sources' | 'geography' | 'hiring' | 'search'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'live', letter: 'A', label: 'Live Feed' },
  { key: 'funnel', letter: 'B', label: 'Funnel' },
  { key: 'network', letter: 'C', label: 'Network' },
  { key: 'sources', letter: 'D', label: 'Sources' },
  { key: 'geography', letter: 'E', label: 'Geography' },
  { key: 'hiring', letter: 'F', label: 'Hiring Funnel' },
  { key: 'search', letter: 'G', label: 'Search Intel' },
]

type FeedRow = {
  id: string
  rank: number
  score: number
  band: 'hot' | 'warm' | 'cold' | 'dead'
  visitor_name: string | null
  anonymous: boolean
  zip: string | null
  device: string | null
  source_domain: string | null
  source_path: string | null
  source_kind: 'search' | 'referrer' | 'direct'
  intent_action: string
  intent_meta: string | null
  intent_warn: boolean
  time_label: string
  time_sub: string | null
  is_live: boolean
  status: 'browsing' | 'form' | 'contacted' | 'quoted' | 'booked' | 'dead'
  conv_kind: 'auto' | 'manual' | null
}

type FeedData = {
  feed: FeedRow[]
  stats: {
    live_now: number
    visits_today: number
    leads_today: number
    conversion_pct: number
    time_to_contact_seconds: number | null
    booked_from_leads: number
    lead_to_book_pct: number
    avg_ltv_cents: number
  }
  funnel: {
    visitors: number
    form_starts: number
    form_submits: number
    contacted: number
    quoted: number
    booked: number
    showed: number
    paid: number
  }
  channels: {
    organic_pct: number
    referral_pct: number
    direct_pct: number
    social_pct: number
    paid_pct: number
  }
  top_domains: Array<{ rank: string; domain: string; leads: number; last_ts: string }>
  top_queries: Array<{ query: string; count: number; trend: 'up' | 'down' | 'flat' }>
}

type FilterKey = 'all' | 'hot' | 'form' | 'returning' | 'hiring'
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'hot', label: 'Hot 70+' },
  { key: 'form', label: 'On Form' },
  { key: 'returning', label: 'Returning' },
  { key: 'hiring', label: 'Hiring' },
]

function fmtMoney(cents: number): string {
  return Math.round(cents / 100).toLocaleString('en-US')
}

function pctOf(part: number, whole: number): string {
  if (whole <= 0) return '0%'
  return `${Math.round((part / whole) * 1000) / 10}%`
}

export default function LeadsPage() {
  const [data, setData] = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('live')
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    setLoading(true)
    fetch('/api/leads/feed')
      .then((r) => r.json())
      .then((d) => setData(d && !d.error ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.feed.filter((r) => {
      if (filter === 'all') return true
      if (filter === 'hot') return r.score >= 70
      if (filter === 'form') return r.status === 'form'
      if (filter === 'returning') return /\d+\s+visits/i.test(r.time_sub || '')
      return true
    })
  }, [data, filter])

  const stats = data?.stats
  const funnel = data?.funnel
  const channels = data?.channels
  const visitors = funnel?.visitors ?? 0
  const period = (() => {
    const end = new Date()
    const start = new Date(Date.now() - 6 * 86_400_000)
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(start)} — ${fmt(end)}`
  })()

  return (
    <div className="leads-scope">
      {/* CONTEXT BAR */}
      <div className="leads-context-bar">
        <span className="leads-context-back">01 Sales</span>
        <span className="leads-context-divider">/</span>
        <span className="leads-context-current">B · Leads</span>
      </div>

      {/* TABS */}
      <div className="leads-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`leads-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            <span className="leads-tab-letter">{t.letter}</span>
            {t.label}
            {t.key === 'live' && (stats?.live_now ?? 0) > 0 && (
              <span className="leads-tab-count live">{stats?.live_now}</span>
            )}
          </button>
        ))}
      </div>

      {/* OUTLOOK */}
      <div className="leads-bar-label">Pipeline · Today</div>
      <div className="leads-outlook">
        <div className="leads-stat">
          <div className="leads-stat-label">
            Live Now
            {(stats?.live_now ?? 0) > 0 && <span className="leads-stat-tag live">on site</span>}
          </div>
          <div className="leads-stat-value">{stats?.live_now ?? 0}</div>
          <div className="leads-stat-sub good">{(stats?.live_now ?? 0) > 0 ? 'Hot prospects' : 'No live visitors'}</div>
        </div>
        <div className="leads-stat">
          <div className="leads-stat-label">Visits Today</div>
          <div className="leads-stat-value">{(stats?.visits_today ?? 0).toLocaleString('en-US')}</div>
          <div className="leads-stat-sub">{stats?.visits_today ? 'Tracked sessions' : 'Tracking pipeline pending'}</div>
        </div>
        <div className="leads-stat">
          <div className="leads-stat-label">Leads Today</div>
          <div className="leads-stat-value">{stats?.leads_today ?? 0}</div>
          <div className="leads-stat-sub"><strong>{stats?.conversion_pct ?? 0}%</strong> conversion</div>
        </div>
        <div className="leads-stat">
          <div className="leads-stat-label">Time-to-Contact</div>
          <div className="leads-stat-value">
            {stats?.time_to_contact_seconds != null
              ? `${Math.floor(stats.time_to_contact_seconds / 60)}:${String(stats.time_to_contact_seconds % 60).padStart(2, '0')}`
              : '—'}
          </div>
          <div className="leads-stat-sub">Selena avg (placeholder)</div>
        </div>
        <div className="leads-stat">
          <div className="leads-stat-label">Booked from Leads</div>
          <div className="leads-stat-value">{stats?.booked_from_leads ?? 0}</div>
          <div className="leads-stat-sub"><strong>{stats?.lead_to_book_pct ?? 0}%</strong> lead → book</div>
        </div>
        <div className="leads-stat">
          <div className="leads-stat-label">Avg LTV / Lead</div>
          <div className="leads-stat-value"><span className="unit">$</span>{fmtMoney(stats?.avg_ltv_cents ?? 0)}</div>
          <div className="leads-stat-sub">Per recent lead</div>
        </div>
      </div>

      {tab !== 'live' && tab !== 'funnel' && (
        <div className="leads-coming-soon">
          <div className="leads-coming-soon-title">Coming soon.</div>
          <div>{TABS.find((t) => t.key === tab)?.label} view will land next pass.</div>
        </div>
      )}

      {(tab === 'live' || tab === 'funnel') && (
        <div className="leads-two-col">
          <div>
            {tab === 'live' && (
              <>
                <div className="leads-feed-head">
                  <span className="leads-feed-title">Live Visitor Feed <span className="leads-live-tag">LIVE</span></span>
                  <div className="leads-feed-actions">
                    {FILTERS.map((f) => (
                      <span
                        key={f.key}
                        className={`leads-feed-filter ${filter === f.key ? 'active' : ''}`}
                        onClick={() => setFilter(f.key)}
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="leads-table">
                  <div className="leads-thead">
                    <div />
                    <div>Score</div>
                    <div>Visitor</div>
                    <div>Source / Path</div>
                    <div>Intent</div>
                    <div>Time</div>
                    <div>Status</div>
                    <div>Conv</div>
                    <div />
                  </div>

                  {loading && <div className="leads-empty">Loading…</div>}
                  {!loading && filtered.length === 0 && (
                    <div className="leads-empty">No leads match this filter yet.</div>
                  )}
                  {!loading && filtered.map((r) => {
                    const rowClass = ['leads-row', r.is_live ? 'live' : '', r.score >= 70 && !r.is_live ? 'hot' : ''].filter(Boolean).join(' ')
                    return (
                      <div key={r.id} className={rowClass}>
                        <div className="leads-row-rank">#{r.rank}</div>
                        <div className="leads-score-cell">
                          <span className={`leads-score-num ${r.band}`}>{r.score}</span>
                          <div className="leads-score-bar">
                            <div className={`leads-score-fill ${r.band}`} style={{ width: `${r.score}%` }} />
                          </div>
                        </div>
                        <div className="leads-row-visitor">
                          <div className="leads-visitor-id">
                            {r.anonymous ? <span className="anon">Anonymous</span> : r.visitor_name}
                            {r.is_live && <span className="leads-live-pulse">live</span>}
                          </div>
                          <div className="leads-visitor-loc">
                            {[r.zip, r.device].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </div>
                        <div className="leads-source-cell">
                          <div className="leads-source-domain">{r.source_domain || '—'}</div>
                          {r.source_path && (
                            <div className={`leads-source-path ${r.source_kind === 'search' ? 'search' : r.source_kind === 'referrer' ? 'referrer' : ''}`}>
                              {r.source_path}
                            </div>
                          )}
                        </div>
                        <div className="leads-intent-cell">
                          <div className="leads-intent-action">{r.intent_action}</div>
                          {r.intent_meta && (
                            <div className={`leads-intent-meta ${r.intent_warn ? 'warn' : ''}`}>{r.intent_meta}</div>
                          )}
                        </div>
                        <div className={`leads-time-cell ${r.is_live ? 'live' : ''}`}>
                          {r.time_label}
                          {r.time_sub && <div className="leads-time-cell-sub">{r.time_sub}</div>}
                        </div>
                        <div><span className={`leads-status ${r.status}`}>{r.status === 'form' ? 'On Form' : r.status[0].toUpperCase() + r.status.slice(1)}</span></div>
                        <div>{r.conv_kind ? <span className={`leads-conv ${r.conv_kind}`}>{r.conv_kind === 'auto' ? 'Selena' : 'Manual'}</span> : null}</div>
                        <div className="leads-row-actions"><button className="leads-icon-btn" type="button" onClick={(e) => e.stopPropagation()}>⋯</button></div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* FUNNEL */}
            {(tab === 'funnel' || tab === 'live') && funnel && (
              <div className="leads-funnel-card">
                <div className="leads-funnel-head">
                  <span className="leads-funnel-title">Conversion Funnel · Last 7 Days</span>
                  <span className="leads-funnel-period">{period}</span>
                </div>
                <div className="leads-funnel-rows">
                  {(() => {
                    const rows: Array<{ label: string; n: number; rate: string; fill?: 'good' | 'warn' | '' }> = [
                      { label: 'Visitors', n: funnel.visitors, rate: '100%', fill: '' },
                      { label: 'Form Started', n: funnel.form_starts, rate: pctOf(funnel.form_starts, funnel.visitors), fill: '' },
                      { label: 'Form Submit', n: funnel.form_submits, rate: pctOf(funnel.form_submits, funnel.form_starts || funnel.visitors), fill: 'warn' },
                      { label: 'Contacted', n: funnel.contacted, rate: pctOf(funnel.contacted, funnel.form_submits), fill: 'good' },
                      { label: 'Quoted', n: funnel.quoted, rate: pctOf(funnel.quoted, funnel.contacted), fill: '' },
                      { label: 'Booked', n: funnel.booked, rate: pctOf(funnel.booked, funnel.quoted), fill: 'good' },
                      { label: 'Showed Up', n: funnel.showed, rate: pctOf(funnel.showed, funnel.booked), fill: 'good' },
                      { label: 'Paid', n: funnel.paid, rate: pctOf(funnel.paid, funnel.showed), fill: 'good' },
                    ]
                    const max = Math.max(1, ...rows.map((r) => r.n))
                    return rows.map((r) => (
                      <div key={r.label} className="leads-funnel-step">
                        <span className="leads-funnel-label">{r.label}</span>
                        <div className="leads-funnel-bar">
                          <div className={`leads-funnel-fill ${r.fill || ''}`} style={{ width: `${(r.n / max) * 100}%` }}>
                            {r.n.toLocaleString('en-US')}
                          </div>
                        </div>
                        <span className="leads-funnel-num">{r.n.toLocaleString('en-US')}</span>
                        <span className={`leads-funnel-rate ${r.label === 'Visitors' ? 'muted' : ''} ${r.label === 'Form Submit' ? 'warn' : ''}`}>{r.rate}</span>
                      </div>
                    ))
                  })()}
                </div>
                {funnel.visitors > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--leads-line)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--leads-muted)' }}>
                    <span>
                      Visitor → Paid · <strong style={{ color: 'var(--leads-good)', fontFamily: 'var(--leads-mono)', fontSize: 13 }}>{pctOf(funnel.paid, funnel.visitors)}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT RAIL */}
          <aside className="leads-ops-panel">
            <div className="leads-panel">
              <div className="leads-panel-label">
                <span>Top Domains · 7d</span>
                <span className="leads-panel-cta">View all →</span>
              </div>
              {(data?.top_domains.length ?? 0) === 0 && <div className="leads-empty">No domain traffic in window.</div>}
              {data?.top_domains.map((d) => (
                <div key={d.domain} className="leads-domain-row">
                  <span className="leads-domain-rank">{d.rank}</span>
                  <div className="leads-domain-info">
                    <div className="leads-domain-name">{d.domain}</div>
                    <div className="leads-domain-meta">{d.leads} {d.leads === 1 ? 'visit' : 'visits'}</div>
                  </div>
                  <div className="leads-domain-stats">{d.leads}</div>
                </div>
              ))}
            </div>

            <div className="leads-panel">
              <div className="leads-panel-label">Channel Mix · 7d</div>
              {channels && (
                <>
                  <div className="leads-source-row">
                    <span className="leads-source-row-dot" style={{ background: 'var(--leads-good)' }} />
                    <span className="leads-source-row-name">Organic Search</span>
                    <div className="leads-source-row-bar"><div className="leads-source-row-fill" style={{ width: `${channels.organic_pct}%`, background: 'var(--leads-good)' }} /></div>
                    <span className="leads-source-row-pct">{channels.organic_pct}%</span>
                  </div>
                  <div className="leads-source-row">
                    <span className="leads-source-row-dot" style={{ background: 'var(--leads-vip)' }} />
                    <span className="leads-source-row-name">Referral</span>
                    <div className="leads-source-row-bar"><div className="leads-source-row-fill" style={{ width: `${channels.referral_pct}%`, background: 'var(--leads-vip)' }} /></div>
                    <span className="leads-source-row-pct">{channels.referral_pct}%</span>
                  </div>
                  <div className="leads-source-row">
                    <span className="leads-source-row-dot" style={{ background: 'var(--leads-warn)' }} />
                    <span className="leads-source-row-name">Direct</span>
                    <div className="leads-source-row-bar"><div className="leads-source-row-fill" style={{ width: `${channels.direct_pct}%`, background: 'var(--leads-warn)' }} /></div>
                    <span className="leads-source-row-pct">{channels.direct_pct}%</span>
                  </div>
                  <div className="leads-source-row">
                    <span className="leads-source-row-dot" style={{ background: 'var(--leads-ink)' }} />
                    <span className="leads-source-row-name">Social</span>
                    <div className="leads-source-row-bar"><div className="leads-source-row-fill" style={{ width: `${channels.social_pct}%`, background: 'var(--leads-ink)' }} /></div>
                    <span className="leads-source-row-pct">{channels.social_pct}%</span>
                  </div>
                  <div className="leads-source-row">
                    <span className="leads-source-row-dot" style={{ background: 'var(--leads-muted-2)' }} />
                    <span className="leads-source-row-name">Paid</span>
                    <div className="leads-source-row-bar"><div className="leads-source-row-fill" style={{ width: `${channels.paid_pct}%`, background: 'var(--leads-muted-2)' }} /></div>
                    <span className="leads-source-row-pct">{channels.paid_pct}%</span>
                  </div>
                </>
              )}
            </div>

            <div className="leads-panel">
              <div className="leads-panel-label">
                <span>Top Searches · 7d</span>
              </div>
              {(data?.top_queries.length ?? 0) === 0 && (
                <div className="leads-empty">Search query tracking not yet wired.</div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
