'use client'

import { useEffect, useMemo, useState } from 'react'

type CatalogGroup = {
  key: string
  label: string
  permissions: { value: string; label: string }[]
}

type RoleInfo = {
  value: string
  label: string
  description: string
  editable: boolean
  defaults: string[]
  effective: string[]
}

type ApiData = {
  catalog: CatalogGroup[]
  customizableRoles: string[]
  roles: RoleInfo[]
}

// state[role][permission] = granted?
type Matrix = Record<string, Record<string, boolean>>

function buildMatrix(roles: RoleInfo[]): Matrix {
  const m: Matrix = {}
  for (const r of roles) {
    m[r.value] = {}
    for (const p of r.effective) m[r.value][p] = true
  }
  return m
}

interface PermissionsPanelProps {
  /** API endpoint serving GET (defaults+effective) and PUT (save). */
  endpoint?: string
  /** Intro copy shown above the matrix. */
  intro?: string
}

export default function PermissionsPanel({
  endpoint = '/api/settings/permissions',
  intro = 'These are the standard permission sets. Owner always has full access. You can re-tune Admin, Manager, and Staff below — changes apply to everyone with that role. Use “Restore defaults” to reset a role to the standard set.',
}: PermissionsPanelProps) {
  const [data, setData] = useState<ApiData | null>(null)
  const [matrix, setMatrix] = useState<Matrix>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const res = await fetch(endpoint)
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error || `Failed to load (${res.status})`)
        }
        const json: ApiData = await res.json()
        if (!live) return
        setData(json)
        setMatrix(buildMatrix(json.roles))
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => {
      live = false
    }
  }, [endpoint])

  const defaultsByRole = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const r of data?.roles || []) map[r.value] = new Set(r.defaults)
    return map
  }, [data])

  // Dirty = the matrix deviates from the last-loaded/saved effective sets.
  const dirty = useMemo(() => {
    if (!data) return false
    for (const r of data.roles) {
      if (!r.editable) continue
      const loaded = new Set(r.effective)
      for (const p of allPermissions(data)) {
        if (!!matrix[r.value]?.[p] !== loaded.has(p)) return true
      }
    }
    return false
  }, [data, matrix])

  function toggle(role: string, perm: string) {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role]?.[perm] },
    }))
    setSavedAt(null)
  }

  function restoreDefaults(role: string) {
    const defaults = defaultsByRole[role]
    if (!defaults) return
    const next: Record<string, boolean> = {}
    for (const p of allPermissions(data!)) next[p] = defaults.has(p)
    setMatrix((prev) => ({ ...prev, [role]: next }))
    setSavedAt(null)
  }

  async function save() {
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      const overrides: Record<string, Record<string, boolean>> = {}
      for (const role of data.customizableRoles) {
        overrides[role] = {}
        for (const p of allPermissions(data)) {
          overrides[role][p] = !!matrix[role]?.[p]
        }
      }
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `Save failed (${res.status})`)
      }
      setSavedAt(Date.now())
      // Reflect the new saved state as the baseline so "dirty" resets.
      setData((prev) =>
        prev
          ? {
              ...prev,
              roles: prev.roles.map((r) =>
                r.editable
                  ? { ...r, effective: allPermissions(prev).filter((p) => matrix[r.value]?.[p]) }
                  : r,
              ),
            }
          : prev,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-slate-400">Loading permissions…</p>
  if (error && !data) return <p className="text-red-600 text-sm">{error}</p>
  if (!data) return null

  const roleOrder = data.roles

  return (
    <div className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-xs text-slate-400">{intro}</p>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left font-medium text-slate-500 px-4 py-3 whitespace-nowrap">
                Permission
              </th>
              {roleOrder.map((r) => (
                <th key={r.value} className="px-4 py-3 text-center whitespace-nowrap">
                  <div className="font-semibold text-slate-900">{r.label}</div>
                  {r.editable ? (
                    <button
                      onClick={() => restoreDefaults(r.value)}
                      className="text-[10px] text-slate-400 hover:text-slate-700 underline mt-0.5"
                    >
                      Restore defaults
                    </button>
                  ) : (
                    <div className="text-[10px] text-slate-400 mt-0.5">Locked · full access</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.catalog.map((group) => (
              <PermissionGroupRows
                key={group.key}
                group={group}
                roles={roleOrder}
                matrix={matrix}
                defaultsByRole={defaultsByRole}
                onToggle={toggle}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {dirty && !saving && <span className="text-xs text-amber-600">Unsaved changes</span>}
        {savedAt && !dirty && <span className="text-xs text-green-600">Saved</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}

function PermissionGroupRows({
  group,
  roles,
  matrix,
  defaultsByRole,
  onToggle,
}: {
  group: CatalogGroup
  roles: RoleInfo[]
  matrix: Matrix
  defaultsByRole: Record<string, Set<string>>
  onToggle: (role: string, perm: string) => void
}) {
  return (
    <>
      <tr className="bg-slate-50/60">
        <td
          colSpan={roles.length + 1}
          className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
        >
          {group.label}
        </td>
      </tr>
      {group.permissions.map((perm) => (
        <tr key={perm.value} className="border-b border-slate-100 last:border-0">
          <td className="px-4 py-2 text-slate-700">{perm.label}</td>
          {roles.map((r) => {
            const granted = !!matrix[r.value]?.[perm.value]
            const isDefault = defaultsByRole[r.value]?.has(perm.value)
            const changed = r.editable && granted !== isDefault
            return (
              <td key={r.value} className="px-4 py-2 text-center">
                <input
                  type="checkbox"
                  checked={r.editable ? granted : true}
                  disabled={!r.editable}
                  onChange={() => onToggle(r.value, perm.value)}
                  className={`h-4 w-4 rounded border-slate-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    changed ? 'accent-amber-500' : 'accent-slate-900'
                  }`}
                  title={changed ? 'Changed from default' : undefined}
                />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

function allPermissions(data: ApiData): string[] {
  return data.catalog.flatMap((g) => g.permissions.map((p) => p.value))
}
