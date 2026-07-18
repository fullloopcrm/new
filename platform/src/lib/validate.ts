// Lightweight field validation + whitelisting
// Prevents mass-assignment attacks on all API routes

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'email' | 'phone' | 'uuid' | 'date' | 'url'

type FieldDef = {
  type: FieldType
  required?: boolean
  max?: number
  min?: number
}

type Schema = Record<string, FieldDef>

type ValidationResult<T> = { data: T; error: null } | { data: null; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\s\-+().]{7,20}$/

export function validate<T extends Record<string, unknown>>(body: unknown, schema: Schema): ValidationResult<T> {
  if (!body || typeof body !== 'object') {
    return { data: null, error: 'Invalid request body' }
  }

  const input = body as Record<string, unknown>
  const result: Record<string, unknown> = {}

  for (const [field, def] of Object.entries(schema)) {
    const val = input[field]

    // Check required
    if (def.required && (val === undefined || val === null || val === '')) {
      return { data: null, error: `${field} is required` }
    }

    // Skip optional empty fields
    if (val === undefined || val === null || val === '') {
      if (def.required) return { data: null, error: `${field} is required` }
      result[field] = null
      continue
    }

    // Type checking
    switch (def.type) {
      case 'string':
        if (typeof val !== 'string') return { data: null, error: `${field} must be a string` }
        if (def.max && val.length > def.max) return { data: null, error: `${field} exceeds max length ${def.max}` }
        result[field] = val.trim()
        break
      case 'number':
        const num = typeof val === 'string' ? Number(val) : val
        if (typeof num !== 'number' || isNaN(num)) return { data: null, error: `${field} must be a number` }
        if (def.min !== undefined && num < def.min) return { data: null, error: `${field} must be at least ${def.min}` }
        if (def.max !== undefined && num > def.max) return { data: null, error: `${field} must be at most ${def.max}` }
        result[field] = num
        break
      case 'boolean':
        if (typeof val !== 'boolean') return { data: null, error: `${field} must be a boolean` }
        result[field] = val
        break
      case 'array':
        if (!Array.isArray(val)) return { data: null, error: `${field} must be an array` }
        result[field] = val
        break
      case 'email':
        if (typeof val !== 'string' || !EMAIL_RE.test(val)) return { data: null, error: `${field} must be a valid email` }
        result[field] = val.trim().toLowerCase()
        break
      case 'phone':
        if (typeof val !== 'string' || !PHONE_RE.test(val)) return { data: null, error: `${field} must be a valid phone number` }
        result[field] = val.trim()
        break
      case 'uuid':
        if (typeof val !== 'string' || !UUID_RE.test(val)) return { data: null, error: `${field} must be a valid UUID` }
        result[field] = val
        break
      case 'date':
        if (typeof val !== 'string') return { data: null, error: `${field} must be a date string` }
        if (isNaN(Date.parse(val))) return { data: null, error: `${field} must be a valid date` }
        result[field] = val
        break
      case 'url':
        if (typeof val !== 'string') return { data: null, error: `${field} must be a string` }
        result[field] = val.trim()
        break
    }
  }

  return { data: result as T, error: null }
}

// Reject the first field whose string value exceeds `max` characters.
// Guards public-form free-text fields (application notes, background
// answers, etc.) that are rate-limited by request COUNT (rateLimitDb) but
// were never bounded by request SIZE — a single call inside the count limit
// could still stuff an arbitrarily large string into a DB row and the admin
// notification email/SMS built from it. Same class as the chat/yinez/feedback
// message-length caps; this is the multi-field form-application version.
export function maxLengthError(fields: Record<string, unknown>, max = 5000): string | null {
  for (const [name, val] of Object.entries(fields)) {
    if (typeof val === 'string' && val.length > max) {
      return `${name} is too long (max ${max} characters)`
    }
  }
  return null
}

// Pick only allowed fields from body (for simpler cases)
export function pick<T extends Record<string, unknown>>(body: unknown, fields: string[]): Partial<T> {
  if (!body || typeof body !== 'object') return {}
  const input = body as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (input[field] !== undefined) result[field] = input[field]
  }
  return result as Partial<T>
}

// Bound a caller-supplied checklist object before it lands in a JSONB column.
// accounting_periods.checklist (finance/periods POST + PATCH) stored
// body.checklist raw with no shape cap — a caller could stuff thousands of
// keys, non-string keys, or non-boolean values into a JSONB column with no
// size limit. Truncate-not-reject, same convention as
// normalizeLineItems/normalizeTiers (src/lib/quote.ts): drop overflow keys
// and coerce values rather than fail the whole request.
export function normalizeChecklist(raw: unknown, maxKeys = 50, maxKeyLength = 100): Record<string, boolean> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, boolean> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(result).length >= maxKeys) break
    if (!key || key.length > maxKeyLength) continue
    result[key] = Boolean(val)
  }
  return result
}

// Bound a caller-supplied string array (working_days, unavailable_dates,
// service_zones on the legacy /api/cleaners create+update shim over
// team_members) — these were stored raw with no cap on item count or
// per-item string length, same class as normalizeChecklist above. Drops
// non-string items and truncates overflow items/strings rather than
// rejecting the whole request.
export function capStringArray(raw: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (out.length >= maxItems) break
    if (typeof item !== 'string') continue
    out.push(item.length > maxItemLength ? item.slice(0, maxItemLength) : item)
  }
  return out
}

// Bound a caller-supplied free-form object before it lands in a JSONB
// column, for shapes too loosely defined to cheaply whitelist key-by-key
// (e.g. team_members.schedule, keyed by day index/name with {start,end}
// values). Rejects the whole object past a size ceiling rather than
// attempting a partial truncation of arbitrary nesting.
export function capJsonObject(raw: unknown, maxKeys: number, maxSerializedLength: number): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const obj = raw as Record<string, unknown>
  if (Object.keys(obj).length > maxKeys) return {}
  try {
    if (JSON.stringify(obj).length > maxSerializedLength) return {}
  } catch {
    return {}
  }
  return obj
}

// Strip fields before a row goes back to the browser — the redaction-list
// counterpart to pick()'s allowlist. For never-return-this columns (raw
// credential material) on a row that otherwise ships wholesale to the
// client, e.g. `clients.pin`/`team_members.pin` (plaintext portal-login
// PINs). Same shape as settings/route.ts's NEVER_RETURNED_FIELDS loop, made
// reusable for the same pattern recurring across the client/admin API.
export function omit<T extends Record<string, unknown>>(row: T | null | undefined, fields: string[]): T | null | undefined {
  if (!row || typeof row !== 'object') return row
  const result = { ...row } as Record<string, unknown>
  for (const field of fields) {
    delete result[field]
  }
  return result as T
}
