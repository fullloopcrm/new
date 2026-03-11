'use client'

import { useEffect, useState } from 'react'

interface TenantSocial {
  id: string
  name: string
  platforms: {
    facebook: boolean
    instagram: boolean
    tiktok: boolean
  }
  postCount: number
  lastPostDate: string | null
}

export default function AdminSocialPage() {
  const [tenants, setTenants] = useState<TenantSocial[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'connected' | 'inactive'>('all')

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      const res = await fetch('/api/admin/businesses')
      if (res.ok) {
        const data = await res.json()
        const businesses = data.businesses || data.tenants || []
        const socialData: TenantSocial[] = businesses.map((b: Record<string, unknown>) => ({
          id: b.id as string,
          name: b.name as string,
          platforms: {
            facebook: !!b.facebook_connected,
            instagram: !!b.instagram_connected,
            tiktok: !!b.tiktok_connected,
          },
          postCount: (b.social_post_count as number) || 0,
          lastPostDate: (b.social_last_post as string) || null,
        }))
        setTenants(socialData)
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err)
    }
    setLoading(false)
  }

  const hasAnyPlatform = (t: TenantSocial) =>
    t.platforms.facebook || t.platforms.instagram || t.platforms.tiktok

  const filtered = tenants.filter(t => {
    if (filter === 'connected' && !hasAnyPlatform(t)) return false
    if (filter === 'inactive' && hasAnyPlatform(t)) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const fbCount = tenants.filter(t => t.platforms.facebook).length
  const igCount = tenants.filter(t => t.platforms.instagram).length
  const tkCount = tenants.filter(t => t.platforms.tiktok).length
  const totalPosts = tenants.reduce((sum, t) => sum + t.postCount, 0)
  const connectedCount = tenants.filter(t => hasAnyPlatform(t)).length

  const PlatformBadge = ({ active, label, color }: { active: boolean; label: string; color: string }) => (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
      active
        ? color
        : 'bg-gray-50 text-gray-300 border-gray-100'
    }`}>
      {label}
    </span>
  )

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
        <h1 className="text-2xl font-bold text-slate-900">Social Media</h1>
        <p className="text-sm text-gray-500 mt-1">Cross-tenant social media overview</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Connected</p>
          <p className="text-2xl font-bold text-teal-800 mt-1">{connectedCount}</p>
          <p className="text-xs text-teal-500">of {tenants.length} tenants</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Facebook</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{fbCount}</p>
          <p className="text-xs text-blue-500">connected</p>
        </div>
        <div className="bg-pink-50 rounded-xl p-4 border border-pink-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-pink-600">Instagram</p>
          <p className="text-2xl font-bold text-pink-800 mt-1">{igCount}</p>
          <p className="text-xs text-pink-500">connected</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-purple-600">TikTok</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{tkCount}</p>
          <p className="text-xs text-purple-500">connected</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">Total Posts</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{totalPosts.toLocaleString()}</p>
          <p className="text-xs text-green-500">across all tenants</p>
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
          {(['all', 'connected', 'inactive'] as const).map(f => (
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
            <table className="w-full text-sm min-w-[650px]">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Platforms</th>
                  <th className="px-4 py-3 font-medium">Posts</th>
                  <th className="px-4 py-3 font-medium">Last Post</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(t => {
                  const daysSincePost = t.lastPostDate
                    ? Math.floor((Date.now() - new Date(t.lastPostDate).getTime()) / (1000 * 60 * 60 * 24))
                    : null

                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <PlatformBadge active={t.platforms.facebook} label="FB" color="bg-blue-100 text-blue-800 border-blue-200" />
                          <PlatformBadge active={t.platforms.instagram} label="IG" color="bg-pink-100 text-pink-800 border-pink-200" />
                          <PlatformBadge active={t.platforms.tiktok} label="TT" color="bg-purple-100 text-purple-800 border-purple-200" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{t.postCount}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {t.lastPostDate
                          ? new Date(t.lastPostDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!hasAnyPlatform(t) ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            No Platforms
                          </span>
                        ) : daysSincePost !== null && daysSincePost > 30 ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Inactive ({daysSincePost}d)
                          </span>
                        ) : daysSincePost !== null && daysSincePost > 7 ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            Stale ({daysSincePost}d)
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
