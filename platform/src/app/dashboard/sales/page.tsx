'use client'

import { useEffect, useMemo, useState } from 'react'
import './sales.css'
import SalesQuotesTab from './sales-quotes-tab'
import SalesWonTab from './sales-won-tab'
import SalesForecastTab from './sales-forecast-tab'
import SalesConversationsTab from './sales-conversations-tab'

type Tab = 'pipeline' | 'leads' | 'quotes' | 'won' | 'lost' | 'forecast' | 'conversations'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'pipeline', letter: 'A', label: 'Pipeline' },
  { key: 'leads', letter: 'B', label: 'Leads' },
  { key: 'quotes', letter: 'C', label: 'Quotes' },
  { key: 'won', letter: 'D', label: 'Won' },
  { key: 'lost', letter: 'E', label: 'Lost' },
  { key: 'forecast', letter: 'F', label: 'Forecast' },
  { key: 'conversations', letter: 'G', label: 'Conversations' },
]

type Stage = 'new' | 'contacted' | 'qualified' | 'quoted' | 'negotiating' | 'booked'
const STAGES: Array<{ key: Stage; label: string }> = [
  { key: 'new', label: 'Inbound' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'booked', label: 'Booked' },
]
const KANBAN_STAGES: Stage[] = ['new', 'qualified', 'quoted', 'negotiating', 'booked']

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

export default function SalesPage() {
  const [tab, setTab] = useState<Tab>('pipeline')
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/deals')
      .then((r) => r.json())
      .then((d) => setDeals((d?.deals || []) as Deal[]))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }, [])

  const byStage = useMemo(() => {
    const map = new Map<Stage, Deal[]>()
    for (const s of STAGES) map.set(s.key, [])
    for (const d of deals) {
      const stage = (d.stage as Stage) || 'new'
      if (map.has(stage)) map.get(stage)!.push(d)
    }
    return map
  }, [deals])

  const stageStats = useMemo(() => {
    return STAGES.map((s) => {
      const list = byStage.get(s.key) || []
      const value = list.reduce((sum, d) => sum + d.value_cents, 0)
      return { stage: s.key, label: s.label, count: list.length, value }
    })
  }, [byStage])

  const totalPipelineValue = stageStats.reduce((s, x) => s + x.value, 0)
  const bookedThisMonth = (() => {
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return deals.filter((d) => d.stage === 'booked' && new Date(d.last_activity_at || d.created_at) >= start)
  })()
  const bookedCount = bookedThisMonth.length
  const bookedValue = bookedThisMonth.reduce((s, d) => s + d.value_cents, 0)

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of deals) {
      const src = (d.source || 'web').toLowerCase()
      counts[src] = (counts[src] || 0) + 1
    }
    return counts
  }, [deals])
  const sourceTotal = Object.values(sourceCounts).reduce((s, n) => s + n, 0) || 1

  return (
    <div className="sl-scope">
      <div className="sl-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`sl-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} type="button">
            <span className="sl-tab-letter">{t.letter}</span>
            {t.label}
            {t.key === 'pipeline' && deals.length > 0 && <span className="sl-tab-count">{deals.length}</span>}
          </button>
        ))}
      </div>

      <div className="sl-bar-label">Pipeline · This Month</div>
      <div className="sl-outlook">
        <div className="sl-stat">
          <div className="sl-stat-label">Open Deals</div>
          <div className="sl-stat-value">{deals.length}</div>
          <div className="sl-stat-sub">Across stages</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Pipeline Value</div>
          <div className="sl-stat-value"><span className="unit">$</span>{Math.round(totalPipelineValue / 100).toLocaleString('en-US')}</div>
          <div className="sl-stat-sub">Sum of open deals</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Booked · MTD</div>
          <div className="sl-stat-value">{bookedCount}</div>
          <div className="sl-stat-sub good">{fmtMoney(bookedValue)}</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Win Rate</div>
          <div className="sl-stat-value">{deals.length > 0 ? Math.round((bookedCount / deals.length) * 100) : 0}<span className="pct">%</span></div>
          <div className="sl-stat-sub">Booked / total open</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Stale {deals.filter((d) => ageDays(d.last_activity_at || d.created_at) > 7).length > 0 && <span className="sl-stat-tag warn">action</span>}</div>
          <div className="sl-stat-value">{deals.filter((d) => ageDays(d.last_activity_at || d.created_at) > 7).length}</div>
          <div className="sl-stat-sub">No activity 7d+</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Avg Deal Size</div>
          <div className="sl-stat-value"><span className="unit">$</span>{deals.length > 0 ? Math.round(totalPipelineValue / 100 / deals.length).toLocaleString('en-US') : 0}</div>
          <div className="sl-stat-sub">Per open deal</div>
        </div>
      </div>

      {/* GOAL TRACKER */}
      <div className="sl-goal-card">
        <div className="sl-goal-block">
          <span className="sl-goal-label">This Month · Bookings</span>
          <span className={`sl-goal-num ${bookedCount > 0 ? 'good' : ''}`}>{bookedCount} / 32</span>
          <div className="sl-goal-bar">
            <div className={`sl-goal-fill ${bookedCount >= 32 ? 'over' : ''}`} style={{ width: `${Math.min(100, (bookedCount / 32) * 100)}%` }} />
          </div>
          <span className="sl-goal-meta">{Math.round((bookedCount / 32) * 100)}% to plan</span>
        </div>
        <div className="sl-goal-block">
          <span className="sl-goal-label">Revenue Goal</span>
          <span className="sl-goal-num">{fmtMoney(bookedValue)} / $6,400</span>
          <div className="sl-goal-bar">
            <div className="sl-goal-fill" style={{ width: `${Math.min(100, (bookedValue / 640000) * 100)}%` }} />
          </div>
          <span className="sl-goal-meta">{Math.round((bookedValue / 640000) * 100)}% to plan</span>
        </div>
        <div className="sl-goal-block">
          <span className="sl-goal-label">Pipeline Health</span>
          <span className="sl-goal-num">{deals.length}</span>
          <div className="sl-goal-bar">
            <div className="sl-goal-fill" style={{ width: `${Math.min(100, deals.length * 5)}%` }} />
          </div>
          <span className="sl-goal-meta">Target: 20+ open deals</span>
        </div>
        <div className="sl-goal-block">
          <span className="sl-goal-label">Days Left in Month</span>
          <span className="sl-goal-num">
            {(() => {
              const today = new Date()
              const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
              return last.getDate() - today.getDate()
            })()}
          </span>
          <div className="sl-goal-bar">
            <div className="sl-goal-fill" style={{ width: `${(new Date().getDate() / 30) * 100}%` }} />
          </div>
          <span className="sl-goal-meta"><strong>{new Date().getDate()}</strong> days done</span>
        </div>
      </div>

      {tab === 'quotes' && <SalesQuotesTab />}
      {tab === 'won' && <SalesWonTab view="won" />}
      {tab === 'lost' && <SalesWonTab view="lost" />}
      {tab === 'forecast' && <SalesForecastTab />}
      {tab === 'conversations' && <SalesConversationsTab />}

      {tab === 'leads' && (
        <div className="sl-coming-soon">
          <div className="sl-coming-soon-title">Coming soon.</div>
          <div>Leads view will land next pass.</div>
        </div>
      )}

      {tab === 'pipeline' && (
        <>
          <div className="sl-section-head">
            <h2 className="sl-section-title">Pipeline<em>.</em></h2>
            <span className="sl-section-meta">{deals.length} {deals.length === 1 ? 'deal' : 'deals'} · {fmtMoney(totalPipelineValue)} value</span>
          </div>

          {/* STAGE STATS */}
          <div className="sl-stage-stats">
            {stageStats.map((s) => (
              <div key={s.stage} className="sl-stage-cell">
                <span className="sl-stage-name">
                  <span className={`sl-stage-dot ${s.stage}`} />
                  {s.label}
                </span>
                <div className="sl-stage-row">
                  <span className="sl-stage-count">{s.count}</span>
                  <span className="sl-stage-value">{fmtMoney(s.value)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* KANBAN */}
          <div className="sl-kanban">
            {KANBAN_STAGES.map((stage) => {
              const list = byStage.get(stage) || []
              const stageMeta = STAGES.find((s) => s.key === stage)!
              const total = list.reduce((s, d) => s + d.value_cents, 0)
              return (
                <div key={stage} className="sl-lane">
                  <div className="sl-lane-head">
                    <span className="sl-lane-name">
                      <span className={`sl-stage-dot ${stage}`} />
                      {stageMeta.label}
                    </span>
                    <span className="sl-lane-count">{list.length}</span>
                  </div>
                  <div className="sl-lane-value">{fmtMoney(total)}</div>
                  {loading && list.length === 0 && <div className="sl-empty" style={{ padding: 8 }}>—</div>}
                  {list.map((d) => {
                    const age = ageDays(d.last_activity_at || d.created_at)
                    const ageClass = age >= 14 ? 'danger' : age >= 7 ? 'warn' : ''
                    const dealClass = d.probability && d.probability >= 75 ? 'hot' : age >= 14 ? 'stale' : age >= 7 ? 'aging' : ''
                    const sourceClass = ((d.source || 'web') as string).toLowerCase().includes('selena') ? 'selena' : ((d.source || 'web') as string).toLowerCase()
                    const srcSafe: 'selena' | 'web' | 'referral' | 'repeat' =
                      sourceClass === 'selena' || sourceClass === 'web' || sourceClass === 'referral' || sourceClass === 'repeat'
                        ? sourceClass as 'selena' | 'web' | 'referral' | 'repeat'
                        : 'web'
                    return (
                      <div key={d.id} className={`sl-deal ${dealClass}`}>
                        <div className="sl-deal-name">{d.clients?.name || d.title || 'Untitled'}</div>
                        <div className="sl-deal-meta">
                          <span className="sl-deal-ctx">{d.title || (d.clients?.address ?? '—')}</span>
                          <span className="sl-deal-value">{fmtMoney(d.value_cents)}</span>
                        </div>
                        <div className="sl-deal-foot">
                          <span className={`sl-deal-source ${srcSafe}`}>{srcSafe}</span>
                          <span className={`sl-deal-age ${ageClass}`}>{age === 0 ? 'today' : `${age}d`}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* PANEL ROW */}
          <div className="sl-panel-row">
            <div className="sl-panel">
              <div className="sl-panel-head">
                <span className="sl-panel-label">Selena · Active Conversations</span>
                <span className="sl-live-tag">LIVE</span>
              </div>
              <div className="sl-empty">Conversation feed wires next pass.</div>
            </div>

            <div className="sl-panel">
              <div className="sl-panel-head">
                <span className="sl-panel-label">Source Mix</span>
              </div>
              {Object.entries(sourceCounts).slice(0, 5).map(([src, n]) => {
                const pct = Math.round((n / sourceTotal) * 100)
                const colorMap: Record<string, string> = {
                  selena: 'var(--sl-good)',
                  web: 'var(--sl-ink)',
                  referral: 'var(--sl-vip)',
                  repeat: 'var(--sl-warn)',
                }
                const color = colorMap[src] || 'var(--sl-muted)'
                return (
                  <div key={src} className="sl-source-row">
                    <span className="sl-source-dot" style={{ background: color }} />
                    <span className="sl-source-name">{src}</span>
                    <div className="sl-source-bar"><div className="sl-source-fill" style={{ width: `${pct}%`, background: color }} /></div>
                    <span className="sl-source-pct">{pct}%</span>
                  </div>
                )
              })}
              {Object.keys(sourceCounts).length === 0 && <div className="sl-empty">No deals yet.</div>}
            </div>

            <div className="sl-panel">
              <div className="sl-panel-head">
                <span className="sl-panel-label">Lost Reasons</span>
              </div>
              <div className="sl-empty">Wires next pass.</div>
            </div>

            <div className="sl-panel">
              <div className="sl-panel-head">
                <span className="sl-panel-label">Funnel · Mini</span>
              </div>
              <div className="sl-funnel-mini">
                {stageStats.map((s, i) => {
                  const max = Math.max(1, ...stageStats.map((x) => x.count))
                  const pctOfPrev = i === 0 ? 100 : stageStats[i - 1].count > 0 ? Math.round((s.count / stageStats[i - 1].count) * 100) : 0
                  return (
                    <div key={s.stage} className="sl-funnel-step">
                      <span className="sl-funnel-label">{s.label}</span>
                      <div className="sl-funnel-bar">
                        <div className="sl-funnel-fill" style={{ width: `${(s.count / max) * 100}%` }}>{s.count}</div>
                      </div>
                      <span className={`sl-funnel-pct ${i === 0 ? 'muted' : ''}`}>{i === 0 ? '—' : `${pctOfPrev}%`}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
