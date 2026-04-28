'use client'

import { useEffect, useMemo, useState } from 'react'

type Conversation = {
  id: string
  client_id: string | null
  phone_number: string | null
  status: string | null
  last_message_at: string | null
  message_count: number | null
  created_at: string
  clients: { name: string | null } | null
}

function fmtRel(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 5) return 'live'
  if (min < 60) return `${min}m`
  const h = Math.round(ms / 3_600_000)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}
function initials(name: string | null): string {
  if (!name) return '—'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function SalesConversationsTab() {
  const [convos, setConvos] = useState<Conversation[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'idle' | 'won' | 'lost'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/sms?limit=100')
      .then((r) => r.json())
      .then((d) => setConvos((d?.conversations || []) as Conversation[]))
      .catch(() => setConvos([]))
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const active = convos.filter((c) => c.last_message_at && Date.now() - new Date(c.last_message_at).getTime() < 5 * 60_000).length
    const idle = convos.filter((c) => {
      if (!c.last_message_at) return false
      const ms = Date.now() - new Date(c.last_message_at).getTime()
      return ms >= 60 * 60_000 && ms < 24 * 3_600_000
    }).length
    const won = convos.filter((c) => c.status === 'won' || c.status === 'booked').length
    const lost = convos.filter((c) => c.status === 'lost' || c.status === 'dead').length
    return { all: convos.length, active, idle, won, lost }
  }, [convos])

  const filtered = useMemo(() => {
    if (filter === 'all') return convos
    if (filter === 'active') return convos.filter((c) => c.last_message_at && Date.now() - new Date(c.last_message_at).getTime() < 5 * 60_000)
    if (filter === 'idle') {
      return convos.filter((c) => {
        if (!c.last_message_at) return false
        const ms = Date.now() - new Date(c.last_message_at).getTime()
        return ms >= 60 * 60_000 && ms < 24 * 3_600_000
      })
    }
    if (filter === 'won') return convos.filter((c) => c.status === 'won' || c.status === 'booked')
    if (filter === 'lost') return convos.filter((c) => c.status === 'lost' || c.status === 'dead')
    return convos
  }, [convos, filter])

  return (
    <>
      <div className="sl-bar-label">Selena · Live Conversations</div>
      <div className="sl-outlook">
        <div className="sl-stat">
          <div className="sl-stat-label">Live Now <span className="sl-stat-tag">active</span></div>
          <div className="sl-stat-value">{counts.active}</div>
          <div className="sl-stat-sub good">{counts.active > 0 ? 'Actively chatting' : 'Quiet'}</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Idle</div>
          <div className="sl-stat-value">{counts.idle}</div>
          <div className={`sl-stat-sub ${counts.idle > 0 ? 'warn' : ''}`}>1h–1d since last reply</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Total · 30d</div>
          <div className="sl-stat-value">{counts.all}</div>
          <div className="sl-stat-sub">Conversations</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Won</div>
          <div className="sl-stat-value">{counts.won}</div>
          <div className="sl-stat-sub good">Booked from chat</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Lost</div>
          <div className="sl-stat-value">{counts.lost}</div>
          <div className="sl-stat-sub warn">No response / dead</div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-label">Auto-Handled</div>
          <div className="sl-stat-value">—</div>
          <div className="sl-stat-sub">Wires next pass</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {(['all', 'active', 'idle', 'won', 'lost'] as const).map((k) => (
          <span
            key={k}
            onClick={() => setFilter(k)}
            style={{
              fontFamily: 'var(--sl-mono)',
              fontSize: 10.5,
              padding: '5px 10px',
              border: '1px solid var(--sl-line)',
              borderRadius: 3,
              color: filter === k ? 'var(--sl-canvas)' : 'var(--sl-muted)',
              background: filter === k ? 'var(--sl-ink)' : 'var(--sl-canvas)',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {k} <span style={{ opacity: 0.6 }}>{counts[k]}</span>
          </span>
        ))}
      </div>

      <div style={{ background: 'var(--sl-canvas)', border: '1px solid var(--sl-line)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 90px 90px 110px 110px', padding: '10px 14px', background: 'var(--sl-bg)', borderBottom: '1px solid var(--sl-line)', fontFamily: 'var(--sl-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--sl-muted)', fontWeight: 600 }}>
          <div>Client</div>
          <div>Phone</div>
          <div>Messages</div>
          <div>Last</div>
          <div>Status</div>
          <div />
        </div>
        {loading && <div className="sl-empty">Loading conversations…</div>}
        {!loading && filtered.length === 0 && <div className="sl-empty">No conversations match this filter.</div>}
        {filtered.map((c) => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 90px 90px 110px 110px', padding: '12px 14px', borderBottom: '1px solid var(--sl-line-soft)', alignItems: 'center', fontSize: 12.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sl-good)', color: 'var(--sl-canvas)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sl-display)', fontSize: 11, fontWeight: 600, border: '1.5px dashed var(--sl-good)' }}>
                {initials(c.clients?.name ?? null)}
              </span>
              <div className="sl-deal-name">{c.clients?.name || 'Anonymous'}</div>
            </div>
            <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 11, color: 'var(--sl-graphite)' }}>{c.phone_number || '—'}</div>
            <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 12, color: 'var(--sl-ink)' }}>{c.message_count ?? 0}</div>
            <div style={{ fontFamily: 'var(--sl-mono)', fontSize: 11, color: 'var(--sl-muted)' }}>{fmtRel(c.last_message_at)}</div>
            <div>
              <span style={{ fontFamily: 'var(--sl-mono)', fontSize: 9.5, padding: '3px 7px', borderRadius: 2, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.04)', color: 'var(--sl-muted)' }}>
                {c.status || 'open'}
              </span>
            </div>
            <div><button type="button" style={{ fontFamily: 'inherit', fontSize: 11, padding: '5px 10px', border: '1px solid var(--sl-line)', borderRadius: 3, background: 'var(--sl-canvas)', cursor: 'pointer' }}>Open</button></div>
          </div>
        ))}
      </div>
    </>
  )
}
