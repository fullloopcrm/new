'use client'

/**
 * Edit a tenant's service area (local/national + states + local zones).
 * Self-contained: loads from GET /api/service-area, saves via PUT.
 * Used in onboarding and dashboard Settings. The team-page coverage map
 * reads the same model, so saving here changes the map immediately.
 */

import { useEffect, useState } from 'react'
import { US_STATES, isStateScoped, type BusinessScope, type ServiceArea, type ServiceZone } from '@/lib/service-area'

interface Props {
  onSaved?: (area: ServiceArea) => void
  /** Controlled "draft" mode for onboarding (no fetch, no save button). */
  embedded?: boolean
  value?: ServiceArea
  onChange?: (area: ServiceArea) => void
}

export default function ServiceAreaEditor({ onSaved, embedded, value, onChange }: Props) {
  const [area, setArea] = useState<ServiceArea | null>(embedded ? (value ?? { scope: 'local', states: [], zones: [] }) : null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (embedded) return
    fetch('/api/service-area')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setArea((d?.serviceArea as ServiceArea) ?? { scope: 'local', states: [], zones: [] }))
      .catch(() => setArea({ scope: 'local', states: [], zones: [] }))
  }, [embedded])

  // Propagate changes upward in controlled mode.
  useEffect(() => {
    if (embedded && area) onChange?.(area)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, embedded])

  if (!area) return <div className="text-sm text-gray-400">Loading service area…</div>

  const setScope = (scope: BusinessScope) => {
    setSaved(false)
    // Regional never carries 'ALL'; switching away from local drops zones.
    const states = scope === 'regional' ? area.states.filter((s) => s !== 'ALL') : area.states
    setArea({ ...area, scope, states, zones: scope === 'local' ? area.zones : [] })
  }
  const stateBased = isStateScoped(area.scope)
  const allStates = area.states.includes('ALL')

  const toggleState = (code: string) => {
    setSaved(false)
    const has = area.states.includes(code)
    setArea({ ...area, states: has ? area.states.filter((s) => s !== code) : [...area.states.filter((s) => s !== 'ALL'), code] })
  }
  const toggleAll = () => {
    setSaved(false)
    setArea({ ...area, states: allStates ? [] : ['ALL'] })
  }

  const updateZone = (i: number, label: string) => {
    setSaved(false)
    const zones = area.zones.map((z, idx) => (idx === i ? { ...z, label } : z))
    setArea({ ...area, zones })
  }
  const addZone = () => {
    setSaved(false)
    const id = `zone_${Date.now().toString(36)}`
    setArea({ ...area, zones: [...area.zones, { id, label: '' }] })
  }
  const removeZone = (i: number) => {
    setSaved(false)
    setArea({ ...area, zones: area.zones.filter((_, idx) => idx !== i) })
  }

  const save = async () => {
    setSaving(true); setError(null)
    // Drop empty zone labels before saving.
    const clean: ServiceArea = {
      ...area,
      zones: area.zones.filter((z) => z.label.trim()).map((z): ServiceZone => ({ ...z, label: z.label.trim() })),
    }
    try {
      const res = await fetch('/api/service-area', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceArea: clean }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || res.statusText)
      }
      const d = await res.json()
      setArea(d.serviceArea as ServiceArea)
      setSaved(true)
      onSaved?.(d.serviceArea as ServiceArea)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Scope */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Business type</div>
        <div className="flex gap-2">
          {(['local', 'regional', 'national'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                area.scope === s ? 'border-[#1E2A4A] bg-[#1E2A4A] text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'local' ? 'Local (one metro / zones)' : s === 'regional' ? 'Regional (a few states)' : 'National (many states)'}
            </button>
          ))}
        </div>
      </div>

      {/* Regional / National: state picker ('All states' is national-only) */}
      {stateBased && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service-area states</div>
            {area.scope === 'national' && (
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={allStates} onChange={toggleAll} /> All states
              </label>
            )}
          </div>
          {!allStates && (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
              {US_STATES.map((st) => (
                <button
                  key={st.code}
                  type="button"
                  onClick={() => toggleState(st.code)}
                  title={st.name}
                  className={`px-2 py-1.5 rounded border text-xs transition-all ${
                    area.states.includes(st.code) ? 'border-[#1E2A4A] bg-[#1E2A4A]/10 text-[#1E2A4A] font-medium' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {st.code}
                </button>
              ))}
            </div>
          )}
          {allStates && <p className="text-xs text-gray-500">Serving all 50 states + DC.</p>}
        </div>
      )}

      {/* Local: zones */}
      {area.scope === 'local' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coverage zones</div>
            <button type="button" onClick={addZone} className="text-xs text-[#1E2A4A] hover:underline">+ Add zone</button>
          </div>
          <div className="space-y-1.5">
            {area.zones.length === 0 && <p className="text-xs text-gray-400">No zones yet. Add the neighborhoods/areas you serve.</p>}
            {area.zones.map((z, i) => (
              <div key={z.id} className="flex items-center gap-2">
                <input
                  value={z.label}
                  onChange={(e) => updateZone(i, e.target.value)}
                  placeholder="e.g. Downtown, Brooklyn, North Side…"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                />
                <button type="button" onClick={() => removeZone(i)} className="text-gray-400 hover:text-red-500 text-sm px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!embedded && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#1E2A4A] text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save service area'}
          </button>
          {saved && <span className="text-xs text-green-600">Saved ✓</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}
    </div>
  )
}
