import { describe, it, expect } from 'vitest'
import { toCSV } from './csv'

describe('toCSV', () => {
  it('generates CSV from data', () => {
    const data = [
      { name: 'John', email: 'john@test.com' },
      { name: 'Jane', email: 'jane@test.com' },
    ]
    const csv = toCSV(data)
    expect(csv).toBe('name,email\nJohn,john@test.com\nJane,jane@test.com')
  })

  it('handles custom columns', () => {
    const data = [{ name: 'John', email: 'j@t.com', age: 30 }]
    const csv = toCSV(data, ['name', 'email'])
    expect(csv).toBe('name,email\nJohn,j@t.com')
  })

  it('escapes commas', () => {
    const data = [{ name: 'Doe, John', city: 'NYC' }]
    const csv = toCSV(data)
    expect(csv).toBe('name,city\n"Doe, John",NYC')
  })

  it('escapes quotes', () => {
    const data = [{ name: 'John "JD" Doe' }]
    const csv = toCSV(data)
    expect(csv).toBe('name\n"John ""JD"" Doe"')
  })

  it('handles null/undefined values', () => {
    const data = [{ name: 'John', email: null, phone: undefined }]
    const csv = toCSV(data as Record<string, unknown>[])
    expect(csv).toBe('name,email,phone\nJohn,,')
  })

  it('returns empty string for empty array', () => {
    expect(toCSV([])).toBe('')
  })
})
