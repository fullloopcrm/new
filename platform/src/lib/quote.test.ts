import { describe, it, expect } from 'vitest'
import {
  computeLineItemSubtotal,
  normalizeLineItems,
  computeTotals,
  formatCents,
  formatBpsAsPct,
  type QuoteLineItem,
} from './quote'

/**
 * Quote money math (customer-facing totals). These pure functions decide the
 * dollar figure a client is asked to accept, so the invariants are financial:
 * a quote total can never go negative, a discount can never exceed the subtotal
 * (which would mint a negative bill), optional-but-unselected add-ons must NOT
 * be charged, and tax is applied only to the post-discount taxable base.
 */

const li = (over: Partial<QuoteLineItem>): QuoteLineItem => ({
  id: over.id || 'x',
  name: over.name || 'Item',
  quantity: over.quantity ?? 1,
  unit_price_cents: over.unit_price_cents ?? 0,
  subtotal_cents: over.subtotal_cents ?? 0,
  optional: over.optional,
  selected: over.selected,
})

describe('computeLineItemSubtotal', () => {
  it('multiplies quantity by unit price and rounds to a whole cent', () => {
    expect(computeLineItemSubtotal({ id: 'a', name: 'A', quantity: 3, unit_price_cents: 1999 })).toBe(5997)
    expect(computeLineItemSubtotal({ id: 'a', name: 'A', quantity: 2.5, unit_price_cents: 101 })).toBe(253) // 252.5 → 253
  })

  it('floors negative or missing quantity/price to 0 (never a negative line)', () => {
    expect(computeLineItemSubtotal({ id: 'a', name: 'A', quantity: -3, unit_price_cents: 1000 })).toBe(0)
    expect(computeLineItemSubtotal({ id: 'a', name: 'A', quantity: 3, unit_price_cents: -1000 })).toBe(0)
    expect(computeLineItemSubtotal({ id: 'a', name: 'A', quantity: NaN as unknown as number, unit_price_cents: 500 })).toBe(0)
  })
})

describe('normalizeLineItems', () => {
  it('drops empty rows (no name and no quantity) but keeps real ones', () => {
    const out = normalizeLineItems([
      { name: 'Deep clean', quantity: 1, unit_price_cents: 20000 },
      {}, // dropped
      { quantity: 2, unit_price_cents: 500 }, // kept (has quantity)
    ])
    expect(out).toHaveLength(2)
    expect(out[0].subtotal_cents).toBe(20000)
    expect(out[1].subtotal_cents).toBe(1000)
  })

  it('recomputes subtotal from qty*price rather than trusting a supplied subtotal', () => {
    const [item] = normalizeLineItems([
      { name: 'X', quantity: 4, unit_price_cents: 250, subtotal_cents: 999999 },
    ])
    expect(item.subtotal_cents).toBe(1000)
  })

  it('non-optional items are always selected; optional items default to NOT selected', () => {
    const out = normalizeLineItems([
      { name: 'Base', quantity: 1, unit_price_cents: 100 },
      { name: 'Add-on', quantity: 1, unit_price_cents: 100, optional: true },
      { name: 'Chosen add-on', quantity: 1, unit_price_cents: 100, optional: true, selected: true },
    ])
    expect(out[0].selected).toBe(true)
    expect(out[1].selected).toBe(false)
    expect(out[2].selected).toBe(true)
  })

  it('coerces garbage qty/price to 0 instead of NaN', () => {
    const [item] = normalizeLineItems([
      { name: 'X', quantity: 'oops' as unknown as number, unit_price_cents: 'bad' as unknown as number },
    ])
    expect(item.quantity).toBe(0)
    expect(item.unit_price_cents).toBe(0)
    expect(item.subtotal_cents).toBe(0)
  })
})

describe('computeTotals', () => {
  it('sums only selected line items — unselected optional add-ons are not charged', () => {
    const items = [
      li({ subtotal_cents: 20000, selected: true }),
      li({ subtotal_cents: 5000, optional: true, selected: false }),
    ]
    const t = computeTotals(items, 0, 0)
    expect(t.subtotal_cents).toBe(20000)
  })

  it('applies tax only to the post-discount taxable base', () => {
    const items = [li({ subtotal_cents: 10000, selected: true })]
    // 888 bps = 8.88%. discount 2000 → taxable 8000 → tax round(8000*888/10000)=710.
    const t = computeTotals(items, 888, 2000)
    expect(t.subtotal_cents).toBe(10000)
    expect(t.discount_cents).toBe(2000)
    expect(t.tax_cents).toBe(710)
    expect(t.total_cents).toBe(8710)
  })

  it('clamps an over-large discount to the subtotal — total floors at 0, never negative', () => {
    const items = [li({ subtotal_cents: 10000, selected: true })]
    const t = computeTotals(items, 888, 999999)
    expect(t.discount_cents).toBe(10000) // clamped
    expect(t.tax_cents).toBe(0) // taxable base is 0
    expect(t.total_cents).toBe(0)
  })

  it('clamps a negative discount up to 0 (no phantom surcharge)', () => {
    const items = [li({ subtotal_cents: 10000, selected: true })]
    const t = computeTotals(items, 0, -5000)
    expect(t.discount_cents).toBe(0)
    expect(t.total_cents).toBe(10000)
  })

  it('treats missing selected (undefined) as selected — only an explicit false excludes', () => {
    const items = [li({ subtotal_cents: 7000, selected: undefined })]
    expect(computeTotals(items, 0, 0).subtotal_cents).toBe(7000)
  })
})

describe('formatCents / formatBpsAsPct', () => {
  it('formats cents as USD currency', () => {
    expect(formatCents(123456)).toBe('$1,234.56')
    expect(formatCents(0)).toBe('$0.00')
  })

  it('renders whole-percent bps without decimals and fractional bps with precision', () => {
    expect(formatBpsAsPct(800)).toBe('8%')
    expect(formatBpsAsPct(888)).toBe('8.880%')
    expect(formatBpsAsPct(0)).toBe('0%')
  })
})
