'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SubTenant = {
  id: string
  name: string
  slug: string
  industry: string | null
  status: string
  created_at: string
}

export default function LocationsPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<SubTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/dashboard/sub-tenants')
      .then((r) => r.json())
      .then((data) => { setLocations(data.subTenants || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function addLocation(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    const res = await fetch('/api/dashboard/sub-tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { setError(data.error || 'Could not create location'); return }
    setName('')
    load()
  }

  async function view(id: string) {
    setViewing(id)
    const res = await fetch(`/api/dashboard/sub-tenants/${id}/impersonate`, { method: 'POST' })
    setViewing(null)
    if (res.ok) router.push('/dashboard')
  }

  async function backToHeadOffice() {
    await fetch('/api/dashboard/sub-tenants/exit-view', { method: 'DELETE' }).catch(() => {})
    router.push('/dashboard')
  }

  if (loading) return <p className="text-slate-400">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Locations</h2>
      <p className="text-slate-400 text-sm mb-8">
        Every location under this business. Each one is fully independent — its own crew, schedule, and billing —
        seeded from your brand as a starting point.
      </p>

      <button
        onClick={backToHeadOffice}
        className="mb-6 text-xs text-slate-400 hover:text-slate-700 hover:underline"
      >
        ← Back to head office
      </button>

      <form onSubmit={addLocation} className="max-w-md flex gap-2 mb-8">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New location name, e.g. Brooklyn"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg disabled:opacity-50"
        >
          {creating ? 'Adding...' : 'Add location'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

      <div className="max-w-2xl space-y-3">
        {locations.map((loc) => (
          <div key={loc.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-4">
            <div>
              <p className="font-semibold text-slate-900">{loc.name}</p>
              <p className="text-xs text-slate-400">{loc.industry || 'general'} · {loc.status}</p>
            </div>
            <button
              onClick={() => view(loc.id)}
              disabled={viewing === loc.id}
              className="px-3 py-1.5 border border-slate-300 text-sm rounded-lg hover:border-slate-500 disabled:opacity-50"
            >
              {viewing === loc.id ? 'Opening...' : 'View →'}
            </button>
          </div>
        ))}
        {locations.length === 0 && (
          <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400">
            No locations yet. Add your first one above.
          </div>
        )}
      </div>
    </div>
  )
}
