'use client'

/**
 * Edit a tenant's service area (local/national + states + local zones).
 * Self-contained: loads from GET /api/service-area, saves via PUT.
 * Used in onboarding and dashboard Settings. The team-page coverage map
 * reads the same model, so saving here changes the map immediately.
 */

import { useEffect, useState } from 'react'
import { US_STATES, isStateScoped, neighboringStates, deriveServiceAreaForAddress, NYC_DEFAULT_ZONES, type BusinessScope, type ServiceArea, type ServiceZone } from '@/lib/service-area'

// Only real metro preset in the codebase right now (the NYC Maid default zone
// set). Labeled explicitly as NYC so this never reads as "we cover your
// metro" for a tenant somewhere else — add more presets here as real data
// exists for them, don't fake coverage.
const ZONE_PRESETS: { label: string; zones: ServiceZone[] }[] = [
  { label: 'Quick add: NYC boroughs & metro', zones: NYC_DEFAULT_ZONES },
]

interface Props {
  onSaved?: (area: ServiceArea) => void
  /** Controlled "draft" mode for onboarding (no fetch, no save button). */
  embedded?: boolean
  value?: ServiceArea
  onChange?: (area: ServiceArea) => void
  /** Tenant's home state (from the Address & Contact 'state' field) --
   * "Regional" defaults to this state + its direct neighbors instead of
   * showing all 50, since "regional" is supposed to mean a bounded nearby
   * area (e.g. NY -> NY/NJ/CT/PA/MA/VT), not the whole country. */
  homeState?: string | null
  /** Tenant's home city, from the same Radar-verified address (see
   * AddressAutocomplete) -- combined with homeState, drives the NYC
   * auto-detect default (deriveServiceAreaForAddress): a verified NYC address
   * auto-fills the right zones/states for whichever scope is picked, instead
   * of the tenant building the map by hand. */
  homeCity?: string | null
  /** Current value + setter for the "Service radius (mi)" field, rendered at
   * the TOP of this component (Jeff's explicit placement, 2026-08-02) instead
   * of its own separate numbered question further down -- radius is what
   * drives real-address auto-populate (/api/onboarding/coverage) for every
   * metro, not just the NYC-preset case deriveServiceAreaForAddress covers. */
  radiusMiles?: number | null
  onRadiusChange?: (miles: number | null) => void
  /** Onboarding-link token, so the embedded editor can call the
   * token-authenticated coverage endpoint. Session mode (Settings) doesn't
   * need this — the endpoint also accepts a Clerk session, see
   * resolveOnboardingTenantId. */
  token?: string
}

export default function ServiceAreaEditor({ onSaved, embedded, value, onChange, homeState, homeCity, radiusMiles, onRadiusChange, token }: Props) {
  const [showAllStates, setShowAllStates] = useState(false)
  const [area, setArea] = useState<ServiceArea | null>(embedded ? (value ?? { scope: 'local', states: [], zones: [] }) : null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoPopulating, setAutoPopulating] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const [zoneDraft, setZoneDraft] = useState('')

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

  // Auto-populate zones from the verified address + radius the moment both
  // are set, for ANY metro (not just the NYC-preset case
  // deriveServiceAreaForAddress covers) -- "no one is going to sit there
  // typing in every neighborhood by hand" (Jeff, 2026-08-02). Only fires onto
  // a genuinely blank zone list, same non-clobbering rule as setScope's
  // address-derived default above.
  useEffect(() => {
    if (!area || area.scope !== 'local' || !radiusMiles || radiusMiles <= 0 || area.zones.length > 0) return
    let cancelled = false
    setAutoPopulating(true)
    fetch('/api/onboarding/coverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, radiusMiles }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { zones?: ServiceZone[] } | null) => {
        if (cancelled || !d?.zones?.length) return
        setAutoFilled(true)
        setArea((a) => (a && a.scope === 'local' && a.zones.length === 0 ? { ...a, zones: d.zones! } : a))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAutoPopulating(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area?.scope, radiusMiles])

  if (!area) return <div className="text-sm text-gray-400">Loading service area…</div>

  const setScope = (scope: BusinessScope) => {
    setSaved(false)
    setAutoFilled(false)
    // Regional never carries 'ALL'; switching away from local drops zones.
    const states = scope === 'regional' ? area.states.filter((s) => s !== 'ALL') : area.states
    const zones = scope === 'local' ? area.zones : []

    // Auto-fill from the verified address, but only onto a genuinely blank
    // map — never clobber zones/states the tenant already set by hand.
    const isBlank = states.length === 0 && zones.length === 0
    const derived = isBlank ? deriveServiceAreaForAddress(scope, homeCity, homeState) : null
    if (derived) {
      setAutoFilled(true)
      setArea({ ...area, scope, states: derived.states, zones: derived.zones })
      return
    }
    setArea({ ...area, scope, states, zones })
  }

  const addZonesBulk = (raw: string) => {
    const labels = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
    if (!labels.length) return
    setSaved(false)
    const now = Date.now().toString(36)
    const added = labels.map((label, i): ServiceZone => ({ id: `zone_${now}_${i}`, label }))
    setArea({ ...area, zones: [...area.zones, ...added] })
    setZoneDraft('')
  }

  const applyZonePreset = (preset: ServiceZone[]) => {
    setSaved(false)
    const existingIds = new Set(area.zones.map((z) => z.id))
    setArea({ ...area, zones: [...area.zones, ...preset.filter((z) => !existingIds.has(z.id))] })
  }
  const stateBased = isStateScoped(area.scope)
  const regionalDefaultCodes = neighboringStates(homeState)
  const regionalPickerStates =
    area.scope === 'regional' && !showAllStates && regionalDefaultCodes.length > 0
      ? US_STATES.filter((st) => regionalDefaultCodes.includes(st.code))
      : US_STATES
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
      {/* Radius — drives real-address auto-populate below, so it comes first. */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Service radius (mi)</div>
        <input
          type="number"
          min={1}
          value={radiusMiles ?? ''}
          onChange={(e) => onRadiusChange?.(e.target.value === '' ? null : Number(e.target.value))}
          placeholder="e.g. 15"
          className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-sm"
        />
        {autoPopulating && <p className="mt-1.5 text-xs text-gray-500">Finding areas near you…</p>}
      </div>

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

      {autoFilled && (
        <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
          ✓ Auto-filled from your verified address — edit freely below if it&apos;s not quite right.
        </p>
      )}

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
          {area.scope === 'regional' && regionalDefaultCodes.length > 0 && (
            <p className="mb-2 text-xs text-gray-500">
              {showAllStates ? 'Showing all states.' : `Showing ${homeState?.toUpperCase()} and its neighboring states.`}{' '}
              <button type="button" onClick={() => setShowAllStates((v) => !v)} className="text-[#1E2A4A] hover:underline">
                {showAllStates ? 'Show nearby only' : 'Need a farther state? Show all'}
              </button>
            </p>
          )}
          {!allStates && (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
              {regionalPickerStates.map((st) => (
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
            <button type="button" onClick={addZone} className="text-xs text-[#1E2A4A] hover:underline">+ Add blank</button>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <input
              value={zoneDraft}
              onChange={(e) => setZoneDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addZonesBulk(zoneDraft) } }}
              placeholder="Type one, or paste several separated by commas, then Enter…"
              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
            />
            <button type="button" onClick={() => addZonesBulk(zoneDraft)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
              Add
            </button>
          </div>
          {ZONE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyZonePreset(preset.zones)}
              className="mb-2 text-xs text-[#1E2A4A] hover:underline"
            >
              {preset.label}
            </button>
          ))}
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
