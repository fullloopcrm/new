'use client'

import { useEffect, useState } from 'react'

const DEFAULT_TIMEZONE = 'America/New_York'

// Client-side counterpart to lib/tenant-time's getTenantTimezone() — defaults
// to Eastern (the convention nearly every tenant already runs on) until the
// tenant's own /api/settings timezone loads, then switches to whatever the
// tenant actually configured.
export function useTenantTimezone(): string {
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const tz = d?.tenant?.timezone
        if (tz) setTimezone(tz)
      })
      .catch(() => {})
  }, [])

  return timezone
}
