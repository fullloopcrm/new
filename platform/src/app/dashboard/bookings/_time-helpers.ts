// Naive/ET datetime helpers for the Bookings admin page's edit form. Extracted
// verbatim from BookingsAdmin.tsx.

// Parse timestamp as UTC — Supabase may return without timezone offset.
// `timezone` defaults to ET for any leftover callers, but every caller in
// BookingsAdmin.tsx passes the tenant's actual timezone explicitly — these
// three functions must stay in lockstep (same zone in and out) since
// fromDateTimeLocalET() round-trips back into a stored UTC value.
export const toEST = (ts: string, timezone = 'America/New_York') => {
  const d = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone })
}

// Convert a stored timestamp to the value an <input type="datetime-local"> wants
// (YYYY-MM-DDTHH:MM, rendered in the tenant's timezone).
export const toDateTimeLocalET = (ts: string, timezone = 'America/New_York'): string => {
  const d = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const g = (t: string) => parts.find(p => p.type === t)?.value || '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

// Convert a datetime-local input value (treated as wall clock in `timezone`) to a UTC ISO string.
export const fromDateTimeLocalET = (val: string, timezone = 'America/New_York'): string => {
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) return new Date().toISOString()
  const [, y, mo, d, hh, mm] = m
  const utcMs = Date.UTC(+y, +mo - 1, +d, +hh, +mm)
  // Probe the target zone's offset for THIS specific datetime (handles DST correctly)
  const probe = new Date(utcMs)
  const probeETHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }).format(probe))
  const probeUTCHour = probe.getUTCHours()
  let offsetHours = probeETHour - probeUTCHour
  if (offsetHours > 12) offsetHours -= 24
  if (offsetHours < -12) offsetHours += 24
  return new Date(utcMs - offsetHours * 3600000).toISOString()
}
