// Naive/ET datetime helpers for the Bookings admin page's edit form. Extracted
// verbatim from BookingsAdmin.tsx.

// Parse timestamp as UTC — Supabase may return without timezone offset
export const toEST = (ts: string) => {
  const d = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
}

// Convert a stored timestamp to the value an <input type="datetime-local"> wants
// (YYYY-MM-DDTHH:MM, rendered in ET).
export const toDateTimeLocalET = (ts: string): string => {
  const d = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const g = (t: string) => parts.find(p => p.type === t)?.value || '00'
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

// Convert a datetime-local input value (treated as ET wall clock) to a UTC ISO string.
export const fromDateTimeLocalET = (val: string): string => {
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) return new Date().toISOString()
  const [, y, mo, d, hh, mm] = m
  const utcMs = Date.UTC(+y, +mo - 1, +d, +hh, +mm)
  // Probe the ET offset for THIS specific datetime (handles DST correctly)
  const probe = new Date(utcMs)
  const probeETHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false }).format(probe))
  const probeUTCHour = probe.getUTCHours()
  let offsetHours = probeETHour - probeUTCHour
  if (offsetHours > 12) offsetHours -= 24
  if (offsetHours < -12) offsetHours += 24
  return new Date(utcMs - offsetHours * 3600000).toISOString()
}
