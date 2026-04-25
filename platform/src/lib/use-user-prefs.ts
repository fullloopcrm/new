'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Per-user, per-page preferences hook. Distinct from useTenantSettings.
 *
 * Use for view-state config: default filters, page size, default sort,
 * column visibility, "show paused" toggles. Anything that should differ
 * between two team members on the same tenant.
 *
 * NOT for tenant-wide business rules (booking buffer, payment methods,
 * allow_same_day) — those go through useTenantSettings.
 *
 * Auto-saves on every updatePref() call. Optimistic local state.
 */
export function useUserPrefs<T extends Record<string, unknown>>(
  page: string,
  defaults: T
) {
  const [prefs, setPrefs] = useState<T>(defaults)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/user/preferences?page=${encodeURIComponent(page)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const stored = (data?.prefs || {}) as Partial<T>
        setPrefs({ ...defaults, ...stored })
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // page is the only thing that should retrigger the load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const save = useCallback(
    async (next: T) => {
      setSaving(true)
      setSaveMsg('')
      try {
        const res = await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, prefs: next }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setSaveMsg(data?.error || 'Save failed')
          return
        }
        setSaveMsg('Saved')
        setTimeout(() => setSaveMsg(''), 1500)
      } catch {
        setSaveMsg('Network error')
      } finally {
        setSaving(false)
      }
    },
    [page]
  )

  const updatePref = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value }
        save(next)
        return next
      })
    },
    [save]
  )

  return { prefs, loaded, saving, saveMsg, updatePref }
}
