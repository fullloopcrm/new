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
