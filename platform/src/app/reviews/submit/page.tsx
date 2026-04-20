'use client'
import { useState, useEffect } from 'react'

interface TenantLite {
  name: string
  primary_color?: string | null
  domain?: string | null
}

export default function ReviewSubmitPage() {
  const [tenant, setTenant] = useState<TenantLite | null>(null)
  const [form, setForm] = useState({ name: '', email: '', rating: 5, text: '', neighborhood: '', service_type: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/tenant/public').then(r => r.ok ? r.json() : null).then(t => { if (t) setTenant(t) }).catch(() => {})
  }, [])

  if (!tenant) return <div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>

  const primary = tenant.primary_color || '#1E2A4A'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    const res = await fetch('/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) setDone(true)
    else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Something went wrong.')
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: primary }}>Thank you!</h1>
          <p className="text-gray-600">Your review was submitted. We appreciate you.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-16" style={{ background: primary }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl text-white font-bold mb-4">How was your experience with {tenant.name}?</h1>
          <p className="text-white/80">Your feedback helps others find us.</p>
        </div>
      </div>
      <form onSubmit={submit} className="max-w-xl mx-auto px-4 py-12 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Your name</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rating</label>
          <select value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} className="w-full px-4 py-3 border rounded-lg">
            <option value={5}>5 — Excellent</option>
            <option value={4}>4 — Great</option>
            <option value={3}>3 — Good</option>
            <option value={2}>2 — Fair</option>
            <option value={1}>1 — Poor</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Your review</label>
          <textarea required rows={6} value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Neighborhood (optional)" value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
          <input placeholder="Service type (optional)" value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} className="w-full px-4 py-3 border rounded-lg" />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full py-4 text-white rounded-lg font-semibold disabled:opacity-50" style={{ backgroundColor: primary }}>
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}
