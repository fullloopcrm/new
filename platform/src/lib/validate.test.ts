import { describe, it, expect } from 'vitest'
import { validate, pick } from './validate'

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
