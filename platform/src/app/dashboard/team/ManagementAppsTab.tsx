'use client'

import { useCallback, useEffect, useState } from 'react'

type ManagementApplication = {
  id: string
  name: string
  email: string | null
  phone: string
  location: string | null
  current_role: string | null
  years_experience: string | null
  bilingual: string | null
  management_experience: string | null
  why_this_role: string | null
  availability_start: string | null
  referral_source: string | null
  references: { name: string; phone: string }[] | null
  notes: string | null
  position: string | null
  resume_url: string | null
  photo_url: string | null
  video_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
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

// Recorded-answer notes look like "Q: ...\nA: [Video answer] https://...\n\n"
// repeated per question — render each answer's URL as a clickable play link
// instead of a wall of raw text.
function renderRecordedNotes(notes: string) {
  const entries = notes.split(/\n\n+/).filter(Boolean)
  return entries.map((entry, i) => {
    const qMatch = entry.match(/^Q: (.+)$/m)
    const aMatch = entry.match(/^A: \[(.+?) answer\] (\S+)$/m)
    if (!qMatch || !aMatch) {
      return <p key={i} style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{entry}</p>
    }
    return (
      <div key={i} style={{ marginTop: 10 }}>
        <p style={{ fontWeight: 600, color: '#1E2A4A' }}>{qMatch[1]}</p>
        <a href={aMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: 13 }}>
          ▶ Play {aMatch[1].toLowerCase()} answer
        </a>
      </div>
    )
  })
}

function positionLabel(position: string | null): string {
  if (!position) return 'Management'
  return position.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ')
}

export default function ManagementAppsTab() {
  const [apps, setApps] = useState<ManagementApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/management-applications')
      if (res.ok) {
        const data = await res.json()
        setApps(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (app: ManagementApplication, status: 'approved' | 'rejected') => {
    if (actingId) return
    if (!confirm(`Mark ${app.name}'s application as ${status}?`)) return
    setActingId(app.id)
    try {
      await fetch('/api/management-applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, status }),
      })
      await load()
    } finally {
      setActingId(null)
    }
  }

  const pending = apps.filter((a) => a.status === 'pending')
  const reviewed = apps.filter((a) => a.status !== 'pending')

  const card = (app: ManagementApplication) => {
    const expanded = expandedId === app.id
    return (
      <div key={app.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {app.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={app.photo_url} alt={app.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f3f4f6', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, color: '#1E2A4A', fontSize: 15 }}>{app.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {positionLabel(app.position)} · {app.location || '—'} · applied {timeAgo(app.created_at)}
                {app.status !== 'pending' && ` · ${app.status}`}
              </div>
            </div>
          </div>
          {app.video_url && (
            <a href={app.video_url} target="_blank" rel="noopener noreferrer"
              style={{ alignSelf: 'flex-start', background: '#1E2A4A', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, textDecoration: 'none' }}>
              ▶ Play First Answer
            </a>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 12, fontSize: 13, color: '#374151' }}>
          <div>
            <strong>Phone:</strong>{' '}
            <a href={`/admin/comhub?dial=${encodeURIComponent(app.phone)}`} style={{ color: '#2563eb' }}>{app.phone}</a>
            {' · '}
            <a href={`/admin/comhub?text=${encodeURIComponent(app.phone)}`} style={{ color: '#2563eb' }}>Text</a>
            {' · '}
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(app.phone).catch(() => {})}
              style={{ color: '#2563eb', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
            >
              Copy
            </button>
          </div>
          <div><strong>Email:</strong> {app.email ? <a href={`mailto:${app.email}`} style={{ color: '#2563eb' }}>{app.email}</a> : '—'}</div>
          <div><strong>Years experience:</strong> {app.years_experience || '—'}</div>
          <div><strong>Bilingual:</strong> {app.bilingual || '—'}</div>
          <div><strong>Available:</strong> {app.availability_start || '—'}</div>
        </div>

        <button
          type="button"
          onClick={() => setExpandedId(expanded ? null : app.id)}
          style={{ marginTop: 10, background: 'none', border: 'none', color: '#1E2A4A', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          {expanded ? '▾ Hide answers' : '▸ Show full answers'}
        </button>

        {expanded && (
          <div style={{ marginTop: 10, fontSize: 13, color: '#4b5563', lineHeight: 1.6 }}>
            {app.current_role && <p><strong>Current role:</strong> {app.current_role}</p>}
            {app.management_experience && <p style={{ marginTop: 6 }}><strong>Biggest team/operation run:</strong> {app.management_experience}</p>}
            {app.why_this_role && <p style={{ marginTop: 6 }}><strong>Why this role:</strong> {app.why_this_role}</p>}
            {app.references && app.references.length > 0 && (
              <p style={{ marginTop: 6 }}>
                <strong>References:</strong> {app.references.map((r) => `${r.name} (${r.phone})`).join(', ')}
              </p>
            )}
            {app.notes && (
              <div style={{ marginTop: 8, background: '#f9fafb', padding: 12, borderRadius: 8 }}>{renderRecordedNotes(app.notes)}</div>
            )}
            {app.resume_url && (
              <p style={{ marginTop: 6 }}><a href={app.resume_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>View resume</a></p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {app.status === 'pending' && (
            <button onClick={() => setStatus(app, 'approved')} disabled={actingId === app.id}
              style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: actingId === app.id ? 0.5 : 1 }}>
              Approve
            </button>
          )}
          {app.status === 'pending' && (
            <button onClick={() => setStatus(app, 'rejected')} disabled={actingId === app.id}
              style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Reject
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="tm-section-head">
        <h2 className="tm-section-title">Ops Admin<em>.</em></h2>
        <span className="tm-section-meta">{pending.length} pending · {reviewed.length} reviewed</span>
      </div>

      {loading && <div className="tm-empty">Loading…</div>}
      {!loading && apps.length === 0 && (
        <div className="tm-empty">No management/administrator applications yet.</div>
      )}

      {!loading && pending.length > 0 && (
        <div style={{ marginTop: 12 }}>{pending.map(card)}</div>
      )}

      {!loading && reviewed.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: '8px 0' }}>Reviewed</div>
          {reviewed.map(card)}
        </div>
      )}
    </>
  )
}
