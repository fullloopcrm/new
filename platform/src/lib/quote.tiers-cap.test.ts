import { describe, it, expect } from 'vitest'
import { normalizeTiers } from './quote'

/**
 * WITNESS — normalizeTiers (shared by quotes/route.ts, quotes/[id]/route.ts,
 * and quote-templates/route.ts) — body.tiers was stored raw with no cap on
 * label/note string length, and each tier's own line_items array bypassed
 * normalizeLineItems entirely. Same unbounded class as the sibling
 * normalizeLineItems fix; quotes/public/[token]/route.ts serves tiers
 * straight to the public (unauthenticated) quote page.
 * Truncate-not-reject, matching normalizeLineItems' convention.
 */
describe('normalizeTiers — unbounded object/string/array caps', () => {
  it('LOCK: truncates an over-long label to 200 characters', () => {
    const result = normalizeTiers({ good: { label: 'x'.repeat(300), line_items: [], subtotal_cents: 0 } })
    expect(result!.good.label.length).toBe(200)
  })

  it('LOCK: truncates an over-long note to 2000 characters', () => {
    const result = normalizeTiers({ good: { label: 'Good', line_items: [], subtotal_cents: 0, note: 'x'.repeat(3000) } })
    expect(result!.good.note!.length).toBe(2000)
  })

  it('LOCK: each tier\'s line_items goes through the same per-item caps as normalizeLineItems', () => {
    const items = Array.from({ length: 600 }, (_, i) => ({ name: `Item ${i}`, quantity: 1, unit_price_cents: 100 }))
    const result = normalizeTiers({ good: { label: 'Good', line_items: items, subtotal_cents: 0 } })
    expect(result!.good.line_items.length).toBe(500)
  })

  it('LOCK: unknown keys beyond good/better/best are dropped', () => {
    const result = normalizeTiers({
      good: { label: 'Good', line_items: [], subtotal_cents: 0 },
      malicious: { label: 'x', line_items: [], subtotal_cents: 0 },
    })
    expect(Object.keys(result!)).toEqual(['good'])
  })

  it('CONTROL: null/undefined tiers returns null', () => {
    expect(normalizeTiers(null)).toBeNull()
    expect(normalizeTiers(undefined)).toBeNull()
  })

  it('CONTROL: a non-object tiers value returns null', () => {
    expect(normalizeTiers('not an object')).toBeNull()
    expect(normalizeTiers(42)).toBeNull()
  })

  it('CONTROL: an empty object returns null', () => {
    expect(normalizeTiers({})).toBeNull()
  })

  it('CONTROL: a normal-sized 3-tier quote is preserved', () => {
    const result = normalizeTiers({
      good: { label: 'Good', line_items: [{ name: 'Basic clean', quantity: 1, unit_price_cents: 10000 }], subtotal_cents: 10000 },
      better: { label: 'Better', line_items: [{ name: 'Deep clean', quantity: 1, unit_price_cents: 15000 }], subtotal_cents: 15000 },
      best: { label: 'Best', line_items: [{ name: 'Premium clean', quantity: 1, unit_price_cents: 20000 }], subtotal_cents: 20000, note: 'Includes windows' },
    })
    expect(Object.keys(result!)).toEqual(['good', 'better', 'best'])
    expect(result!.best.note).toBe('Includes windows')
    expect(result!.good.line_items[0].name).toBe('Basic clean')
  })
})
