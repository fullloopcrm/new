'use client'

import { useCallback, useEffect, useState } from 'react'

export type TenantRow = Record<string, unknown> & {
  id?: string
  selena_config?: Record<string, unknown> | null
}

/**
 * Client hook for any dashboard panel that edits real tenant columns.
 * Wraps GET /api/settings (load) + PUT /api/settings (save).
 *
 * Replaces usePageSettings() for panels that should drive real platform
 * behavior instead of writing to setup_progress.__page_config_<page>.
 *
 * - updateField(key, value): writes a single column on tenants and returns
 *   the updated row.
 * - updateSelenaConfig(patch): merges patch into tenants.selena_config jsonb.
 *   Use this for config that doesn't have its own column.
 */
export function useTenantSettings() {
  const [tenant, setTenant] = useState<TenantRow | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data?.tenant) setTenant(data.tenant as TenantRow)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async (patch: Record<string, unknown>) => {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSaveMsg(data?.error || 'Save failed')
        return null
      }
      const data = await res.json()
      const updated = (data?.tenant || null) as TenantRow | null
      if (updated) setTenant(updated)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 1500)
      return updated
    } catch {
      setSaveMsg('Network error')
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const updateField = useCallback(
    (key: string, value: unknown) => {
      // Optimistic local update so the UI reflects the change immediately.
      setTenant((prev) => (prev ? { ...prev, [key]: value } : prev))
      return save({ [key]: value })
    },
    [save]
  )

  const updateSelenaConfig = useCallback(
    (patch: Record<string, unknown>) => {
      const next = { ...(tenant?.selena_config || {}), ...patch }
      setTenant((prev) => (prev ? { ...prev, selena_config: next } : prev))
      return save({ selena_config: next })
    },
    [save, tenant]
  )

  return { tenant, loaded, saving, saveMsg, updateField, updateSelenaConfig }
}
