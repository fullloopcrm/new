'use client'

import { useEffect, useState } from 'react'

type Eligible = {
  id: string
  name: string
  phone: string | null
  preferred_language: 'en' | 'es' | null
  reasons_excluded: string[]
  eligible: boolean
  jobs_that_day: number
}

type PreviewResp = {
  test_mode: boolean
  job_zone: string | null
  eligible: Eligible[]
  excluded: Eligible[]
  cap: number
  error?: string
}

type Broadcast = {
  id: string
  job_date: string
  start_time: string
  job_zone: string | null
  status: string
  test_mode: boolean
  sent_at: string
  recipients: { id: string; phone: string | null; status: string }[]
}

const input: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d4cfc4', borderRadius: 8, fontSize: 14, width: '100%' }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e7e2d8', borderRadius: 12, padding: 16 }

export default function FindCleanerPage() {
  const [form, setForm] = useState({ job_date: '', start_time: '09:00', duration_hours: 3, qty_needed: 1, job_address: '', hourly_rate_override: '', service_type: '', notes: '' })
  const [preview, setPreview] = useState<PreviewResp | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [sendMsg, setSendMsg] = useState<string | null>(null)
  const [recent, setRecent] = useState<Broadcast[]>([])

  const loadRecent = async () => {
    const r = await fetch('/api/admin/find-cleaner/recent')
    const d = await r.json().catch(() => ({}))
    setRecent(d.broadcasts || [])
  }
  useEffect(() => { loadRecent() }, [])

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const runPreview = async () => {
    setLoading(true); setSendMsg(null); setPreview(null); setSelected(new Set())
    const r = await fetch('/api/admin/find-cleaner/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, duration_hours: Number(form.duration_hours), qty_needed: Number(form.qty_needed) }),
    })
    const d: PreviewResp = await r.json().catch(() => ({ eligible: [], excluded: [], cap: 50, test_mode: true, job_zone: null }))
    setPreview(d)
    setSelected(new Set((d.eligible || []).map((c) => c.id)))
    setLoading(false)
  }

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const send = async () => {
    if (selected.size === 0) return
    setLoading(true); setSendMsg(null)
    const r = await fetch('/api/admin/find-cleaner/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form, duration_hours: Number(form.duration_hours), qty_needed: Number(form.qty_needed),
        hourly_rate_override: form.hourly_rate_override ? Number(form.hourly_rate_override) : null,
        cleaner_ids: [...selected], confirmed: true,
      }),
    })
    const d = await r.json().catch(() => ({}))
    setSendMsg(d.error ? `Error: ${d.error}` : `Sent ${d.sent} · failed ${d.failed}${d.test_mode ? ' · TEST MODE' : ''}`)
    setLoading(false); loadRecent()
  }

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto', display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, margin: 0 }}>Find a Cleaner</h1>
        <p style={{ color: '#7a7468', margin: '4px 0 0' }}>Broadcast a job to eligible team members by zone + availability.</p>
      </div>

      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        <label>Date<input type="date" style={input} value={form.job_date} onChange={(e) => set('job_date', e.target.value)} /></label>
        <label>Start<input type="time" style={input} value={form.start_time} onChange={(e) => set('start_time', e.target.value)} /></label>
        <label>Duration (hrs)<input type="number" step="0.5" style={input} value={form.duration_hours} onChange={(e) => set('duration_hours', e.target.value)} /></label>
        <label>Qty needed<input type="number" style={input} value={form.qty_needed} onChange={(e) => set('qty_needed', e.target.value)} /></label>
        <label style={{ gridColumn: '1 / -1' }}>Address<input style={input} value={form.job_address} onChange={(e) => set('job_address', e.target.value)} placeholder="for zone match" /></label>
        <label>Rate override ($/hr)<input type="number" style={input} value={form.hourly_rate_override} onChange={(e) => set('hourly_rate_override', e.target.value)} /></label>
        <label>Service type<input style={input} value={form.service_type} onChange={(e) => set('service_type', e.target.value)} /></label>
        <button onClick={runPreview} disabled={loading || !form.job_date} style={{ gridColumn: '1 / -1', padding: 12, borderRadius: 8, border: 'none', background: '#1a1a1a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Checking…' : 'Preview eligible cleaners'}
        </button>
      </div>

      {preview?.error && <div style={{ ...card, color: '#b00' }}>{preview.error}</div>}

      {preview && !preview.error && (
        <div style={{ ...card, display: 'grid', gap: 12 }}>
          {preview.test_mode && <div style={{ background: '#fff4d6', padding: 8, borderRadius: 8, fontSize: 13 }}>⚠️ TEST MODE — only the test cleaner will be messaged. Zone: {preview.job_zone || 'n/a'}</div>}
          <div><strong>Eligible ({preview.eligible.length})</strong> · cap {preview.cap}</div>
          {preview.eligible.map((c) => (
            <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              {c.name} · {c.phone || 'no phone'} · {c.jobs_that_day} jobs that day
            </label>
          ))}
          {preview.excluded.length > 0 && (
            <details>
              <summary>Excluded ({preview.excluded.length})</summary>
              {preview.excluded.map((c) => (
                <div key={c.id} style={{ fontSize: 13, color: '#7a7468', padding: '2px 0' }}>{c.name} — {c.reasons_excluded.join('; ')}</div>
              ))}
            </details>
          )}
          <button onClick={send} disabled={loading || selected.size === 0} style={{ padding: 12, borderRadius: 8, border: 'none', background: '#1a7a3a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Send broadcast to {selected.size} selected
          </button>
          {sendMsg && <div style={{ fontWeight: 600 }}>{sendMsg}</div>}
        </div>
      )}

      <div style={{ ...card }}>
        <strong>Recent broadcasts</strong>
        {recent.length === 0 && <p style={{ color: '#7a7468' }}>None yet.</p>}
        {recent.map((b) => (
          <div key={b.id} style={{ fontSize: 13, padding: '6px 0', borderTop: '1px solid #f0ece3' }}>
            {b.job_date} {b.start_time} · {b.job_zone || 'no zone'} · {b.recipients.length} sent · {b.status}{b.test_mode ? ' · TEST' : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
