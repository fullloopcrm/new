'use client'

/**
 * Territory map controller. Owns category selection, live recolor, and the
 * claim/release panel. The Leaflet canvas is loaded ssr:false so it only
 * runs in the browser.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { ClaimStatus, TenantPin } from './MapCanvas'

const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-sm text-zinc-500">
      Loading map…
    </div>
  ),
})

interface Category {
  id: string
  slug: string
  name: string
}
interface Territory {
  id: string
  slug: string
  name: string
  kind: 'metro' | 'micro' | 'rural'
  state_abbr: string | null
}
interface TenantLite {
  id: string
  name: string
  industry: string | null
}
interface Props {
  categories: Category[]
  territories: Territory[]
  countyToTerritory: Record<string, string>
  pins: TenantPin[]
  tenants: TenantLite[]
}

interface Selected {
  territoryId: string
  countyName: string
}

export default function TerritoryClient({
  categories,
  territories,
  countyToTerritory,
  pins,
  tenants,
}: Props) {
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? '')
  const [status, setStatus] = useState<Record<string, ClaimStatus>>({})
  const [tenantByTerritory, setTenantByTerritory] = useState<Record<string, string | null>>({})
  const [selected, setSelected] = useState<Selected | null>(null)
  const [assignTenant, setAssignTenant] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const territoryById = useMemo(() => {
    const m = new Map<string, Territory>()
    for (const t of territories) m.set(t.id, t)
    return m
  }, [territories])

  const loadClaims = useCallback(async (cat: string) => {
    if (!cat) return
    setError(null)
    const res = await fetch(`/api/admin/territories?category=${cat}`)
    if (!res.ok) {
      setError('Failed to load claims')
      return
    }
    const { claims } = (await res.json()) as {
      claims: { territory_id: string; status: ClaimStatus; tenant_name: string | null }[]
    }
    const s: Record<string, ClaimStatus> = {}
    const tn: Record<string, string | null> = {}
    for (const c of claims) {
      s[c.territory_id] = c.status
      tn[c.territory_id] = c.tenant_name
    }
    setStatus(s)
    setTenantByTerritory(tn)
  }, [])

  useEffect(() => {
    // Fetch on category change; loadClaims setStates asynchronously after await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClaims(categoryId)
  }, [categoryId, loadClaims])

  const counts = useMemo(() => {
    let claimed = 0
    let pending = 0
    for (const v of Object.values(status)) {
      if (v === 'claimed') claimed++
      else if (v === 'pending') pending++
    }
    return { claimed, pending, available: territories.length - claimed - pending }
  }, [status, territories.length])

  async function act(action: 'claim' | 'release', st?: 'claimed' | 'pending') {
    if (!selected) return
    setBusy(true)
    setError(null)
    const res = await fetch('/api/admin/territories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        territoryId: selected.territoryId,
        categoryId,
        tenantId: assignTenant || null,
        status: st,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Action failed')
      return
    }
    await loadClaims(categoryId)
  }

  const sel = selected ? territoryById.get(selected.territoryId) : null
  const selStatus = selected ? (status[selected.territoryId] ?? 'available') : null

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 140px)' }}>
      {/* LEFT: controls */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value)
              setSelected(null)
            }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Available" value={counts.available} color="#10b981" />
          <Stat label="Pending" value={counts.pending} color="#f59e0b" />
          <Stat label="Claimed" value={counts.claimed} color="#ef4444" />
        </div>

        {/* Detail / claim panel */}
        <div className="border border-zinc-800 rounded p-3 flex-1 overflow-y-auto">
          {!sel ? (
            <p className="text-sm text-zinc-500">
              Click a county to select its territory.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-zinc-100">{sel.name}</div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-wide">
                  {sel.kind} · {sel.state_abbr ?? '—'} · via {selected!.countyName}
                </div>
              </div>
              <div className="text-xs">
                Status:{' '}
                <span
                  style={{
                    color:
                      selStatus === 'claimed'
                        ? '#ef4444'
                        : selStatus === 'pending'
                          ? '#f59e0b'
                          : '#10b981',
                  }}
                >
                  {selStatus}
                </span>
                {tenantByTerritory[selected!.territoryId] && (
                  <span className="text-zinc-400"> · {tenantByTerritory[selected!.territoryId]}</span>
                )}
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                  Assign tenant (optional)
                </label>
                <select
                  value={assignTenant}
                  onChange={(e) => setAssignTenant(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
                >
                  <option value="">— none —</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  disabled={busy}
                  onClick={() => act('claim', 'claimed')}
                  className="w-full bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded py-1.5"
                >
                  Mark Claimed
                </button>
                <button
                  disabled={busy}
                  onClick={() => act('claim', 'pending')}
                  className="w-full bg-amber-600/90 hover:bg-amber-600 disabled:opacity-50 text-white text-sm rounded py-1.5"
                >
                  Mark Pending
                </button>
                {selStatus !== 'available' && (
                  <button
                    disabled={busy}
                    onClick={() => act('release')}
                    className="w-full border border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 text-zinc-200 text-sm rounded py-1.5"
                  >
                    Release
                  </button>
                )}
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: map */}
      <div className="flex-1 rounded overflow-hidden border border-zinc-800">
        <MapCanvas
          countyToTerritory={countyToTerritory}
          territoryStatus={status}
          pins={pins}
          onCountyClick={(territoryId, countyName) => {
            setSelected({ territoryId, countyName })
            setAssignTenant('')
          }}
        />
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-zinc-800 rounded py-1.5">
      <div className="text-lg font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  )
}
