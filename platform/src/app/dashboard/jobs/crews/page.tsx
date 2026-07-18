'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../../sales/sales.css'

// Crews — named, reusable teams of members. Assignable to a job session so a
// whole crew schedules at once (single / multiple / crew all supported downstream).
type Member = { id: string; name: string | null }
type Crew = { id: string; name: string; color: string | null; active: boolean; members: Member[] }

export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPicked, setEditPicked] = useState<Set<string>>(new Set())
  const [editSaving, setEditSaving] = useState(false)
  const [editErr, setEditErr] = useState('')

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/crews').then((r) => r.json()).catch(() => ({ crews: [] })),
      fetch('/api/cleaners').then((r) => r.json()).catch(() => []),
    ]).then(([c, m]) => {
      setCrews(c?.crews || [])
      const list = Array.isArray(m) ? m : m?.cleaners || m?.members || []
      setMembers(list.map((x: { id: string; name: string | null }) => ({ id: x.id, name: x.name })))
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function createCrew() {
    setErr('')
    if (!name.trim()) { setErr('Name the crew.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/crews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), member_ids: [...picked] }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setErr((d && d.error) || 'Could not create crew.'); return }
      setName(''); setPicked(new Set()); load()
    } finally { setSaving(false) }
  }

  async function removeCrew(id: string) {
    await fetch(`/api/crews?id=${id}`, { method: 'DELETE' })
    load()
  }

  function startEdit(c: Crew) {
    setEditingId(c.id)
    setEditName(c.name)
    setEditPicked(new Set(c.members.map((m) => m.id)))
    setEditErr('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditErr('')
  }

  function toggleEditMember(id: string) {
    setEditPicked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function saveEdit(id: string) {
    setEditErr('')
    if (!editName.trim()) { setEditErr('Name the crew.'); return }
    setEditSaving(true)
    try {
      const res = await fetch('/api/crews', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName.trim(), member_ids: [...editPicked] }),
      })
      if (!res.ok) { const d = await res.json().catch(() => null); setEditErr((d && d.error) || 'Could not save crew.'); return }
      setEditingId(null)
      load()
    } finally { setEditSaving(false) }
  }

  const inp: React.CSSProperties = { padding: '9px 11px', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 8, fontSize: 14, width: '100%', background: '#fff', color: 'var(--sl-ink)' }

  return (
    <div className="sl-scope">
      <Link href="/dashboard/jobs" className="text-xs text-slate-500 hover:underline">← Production</Link>

      <div className="sl-section-head" style={{ marginTop: 6 }}>
        <h2 className="sl-section-title">Crews<em>.</em></h2>
        <span className="sl-section-meta">{crews.length} crew{crews.length === 1 ? '' : 's'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--sl-muted)', margin: '0 0 16px' }}>
        Labor pooling — build saved crews from your team, then assign a whole crew to a job, or pull members one-off when scheduling.
      </p>

      {/* CREATE */}
      <div style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Crew name</label>
        <input style={{ ...inp, marginBottom: 12 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Remodel Team A" />
        <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Members</label>
        {members.length === 0 && <div className="sl-empty" style={{ padding: 12 }}>No team members yet.</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {members.map((m) => (
            <button key={m.id} type="button" onClick={() => toggle(m.id)}
              style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                border: '1px solid ' + (picked.has(m.id) ? 'var(--sl-ink)' : 'var(--sl-line,#ddd)'),
                background: picked.has(m.id) ? 'var(--sl-ink)' : '#fff', color: picked.has(m.id) ? '#fff' : 'var(--sl-ink)' }}>
              {m.name || '—'}
            </button>
          ))}
        </div>
        {err && <div style={{ color: 'var(--sl-danger)', fontSize: 13, marginBottom: 10 }}>{err}</div>}
        <button type="button" className="sl-newlead-btn" disabled={saving} onClick={createCrew}>{saving ? 'Creating…' : `+ Create crew${picked.size ? ` (${picked.size})` : ''}`}</button>
      </div>

      {/* LIST */}
      {loading && <div className="sl-empty">Loading…</div>}
      {!loading && crews.length === 0 && <div className="sl-empty">No crews yet — build your first above.</div>}
      {crews.map((c) => (
        editingId === c.id ? (
          <div key={c.id} style={{ background: 'var(--sl-canvas,#fff)', border: '1px solid var(--sl-line,#e6e6e0)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Crew name</label>
            <input style={{ ...inp, marginBottom: 12 }} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Remodel Team A" />
            <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sl-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Members</label>
            {members.length === 0 && <div className="sl-empty" style={{ padding: 12 }}>No team members yet.</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {members.map((m) => (
                <button key={m.id} type="button" onClick={() => toggleEditMember(m.id)}
                  style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                    border: '1px solid ' + (editPicked.has(m.id) ? 'var(--sl-ink)' : 'var(--sl-line,#ddd)'),
                    background: editPicked.has(m.id) ? 'var(--sl-ink)' : '#fff', color: editPicked.has(m.id) ? '#fff' : 'var(--sl-ink)' }}>
                  {m.name || '—'}
                </button>
              ))}
            </div>
            {editErr && <div style={{ color: 'var(--sl-danger)', fontSize: 13, marginBottom: 10 }}>{editErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="sl-newlead-btn" disabled={editSaving} onClick={() => saveEdit(c.id)}>{editSaving ? 'Saving…' : 'Save'}</button>
              <button type="button" onClick={cancelEdit} style={{ fontSize: 13, background: 'none', border: '1px solid var(--sl-line,#ddd)', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', color: 'var(--sl-ink)' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--sl-line,#eee)' }}>
            <span style={{ fontFamily: 'var(--sl-display)', fontSize: 16, fontWeight: 600, color: 'var(--sl-ink)', minWidth: 160 }}>{c.name}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--sl-muted)' }}>{c.members.length ? c.members.map((m) => m.name).join(' · ') : 'No members'}</span>
            <span style={{ fontFamily: 'var(--sl-mono)', fontSize: 11, color: 'var(--sl-muted)' }}>{c.members.length} member{c.members.length === 1 ? '' : 's'}</span>
            <button type="button" onClick={() => startEdit(c)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-ink)', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
            <button type="button" onClick={() => removeCrew(c.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--sl-danger)', cursor: 'pointer' }}>Delete</button>
          </div>
        )
      ))}
    </div>
  )
}
