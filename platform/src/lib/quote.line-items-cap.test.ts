import { describe, it, expect } from 'vitest'
import { normalizeLineItems } from './quote'

/**
 * WITNESS — normalizeLineItems (shared by quotes + invoices create/update,
 * 4 call sites) had no cap on item count or name/description string length.
 * Same unbounded-array/unbounded-string class already fixed on
 * documents/[id]/fields and the sibling public sign route's field_values.
 * Truncate-not-reject, matching this codebase's existing pattern for
 * internal/semi-trusted free-text fields (prospects' cap()).
 */
describe('normalizeLineItems — unbounded array/string caps', () => {
  it('LOCK: truncates an over-long items array to 500 entries', () => {
    const items = Array.from({ length: 600 }, (_, i) => ({ name: `Item ${i}`, quantity: 1, unit_price_cents: 100 }))
    const result = normalizeLineItems(items)
    expect(result.length).toBe(500)
  })

  it('CONTROL: an array of 500 or fewer entries is untouched', () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ name: `Item ${i}`, quantity: 1, unit_price_cents: 100 }))
    const result = normalizeLineItems(items)
    expect(result.length).toBe(500)
  })

  it('LOCK: truncates an over-long name to 500 characters', () => {
    const result = normalizeLineItems([{ name: 'x'.repeat(600), quantity: 1, unit_price_cents: 100 }])
    expect(result[0].name.length).toBe(500)
  })

  it('LOCK: truncates an over-long description to 5000 characters', () => {
    const result = normalizeLineItems([{ name: 'Item', description: 'x'.repeat(6000), quantity: 1, unit_price_cents: 100 }])
    expect(result[0].description!.length).toBe(5000)
  })

  it('CONTROL: a normal-sized item is unaffected', () => {
    const result = normalizeLineItems([{ name: 'Cleaning', description: 'Deep clean', quantity: 2, unit_price_cents: 5000 }])
    expect(result).toEqual([{
      id: expect.any(String),
      name: 'Cleaning',
      description: 'Deep clean',
      quantity: 2,
      unit_price_cents: 5000,
      subtotal_cents: 10000,
      optional: false,
      selected: true,
    }])
  })
})
