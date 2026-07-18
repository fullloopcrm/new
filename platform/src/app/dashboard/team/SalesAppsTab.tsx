'use client'

import { useCallback, useEffect, useState } from 'react'

type SalesApplication = {
  id: string
  name: string
  email: string | null
  phone: string
  location: string | null
  lane: string | null
  sales_background: string | null
  target_segments: string[] | null
  warm_intros: string | null
  bilingual: string | null
  why: string | null
  referral_source: string | null
  linkedin_url: string | null
  video_url: string | null
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
}

const LANE_LABELS: Record<string, string> = {
  direct: 'Direct clients',
  referrer: 'Referrer network',
  both: 'Both',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function SalesAppsTab({ onPendingCount }: { onPendingCount?: (n: number) => void }) {
  const [apps, setApps] = useState<SalesApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sales-applications')
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.applications || [])
        setApps(list)
        onPendingCount?.(list.filter((a: SalesApplication) => a.status === 'pending').length)
      }
    } finally {
      setLoading(false)
    }
  }, [onPendingCount])

  useEffect(() => { load() }, [load])

  const setStatus = async (app: SalesApplication, status: 'approved' | 'rejected') => {
    if (actingId) return
    if (!confirm(`Mark ${app.name}'s application as ${status}?`)) return
    setActingId(app.id)
    try {
      await fetch('/api/sales-applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, status }),
      })
      await load()
    } finally {
      setActingId(null)
    }
  }

  const remove = async (app: SalesApplication) => {
    if (actingId) return
    if (!confirm(`Delete ${app.name}'s application permanently?`)) return
    setActingId(app.id)
    try {
      await fetch(`/api/sales-applications?id=${app.id}`, { method: 'DELETE' })
      await load()
    } finally {
      setActingId(null)
    }
  }

  const pending = apps.filter((a) => a.status === 'pending')
  const reviewed = apps.filter((a) => a.status !== 'pending')

  const card = (app: SalesApplication) => (
    <div key={app.id} style={{ border: '1px solid var(--tm-line)', borderRadius: 4, padding: 16, background: 'var(--tm-canvas)', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--tm-ink)', fontSize: 15 }}>{app.name}</div>
          <div style={{ fontSize: 12, color: 'var(--tm-muted)' }}>
            {app.location || '—'} · applied {timeAgo(app.created_at)}
            {app.status !== 'pending' && ` · ${app.status}`}
          </div>
        </div>
        {app.video_url && (
          <a href={app.video_url} target="_blank" rel="noopener noreferrer"
            style={{ alignSelf: 'flex-start', background: 'var(--tm-ink)', color: 'var(--tm-canvas)', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 4, textDecoration: 'none' }}>
            ▶ Watch Selfie Video
          </a>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--tm-graphite)' }}>
        <div><strong>Phone:</strong> <a href={`tel:${app.phone}`} style={{ color: 'var(--tm-ink)' }}>{app.phone}</a></div>
        <div><strong>Email:</strong> {app.email ? <a href={`mailto:${app.email}`} style={{ color: 'var(--tm-ink)' }}>{app.email}</a> : '—'}</div>
        <div><strong>Lane:</strong> {app.lane ? (LANE_LABELS[app.lane] || app.lane) : '—'}</div>
        <div><strong>Warm intros/30d:</strong> {app.warm_intros || '—'}</div>
        <div><strong>Bilingual:</strong> {app.bilingual || '—'}</div>
        {app.linkedin_url && <div><strong>LinkedIn:</strong> <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tm-ink)' }}>link</a></div>}
      </div>

      {app.target_segments && app.target_segments.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {app.target_segments.map((s) => (
            <span key={s} style={{ fontSize: 11, background: 'var(--tm-line-soft)', color: 'var(--tm-ink)', padding: '3px 8px', borderRadius: 4 }}>{s}</span>
          ))}
        </div>
      )}

      {app.sales_background && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--tm-graphite)', lineHeight: 1.5 }}><strong>Background:</strong> {app.sales_background}</p>}
      {app.why && <p style={{ marginTop: 6, fontSize: 13, color: 'var(--tm-graphite)', lineHeight: 1.5 }}><strong>Notes:</strong> {app.why}</p>}
      {app.referral_source && <p style={{ marginTop: 6, fontSize: 12, color: 'var(--tm-muted)' }}>Found us via: {app.referral_source}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {app.status === 'pending' && (
          <button onClick={() => setStatus(app, 'approved')} disabled={actingId === app.id}
            style={{ background: 'var(--tm-good)', color: 'var(--tm-canvas)', border: 'none', borderRadius: 4, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: actingId === app.id ? 0.5 : 1 }}>
            Approve
          </button>
        )}
        {app.status === 'pending' && (
          <button onClick={() => setStatus(app, 'rejected')} disabled={actingId === app.id}
            style={{ background: 'var(--tm-canvas)', color: 'var(--tm-danger)', border: '1px solid var(--tm-danger)', borderRadius: 4, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Reject
          </button>
        )}
        <button onClick={() => remove(app)} disabled={actingId === app.id}
          style={{ background: 'transparent', color: 'var(--tm-muted)', border: 'none', borderRadius: 4, padding: '8px 10px', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>
          Delete
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="tm-section-head">
        <h2 className="tm-section-title">Sales Apps<em>.</em></h2>
        <span className="tm-section-meta">{pending.length} pending · {reviewed.length} reviewed</span>
      </div>

      {loading && <div className="tm-empty">Loading…</div>}
      {!loading && apps.length === 0 && (
        <div className="tm-empty">
          No sales applications yet. Apply link: <a href="/apply/commission-sales-partner" style={{ color: 'var(--tm-ink)' }}>thenycmaid.com/apply/commission-sales-partner</a>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {pending.map(card)}
        </div>
      )}

      {!loading && reviewed.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tm-muted)', margin: '8px 0' }}>Reviewed</div>
          {reviewed.map(card)}
        </div>
      )}
    </>
  )
}
