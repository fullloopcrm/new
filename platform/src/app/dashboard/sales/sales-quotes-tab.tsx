'use client'

import { useEffect, useMemo, useState } from 'react'

type Quote = {
  id: string
  quote_number: string | null
  client_id: string | null
  status: string
  total_cents: number | null
  expires_at: string | null
  sent_at: string | null
  viewed_at: string | null
  responded_at: string | null
  created_at: string
  clients: { name: string | null; address: string | null } | null
}

type StatusKey = 'all' | 'sent' | 'viewed' | 'responded' | 'accepted' | 'expired'

function fmtMoney(cents: number | null): string {
  return '$' + Math.round((cents || 0) / 100).toLocaleString('en-US')
}
function ageLabel(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.round(ms / 3_600_000)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}
function expiresLabel(iso: string | null): { label: string; warn: boolean } {
  if (!iso) return { label: '—', warn: false }
  const ms = new Date(iso).getTime() - Date.now()
  const d = Math.round(ms / 86_400_000)
  if (d < 0) return { label: 'expired', warn: true }
  if (d === 0) return { label: 'today', warn: true }
  return { label: `${d}d`, warn: d <= 2 }
}
function initials(name: string | null): string {
  if (!name) return '—'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function SalesQuotesTab() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filter, setFilter] = useState<StatusKey>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/quotes?limit=200')
      .then((r) => r.json())
      .then((d) => setQuotes((d?.quotes || d || []) as Quote[]))
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = { all: quotes.length, sent: 0, viewed: 0, responded: 0, accepted: 0, expired: 0 }
    for (const q of quotes) {
      const s = (q.status || 'sent').toLowerCase() as StatusKey
      if (s in c) c[s]++
    }
    return c
  }, [quotes])

  const filtered = useMemo(() => {
    if (filter === 'all') return quotes
    return quotes.filter((q) => (q.status || '').toLowerCase() === filter)
  }, [quotes, filter])

  const inFlightCents = quotes.filter((q) => ['sent', 'viewed', 'responded'].includes((q.status || '').toLowerCase())).reduce((s, q) => s + (q.total_cents || 0), 0)
  const acceptedCount = counts.accepted
  const totalSent = counts.sent + counts.viewed + counts.responded + counts.accepted
  const acceptanceRate = totalSent > 0 ? Math.round((acceptedCount / totalSent) * 100) : 0
  const idleViewed = quotes.filter((q) => (q.status || '').toLowerCase() === 'viewed' && q.viewed_at && Date.now() - new Date(q.viewed_at).getTime() > 86_400_000).length
  const expiringSoon = quotes.filter((q) => {
    if (!q.expires_at || ['accepted', 'expired'].includes((q.status || '').toLowerCase())) return false
    const d = (new Date(q.expires_at).getTime() - Date.now()) / 86_400_000
    return d >= 0 && d <= 1
  }).length

  return (
    <>
      <div className="sl-bar-label">Quote Desk</div>
      <div className="sl-outlook">
        <div className="sl-stat">
          <div className="sl-stat-label">Active Quotes</div>
          <div className="sl-stat-value">{counts.sent + counts.viewed + counts.responded}</div>
          <div className="sl-stat-sub"><strong>{fmtMoney(inFlightCents)}</strong> in flight</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Acceptance Rate</div>
          <div className="sl-stat-value">{acceptanceRate}<span className="pct">%</span></div>
          <div className="sl-stat-sub">Accepted / sent</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Accepted · YTD</div>
          <div className="sl-stat-value">{counts.accepted}</div>
          <div className="sl-stat-sub good">Closed-won quotes</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Viewed but Idle {idleViewed > 0 && <span className="sl-stat-tag warn">nudge</span>}</div>
          <div className="sl-stat-value">{idleViewed}</div>
          <div className={`sl-stat-sub ${idleViewed > 0 ? 'warn' : ''}`}>Awaiting response 24h+</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Expiring Soon {expiringSoon > 0 && <span className="sl-stat-tag warn">{expiringSoon} today</span>}</div>
          <div className="sl-stat-value">{expiringSoon}</div>
          <div className={`sl-stat-sub ${expiringSoon > 0 ? 'warn' : ''}`}>≤24hr to expiry</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Expired · 7d</div>
          <div className="sl-stat-value">{counts.expired}</div>
          <div className="sl-stat-sub">Lost to inertia</div>
        </div>
      </div>

      <div className="sl-stage-stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {(['all', 'sent', 'viewed', 'responded', 'accepted', 'expired'] as StatusKey[]).map((k) => (
          <div key={k} className="sl-stage-cell" onClick={() => setFilter(k)}>
            <span className="sl-stage-name" style={{ color: filter === k ? 'var(--sl-ink)' : 'var(--sl-muted)' }}>
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </span>
            <div className="sl-stage-row">
              <span className="sl-stage-count">{counts[k]}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--sl-canvas)', border: '1px solid var(--sl-line)', borderRadius: 4, overflow: 'hidden', marginBottom: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1.5fr 100px 1.2fr 100px 70px 80px 110px', padding: '10px 14px', background: 'var(--sl-bg)', borderBottom: '1px solid var(--sl-line)', fontFamily: 'var(--sl-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--sl-muted)', fontWeight: 600 }}>
          <div>Quote ID</div>
          <div>Client</div>
          <div>Amount</div>
          <div>Scope</div>
          <div>Status</div>
          <div>Age</div>
          <div>Expires</div>
          <div />
        </div>
        {loading && <div className="sl-empty">Loading quotes…</div>}
        {!loading && filtered.length === 0 && <div className="sl-empty">No quotes match this filter.</div>}
        {filtered.map((q) => {
          const exp = expiresLabel(q.expires_at)
          const status = (q.status || 'sent').toLowerCase()
          const statusColors: Record<string, string> = {
            sent: 'var(--sl-ink)', viewed: 'var(--sl-vip)', responded: 'var(--sl-good)', accepted: 'var(--sl-good)', expired: 'var(--sl-muted)',
          }
          return (
            <div key={q.id} style={{ display: 'grid', gridTemplateColumns: '90px 1.5fr 100px 1.2fr 100px 70px 80px 110px', padding: '12px 14px', borderBottom: '1px solid var(--sl-line-soft)', alignItems: 'center', fontSize: 12.5 }}>
              <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 11, color: 'var(--sl-graphite)' }}>{q.quote_number || q.id.slice(0, 8)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="sl-stage-dot" style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sl-ink)', color: 'var(--sl-canvas)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sl-display)', fontSize: 11, fontWeight: 600 }}>
                  {initials(q.clients?.name ?? null)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="sl-deal-name">{q.clients?.name || '—'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--sl-muted)' }}>{q.clients?.address || ''}</div>
                </div>
              </div>
              <div className="sl-deal-value">{fmtMoney(q.total_cents)}</div>
              <div style={{ fontSize: 12, color: 'var(--sl-graphite)' }}>—</div>
              <div>
                <span style={{ fontFamily: 'var(--sl-mono)', fontSize: 9.5, padding: '3px 7px', borderRadius: 2, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, color: statusColors[status] || 'var(--sl-muted)', background: 'rgba(0,0,0,0.04)' }}>
                  {status}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 11, color: 'var(--sl-muted)' }}>{ageLabel(q.sent_at || q.created_at)}</div>
              <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 11, color: exp.warn ? 'var(--sl-warn)' : 'var(--sl-muted)', fontWeight: exp.warn ? 600 : 400 }}>{exp.label}</div>
              <div><button type="button" style={{ fontFamily: 'inherit', fontSize: 11, padding: '5px 10px', border: '1px solid var(--sl-line)', borderRadius: 3, background: 'var(--sl-canvas)', cursor: 'pointer' }}>View</button></div>
            </div>
          )
        })}
      </div>
    </>
  )
}
