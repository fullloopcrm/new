'use client'

import { useEffect, useMemo, useState } from 'react'

type Deal = {
  id: string
  client_id: string | null
  title: string
  stage: string
  status: string | null
  value_cents: number
  source: string | null
  created_at: string
  closed_at: string | null
  last_activity_at: string | null
  clients: { name: string | null } | null
}

type View = 'won' | 'lost'

function fmtMoney(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}
function initials(name: string | null): string {
  if (!name) return '—'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function SalesWonTab({ view = 'won' }: { view?: View }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/deals?limit=500')
      .then((r) => r.json())
      .then((d) => setDeals((d?.deals || []) as Deal[]))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (view === 'won') return deals.filter((d) => d.stage === 'booked' || d.status === 'won')
    return deals.filter((d) => d.status === 'lost' || d.stage === 'lost')
  }, [deals, view])

  const totalValue = filtered.reduce((s, d) => s + d.value_cents, 0)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const thisMonth = filtered.filter((d) => new Date(d.closed_at || d.last_activity_at || d.created_at) >= monthStart)
  const monthValue = thisMonth.reduce((s, d) => s + d.value_cents, 0)

  // Grouping
  const sourceCounts: Record<string, number> = {}
  for (const d of filtered) {
    const src = (d.source || 'web').toLowerCase()
    sourceCounts[src] = (sourceCounts[src] || 0) + 1
  }
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0] || ['—', 0]

  const isLost = view === 'lost'

  return (
    <>
      <div className="sl-bar-label">{isLost ? 'Lost · Last 90 Days' : 'Won · Last 90 Days'}</div>
      <div className="sl-outlook">
        <div className="sl-stat">
          <div className="sl-stat-label">Total {isLost ? 'Lost' : 'Won'}</div>
          <div className="sl-stat-value">{filtered.length}</div>
          <div className="sl-stat-sub">{fmtMoney(totalValue)} total</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">This Month</div>
          <div className="sl-stat-value">{thisMonth.length}</div>
          <div className={`sl-stat-sub ${isLost ? 'warn' : 'good'}`}>{fmtMoney(monthValue)}</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Avg Deal Size</div>
          <div className="sl-stat-value"><span className="unit">$</span>{filtered.length > 0 ? Math.round(totalValue / 100 / filtered.length).toLocaleString('en-US') : 0}</div>
          <div className="sl-stat-sub">Per deal</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Top Source</div>
          <div className="sl-stat-value" style={{ fontSize: 22 }}>{topSource[0]}</div>
          <div className="sl-stat-sub">{topSource[1]} {isLost ? 'lost' : 'won'}</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Avg Days to Close</div>
          <div className="sl-stat-value">—</div>
          <div className="sl-stat-sub">Wires next pass</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">{isLost ? 'Win-Back Sent' : 'Repeat Customers'}</div>
          <div className="sl-stat-value">—</div>
          <div className="sl-stat-sub">Wires next pass</div>
        </div>
      </div>

      <div style={{ background: 'var(--sl-canvas)', border: '1px solid var(--sl-line)', borderRadius: 4, overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 100px 110px 110px 110px', padding: '10px 14px', background: 'var(--sl-bg)', borderBottom: '1px solid var(--sl-line)', fontFamily: 'var(--sl-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--sl-muted)', fontWeight: 600 }}>
          <div>Client</div>
          <div>Title</div>
          <div>Source</div>
          <div>Value</div>
          <div>{isLost ? 'Lost' : 'Closed'}</div>
          <div />
        </div>
        {loading && <div className="sl-empty">Loading…</div>}
        {!loading && filtered.length === 0 && <div className="sl-empty">No {isLost ? 'lost' : 'won'} deals in this window.</div>}
        {filtered.map((d) => (
          <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 100px 110px 110px 110px', padding: '12px 14px', borderBottom: '1px solid var(--sl-line-soft)', alignItems: 'center', fontSize: 12.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sl-ink)', color: 'var(--sl-canvas)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sl-display)', fontSize: 11, fontWeight: 600 }}>
                {initials(d.clients?.name ?? null)}
              </span>
              <div className="sl-deal-name">{d.clients?.name || '—'}</div>
            </div>
            <div style={{ color: 'var(--sl-graphite)' }}>{d.title}</div>
            <div><span className="sl-deal-source web">{d.source || 'web'}</span></div>
            <div className="sl-deal-value">{fmtMoney(d.value_cents)}</div>
            <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 11, color: 'var(--sl-muted)' }}>
              {(() => {
                const ts = d.closed_at || d.last_activity_at
                if (!ts) return '—'
                return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              })()}
            </div>
            <div><button type="button" style={{ fontFamily: 'inherit', fontSize: 11, padding: '5px 10px', border: '1px solid var(--sl-line)', borderRadius: 3, background: 'var(--sl-canvas)', cursor: 'pointer' }}>{isLost ? 'Win-back' : 'View'}</button></div>
          </div>
        ))}
      </div>
    </>
  )
}
