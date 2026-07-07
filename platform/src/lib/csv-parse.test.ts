import { describe, it, expect } from 'vitest'
import { parseDelimited } from './csv-parse'

describe('parseDelimited', () => {
  it('parses a simple CSV with a header row', () => {
    const { headers, rows } = parseDelimited('name,phone\nJane,5551212\nJohn,5551213')
    expect(headers).toEqual(['name', 'phone'])
    expect(rows).toEqual([['Jane', '5551212'], ['John', '5551213']])
  })

  it('handles quoted fields with commas and escaped quotes', () => {
    const { rows } = parseDelimited('name,notes\n"Doe, Jane","she said ""hi"""')
    expect(rows[0]).toEqual(['Doe, Jane', 'she said "hi"'])
  })

  it('handles CRLF line endings', () => {
    const { headers, rows } = parseDelimited('a,b\r\n1,2\r\n')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([['1', '2']])
  })

  it('auto-detects tab-separated values', () => {
    const { headers, rows } = parseDelimited('name\tphone\nJane\t5551212')
    expect(headers).toEqual(['name', 'phone'])
    expect(rows).toEqual([['Jane', '5551212']])
  })

  it('drops blank lines', () => {
    const { rows } = parseDelimited('a\n1\n\n\n2\n')
    expect(rows).toEqual([['1'], ['2']])
  })

  it('returns empty on empty input', () => {
    expect(parseDelimited('')).toEqual({ headers: [], rows: [] })
  })
})
