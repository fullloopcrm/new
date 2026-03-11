'use client'

import { useEffect, useState } from 'react'

interface TenantGoogle {
  id: string
  name: string
  connected: boolean
  locationTitle: string
  avgRating: number
  reviewCount: number
  autoReplyEnabled: boolean
  lastSynced: string | null
}

export default function AdminGoogleProfilePage() {
  const [tenants, setTenants] = useState<TenantGoogle[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'connected' | 'disconnected'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      const res = await fetch('/api/admin/businesses')
      if (res.ok) {
        const data = await res.json()
        const businesses = data.businesses || data.tenants || []
        const googleData: TenantGoogle[] = businesses.map((b: Record<string, unknown>) => ({
          id: b.id as string,
          name: b.name as string,
          connected: !!b.google_connected,
          locationTitle: (b.google_location_title as string) || '',
          avgRating: (b.google_avg_rating as number) || 0,
          reviewCount: (b.google_review_count as number) || 0,
          autoReplyEnabled: !!b.google_auto_reply,
          lastSynced: (b.google_last_synced as string) || null,
        }))
        setTenants(googleData)
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err)
    }
    setLoading(false)
  }

  async function syncReviews(tenantId: string) {
    setSyncing(tenantId)
    try {
      await fetch(`/api/admin/businesses/${tenantId}/google/sync`, { method: 'POST' })
      await fetchTenants()
    } catch (err) {
      console.error('Sync failed:', err)
    }
    setSyncing(null)
  }

  async function toggleAutoReply(tenantId: string, current: boolean) {
    setToggling(tenantId)
    try {
      await fetch(`/api/admin/businesses/${tenantId}/google/auto-reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current }),
      })
      setTenants(prev =>
        prev.map(t => t.id === tenantId ? { ...t, autoReplyEnabled: !current } : t)
      )
    } catch (err) {
      console.error('Toggle failed:', err)
    }
    setToggling(null)
  }

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}>&#9733;</span>
    ))

  const filtered = tenants.filter(t => {
    if (filter === 'connected' && !t.connected) return false
    if (filter === 'disconnected' && t.connected) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const connectedCount = tenants.filter(t => t.connected).length
  const totalReviews = tenants.reduce((sum, t) => sum + t.reviewCount, 0)
  const avgRatingAll = tenants.filter(t => t.connected && t.avgRating > 0)
  const overallAvg = avgRatingAll.length > 0
    ? avgRatingAll.reduce((sum, t) => sum + t.avgRating, 0) / avgRatingAll.length
    : 0

  if (loading) {
    return (
      <main className="p-3 md:p-6">
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </main>
    )
  }

  return (
    <main className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Google Business Profiles</h1>
        <p className="text-sm text-gray-500 mt-1">Cross-tenant Google Business Profile overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Connected</p>
          <p className="text-2xl font-bold text-teal-800 mt-1">{connectedCount} / {tenants.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-yellow-600">Avg Rating</p>
          <p className="text-2xl font-bold text-yellow-800 mt-1">{overallAvg.toFixed(1)}</p>
          <div className="text-lg mt-0.5">{renderStars(overallAvg)}</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total Reviews</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{totalReviews.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">Auto-Reply On</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{tenants.filter(t => t.autoReplyEnabled).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search tenants..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none flex-1 max-w-xs"
        />
        <div className="flex gap-2">
          {(['all', 'connected', 'disconnected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                filter === f ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tenant table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No tenants found</h3>
          <p className="text-gray-400 text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Reviews</th>
                  <th className="px-4 py-3 font-medium">Auto-Reply</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600">{t.locationTitle || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.connected
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.connected ? (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-900">{t.avgRating.toFixed(1)}</span>
                          <span className="text-yellow-400">&#9733;</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{t.connected ? t.reviewCount : '—'}</td>
                    <td className="px-4 py-3">
                      {t.connected ? (
                        <button
                          onClick={() => toggleAutoReply(t.id, t.autoReplyEnabled)}
                          disabled={toggling === t.id}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            t.autoReplyEnabled ? 'bg-teal-600' : 'bg-gray-200'
                          } ${toggling === t.id ? 'opacity-50' : ''}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            t.autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {t.connected && (
                        <button
                          onClick={() => syncReviews(t.id)}
                          disabled={syncing === t.id}
                          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                        >
                          {syncing === t.id ? 'Syncing...' : 'Sync Reviews'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Last synced info */}
      {filtered.some(t => t.lastSynced) && (
        <div className="mt-4 text-xs text-gray-400">
          Last sync times vary by tenant. Check individual tenant dashboards for details.
        </div>
      )}
    </main>
  )
}
