'use client'

import { useEffect, useState } from 'react'
import { UNIVERSAL_PIN } from '@/lib/universal-pin'

type Business = {
  id: string
  name: string
  slug: string
  domain: string | null
  status: string
}

/**
 * Landing page after a fresh master-PIN (020179) login — one click into any
 * tenant's operator dashboard, team portal, or client portal, instead of
 * needing to already be on that tenant's own domain to log in there.
 *
 * The deep links pass the same master PIN through as a query param so the
 * target domain's own login form auto-submits it (see the `?pin=` handling
 * in LoginForm/TeamLoginForm/portal login page) -- there's no separate
 * cross-domain session/cookie exchange, since the PIN already works
 * domain-independently (verified: /api/admin-auth's ADMIN_PIN check runs
 * before any tenant is resolved). httpOnly cookies and localStorage tokens
 * are both origin-scoped, so re-submitting the PIN on arrival is the only
 * way in short of building a signed handoff-token exchange -- not worth the
 * extra surface for a value that's already a deliberate platform-wide key.
 */
export default function PortalsPickerPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/businesses')
      .then((r) => r.json())
      .then((data) => {
        setBusinesses(data.businesses || [])
        setLoading(false)
      })
  }, [])

  const filtered = businesses.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q) || (b.domain || '').toLowerCase().includes(q)
  })

  function portalUrl(domain: string, path: string): string {
    const url = new URL(`https://${domain}${path}`)
    url.searchParams.set('pin', UNIVERSAL_PIN)
    return url.toString()
  }

  if (loading) return <p className="text-slate-500">Loading portals...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-slate-900 font-heading text-2xl font-bold">Portals</h1>
        <p className="text-sm text-slate-500">{businesses.length} tenants · one click into any dashboard, team portal, or client portal</p>
      </div>

      <input
        placeholder="Search name, slug, domain..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:w-64 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 mb-4"
      />

      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Domain</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Enter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.slug}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{b.domain || '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {b.domain ? (
                    <div className="flex gap-2">
                      <a
                        href={portalUrl(b.domain, '/fullloop?next=%2Fdashboard')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100"
                      >
                        Dashboard
                      </a>
                      <a
                        href={portalUrl(b.domain, '/team/login')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        Team
                      </a>
                      <a
                        href={portalUrl(b.domain, '/portal/login')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        Client
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">No domain configured</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No matching tenants</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
