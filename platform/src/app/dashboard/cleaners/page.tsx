'use client'

import { useCallback, useEffect, useState } from 'react'
import '../team/team.css'

type CleanerApplication = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  experience: string | null
  availability: string | null
  referral_source: string | null
  references: { name: string; phone: string }[] | null
  notes: string | null
  photo_url: string | null
  service_zones: string[] | null
  has_car: boolean | null
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected'
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

export default function CleanersPage() {
  const [apps, setApps] = useState<CleanerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/team/cleaner-applications')
      if (res.ok) {
        const data = await res.json()
        setApps(data.applications || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const accept = async (app: CleanerApplication) => {
    if (actingId) return
    if (!confirm(`Accept ${app.name}'s application? They'll be added to the team and emailed their portal PIN.`)) return
    setActingId(app.id)
    try {
      await fetch(`/api/team/cleaner-applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
      await load()
    } finally {
      setActingId(null)
    }
  }

  const reject = async (app: CleanerApplication) => {
    if (actingId) return
    const reason = prompt(`Reject ${app.name}'s application. Reason (optional):`) ?? undefined
    if (reason === undefined) return
    setActingId(app.id)
    try {
      await fetch(`/api/team/cleaner-applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      })
      await load()
    } finally {
      setActingId(null)
    }
  }

  const markReviewed = async (app: CleanerApplication) => {
    if (actingId) return
    setActingId(app.id)
    try {
      await fetch(`/api/team/cleaner-applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_reviewed' }),
      })
      await load()
    } finally {
      setActingId(null)
    }
  }

  const pending = apps.filter((a) => a.status === 'pending' || a.status === 'reviewed')
  const reviewed = apps.filter((a) => a.status === 'accepted' || a.status === 'rejected')

  const card = (app: CleanerApplication) => (
    <div key={app.id} style={{ border: '1px solid var(--line, #e5e7eb)', borderRadius: 12, padding: 16, background: '#fff', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--ink, #1E2A4A)', fontSize: 15 }}>{app.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted, #6b7280)' }}>
            applied {timeAgo(app.created_at)}
            {app.status !== 'pending' && ` · ${app.status}`}
          </div>
        </div>
        {app.photo_url && (
          <a href={app.photo_url} target="_blank" rel="noopener noreferrer"
            style={{ alignSelf: 'flex-start', background: '#1E2A4A', color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, textDecoration: 'none' }}>
            View Photo
          </a>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 12, fontSize: 13, color: '#374151' }}>
        <div><strong>Phone:</strong> {app.phone ? <a href={`tel:${app.phone}`} style={{ color: '#2563eb' }}>{app.phone}</a> : '—'}</div>
        <div><strong>Email:</strong> {app.email ? <a href={`mailto:${app.email}`} style={{ color: '#2563eb' }}>{app.email}</a> : '—'}</div>
        <div><strong>Address:</strong> {app.address || '—'}</div>
        <div><strong>Experience:</strong> {app.experience || '—'}</div>
        <div><strong>Availability:</strong> {app.availability || '—'}</div>
        <div><strong>Has car:</strong> {app.has_car ? 'Yes' : 'No'}</div>
      </div>

      {app.service_zones && app.service_zones.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {app.service_zones.map((z) => (
            <span key={z} style={{ fontSize: 11, background: '#A8F0DC33', color: '#1E2A4A', padding: '3px 8px', borderRadius: 999 }}>{z}</span>
          ))}
        </div>
      )}

      {app.notes && <p style={{ marginTop: 10, fontSize: 13, color: '#4b5563', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}><strong>Notes:</strong> {app.notes}</p>}
      {app.referral_source && <p style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>Found us via: {app.referral_source}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {(app.status === 'pending' || app.status === 'reviewed') && (
          <button onClick={() => accept(app)} disabled={actingId === app.id}
            style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: actingId === app.id ? 0.5 : 1 }}>
            Accept
          </button>
        )}
        {(app.status === 'pending' || app.status === 'reviewed') && (
          <button onClick={() => reject(app)} disabled={actingId === app.id}
            style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Reject
          </button>
        )}
        {app.status === 'pending' && (
          <button onClick={() => markReviewed(app)} disabled={actingId === app.id}
            style={{ background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Mark Reviewed
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div className="tm-section-head">
        <h2 className="tm-section-title">Job Applications<em>.</em></h2>
        <span className="tm-section-meta">{pending.length} pending · {reviewed.length} reviewed</span>
      </div>

      {loading && <div className="tm-empty">Loading…</div>}
      {!loading && apps.length === 0 && (
        <div className="tm-empty">No job applications yet.</div>
      )}

      {!loading && pending.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {pending.map(card)}
        </div>
      )}

      {!loading && reviewed.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', margin: '8px 0' }}>Reviewed</div>
          {reviewed.map(card)}
        </div>
      )}
    </div>
  )
}
