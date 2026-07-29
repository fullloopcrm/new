'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UNIVERSAL_PIN } from '@/lib/universal-pin'

type Business = {
  id: string
  name: string
  slug: string
  domain: string | null
  status: string
}

/**
 * Landing page after a fresh master-PIN login — one click into any
 * tenant's operator dashboard, team portal, or client portal, instead of
 * needing to already be on that tenant's own domain to log in there.
 *
 * "Dashboard" uses the platform's own admin-impersonation system
 * (POST /api/admin/impersonate → signed cookie on THIS origin, same pattern
 * as admin/businesses/[id]) instead of the master PIN: no PIN in a URL/
 * browser-history/referrer, and every subsequent request is already logged
 * to impersonation_events. This only works for the operator dashboard
 * because it's global code resolvable via a cookie on this origin.
 *
 * "Team" and "Client" still deep-link the master PIN as a `?pin=` query
 * param (see the `?pin=` handling in TeamLoginForm/portal login page) --
 * those surfaces are served on the TENANT'S OWN domain and authenticate via
 * a completely separate PIN-only system (team_members/clients tables) with
 * no cookie-based impersonation equivalent, so re-submitting the PIN on
 * arrival is still the only way in. Every use of it now writes an
 * audit_logs row (action: 'auth.universal_pin_login') from the consuming
 * route, closing the "invisible bypass" gap even though the URL exposure
 * for these two links remains.
 */
export default function PortalsPickerPage() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [enteringId, setEnteringId] = useState<string | null>(null)

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

  async function enterDashboard(tenantId: string) {
    setEnteringId(tenantId)
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setEnteringId(null)
    }
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
                      <button
                        type="button"
                        onClick={() => enterDashboard(b.id)}
                        disabled={enteringId === b.id}
                        className="px-2 py-1 rounded text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                      >
                        {enteringId === b.id ? 'Entering...' : 'Dashboard'}
                      </button>
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
