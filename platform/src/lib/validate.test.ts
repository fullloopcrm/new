import { describe, it, expect } from 'vitest'
import { validate, pick, normalizeChecklist, capStringArray, capJsonObject } from './validate'

describe('validate', () => {
  it('validates required string fields', () => {
    const result = validate({ name: 'John' }, { name: { type: 'string', required: true } })
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ name: 'John' })
  })

  it('rejects missing required fields', () => {
    const result = validate({}, { name: { type: 'string', required: true } })
    expect(result.error).toBe('name is required')
    expect(result.data).toBeNull()
  })

  it('trims strings', () => {
    const result = validate({ name: '  John  ' }, { name: { type: 'string', required: true } })
    expect(result.data).toEqual({ name: 'John' })
  })

  it('validates email format', () => {
    const good = validate({ email: 'test@example.com' }, { email: { type: 'email' } })
    expect(good.error).toBeNull()
    expect(good.data).toEqual({ email: 'test@example.com' })

    const bad = validate({ email: 'notanemail' }, { email: { type: 'email' } })
    expect(bad.error).toBe('email must be a valid email')
  })

  it('validates phone format', () => {
    const good = validate({ phone: '(555) 123-4567' }, { phone: { type: 'phone' } })
    expect(good.error).toBeNull()

    const bad = validate({ phone: 'abc' }, { phone: { type: 'phone' } })
    expect(bad.error).toBe('phone must be a valid phone number')
  })

  it('validates UUID format', () => {
    const good = validate(
      { id: '550e8400-e29b-41d4-a716-446655440000' },
      { id: { type: 'uuid', required: true } }
    )
    expect(good.error).toBeNull()

    const bad = validate({ id: 'not-a-uuid' }, { id: { type: 'uuid', required: true } })
    expect(bad.error).toBe('id must be a valid UUID')
  })

  it('validates number with min/max', () => {
    const good = validate({ rating: 4 }, { rating: { type: 'number', min: 1, max: 5 } })
    expect(good.error).toBeNull()
    expect(good.data).toEqual({ rating: 4 })

    const tooHigh = validate({ rating: 6 }, { rating: { type: 'number', min: 1, max: 5 } })
    expect(tooHigh.error).toBe('rating must be at most 5')

    const tooLow = validate({ rating: 0 }, { rating: { type: 'number', min: 1, max: 5 } })
    expect(tooLow.error).toBe('rating must be at least 1')
  })

  it('converts string numbers', () => {
    const result = validate({ amount: '42.5' }, { amount: { type: 'number' } })
    expect(result.data).toEqual({ amount: 42.5 })
  })

  it('validates date strings', () => {
    const good = validate({ date: '2024-01-15T10:00:00Z' }, { date: { type: 'date' } })
    expect(good.error).toBeNull()

    const bad = validate({ date: 'not-a-date' }, { date: { type: 'date' } })
    expect(bad.error).toBe('date must be a valid date')
  })

  it('validates arrays', () => {
    const good = validate({ tags: [1, 2, 3] }, { tags: { type: 'array' } })
    expect(good.error).toBeNull()

    const bad = validate({ tags: 'not-array' }, { tags: { type: 'array' } })
    expect(bad.error).toBe('tags must be an array')
  })

  it('validates booleans', () => {
    const good = validate({ active: true }, { active: { type: 'boolean' } })
    expect(good.error).toBeNull()

    const bad = validate({ active: 'yes' }, { active: { type: 'boolean' } })
    expect(bad.error).toBe('active must be a boolean')
  })

  it('strips unknown fields (mass assignment protection)', () => {
    const result = validate(
      { name: 'John', admin: true, tenant_id: 'hack', role: 'superadmin' },
      { name: { type: 'string', required: true } }
    )
    expect(result.data).toEqual({ name: 'John' })
  })

  it('handles null/empty optional fields', () => {
    const result = validate(
      { name: 'John', email: null, phone: '' },
      {
        name: { type: 'string', required: true },
        email: { type: 'email' },
        phone: { type: 'phone' },
      }
    )
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ name: 'John', email: null, phone: null })
  })

  it('enforces max length', () => {
    const result = validate(
      { name: 'A'.repeat(300) },
      { name: { type: 'string', max: 255 } }
    )
    expect(result.error).toBe('name exceeds max length 255')
  })

  it('rejects invalid body', () => {
    const result = validate(null, { name: { type: 'string' } })
    expect(result.error).toBe('Invalid request body')
  })
})

describe('pick', () => {
  it('picks specified fields', () => {
    const result = pick({ name: 'John', email: 'j@test.com', admin: true }, ['name', 'email'])
    expect(result).toEqual({ name: 'John', email: 'j@test.com' })
  })

  it('ignores undefined fields', () => {
    const result = pick({ name: 'John' }, ['name', 'email'])
    expect(result).toEqual({ name: 'John' })
  })

  it('handles invalid body', () => {
    const result = pick(null, ['name'])
    expect(result).toEqual({})
  })
})

/**
 * WITNESS — normalizeChecklist (finance/periods POST + PATCH). body.checklist
 * was stored raw into accounting_periods.checklist (JSONB) with no cap on key
 * count, key length, or value type. Truncate-not-reject, same convention as
 * normalizeLineItems/normalizeTiers (src/lib/quote.ts).
 */
describe('normalizeChecklist — unbounded object cap', () => {
  it('LOCK: drops keys beyond maxKeys', () => {
    const raw: Record<string, boolean> = {}
    for (let i = 0; i < 100; i++) raw[`key${i}`] = true
    const result = normalizeChecklist(raw, 50)
    expect(Object.keys(result).length).toBe(50)
  })

  it('LOCK: drops keys longer than maxKeyLength', () => {
    const result = normalizeChecklist({ ['x'.repeat(200)]: true, ok: true }, 50, 100)
    expect(result).toEqual({ ok: true })
  })

  it('LOCK: coerces non-boolean values to boolean', () => {
    const result = normalizeChecklist({ a: 'yes', b: 0, c: null, d: 1 })
    expect(result).toEqual({ a: true, b: false, c: false, d: true })
  })

  it('CONTROL: null/undefined/array input returns empty object', () => {
    expect(normalizeChecklist(null)).toEqual({})
    expect(normalizeChecklist(undefined)).toEqual({})
    expect(normalizeChecklist(['a', 'b'])).toEqual({})
  })

  it('CONTROL: a normal-sized checklist is preserved', () => {
    const result = normalizeChecklist({ bank_recon: true, ar_review: false })
    expect(result).toEqual({ bank_recon: true, ar_review: false })
  })
})

/**
 * WITNESS — capStringArray (legacy /api/cleaners create+update shim over
 * team_members). working_days/unavailable_dates/service_zones were stored
 * raw with no cap on array length or per-item string length.
 */
describe('capStringArray — unbounded array cap', () => {
  it('LOCK: truncates arrays beyond maxItems', () => {
    const result = capStringArray(Array.from({ length: 300 }, (_, i) => `z${i}`), 200, 50)
    expect(result.length).toBe(200)
  })

  it('LOCK: truncates over-long items to maxItemLength', () => {
    const result = capStringArray(['x'.repeat(100)], 10, 20)
    expect(result[0].length).toBe(20)
  })

  it('LOCK: drops non-string items', () => {
    const result = capStringArray(['a', 42, null, { x: 1 }, 'b'], 10, 50)
    expect(result).toEqual(['a', 'b'])
  })

  it('CONTROL: non-array input returns empty array', () => {
    expect(capStringArray(null, 10, 50)).toEqual([])
    expect(capStringArray('not-array', 10, 50)).toEqual([])
    expect(capStringArray(undefined, 10, 50)).toEqual([])
  })

  it('CONTROL: a normal-sized array is preserved', () => {
    expect(capStringArray(['mon', 'tue', 'wed'], 14, 20)).toEqual(['mon', 'tue', 'wed'])
  })
})

/**
 * WITNESS — capJsonObject (legacy /api/cleaners create+update shim over
 * team_members). team_members.schedule was stored raw with no cap on key
 * count or serialized size.
 */
describe('capJsonObject — unbounded object size cap', () => {
  it('LOCK: rejects (returns {}) an object with too many keys', () => {
    const raw: Record<string, unknown> = {}
    for (let i = 0; i < 50; i++) raw[`k${i}`] = { start: '08:00', end: '17:00' }
    expect(capJsonObject(raw, 20, 2000)).toEqual({})
  })

  it('LOCK: rejects (returns {}) an object exceeding the serialized-size ceiling', () => {
    const result = capJsonObject({ mon: { start: 'x'.repeat(5000), end: '17:00' } }, 20, 2000)
    expect(result).toEqual({})
  })

  it('CONTROL: null/undefined/array/non-object input returns empty object', () => {
    expect(capJsonObject(null, 20, 2000)).toEqual({})
    expect(capJsonObject(undefined, 20, 2000)).toEqual({})
    expect(capJsonObject(['a'], 20, 2000)).toEqual({})
    expect(capJsonObject('nope', 20, 2000)).toEqual({})
  })

  it('CONTROL: a normal-sized schedule object is preserved', () => {
    const schedule = { mon: { start: '08:00', end: '17:00' }, tue: { start: '08:00', end: '17:00' } }
    expect(capJsonObject(schedule, 20, 2000)).toEqual(schedule)
  })
})
