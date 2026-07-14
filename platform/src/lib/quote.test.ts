import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * quote.ts — quote money math, numbering, token generation, activity logging.
 *
 * Load-bearing invariants under test:
 *   - computeLineItemSubtotal / normalizeLineItems / computeTotals are the
 *     charge math: qty×price rounding, negative clamping, discount clamped to
 *     [0, subtotal], tax = round(taxable × bps / 10000), and unselected line
 *     items excluded from the subtotal. A drift here mis-bills a customer.
 *   - generateQuoteNumber emits Q-YYYYMM-NNNN with NNNN = (this-month count)+1,
 *     zero-padded to 4 — pinned so numbering can't silently collide/shift.
 *   - generatePublicToken is a url-safe, unpadded, non-repeating token.
 *   - formatCents / formatBpsAsPct display helpers stay stable.
 *
 * supabaseAdmin is built from @supabase/supabase-js's createClient at import
 * time; we mock createClient so the DB-backed helpers get controllable results.
 * Same pattern as ledger.test.ts / rate-limit-db.test.ts.
 */

let chainResult: { data?: unknown; count?: number | null; error?: unknown }
const insertSpy = vi.fn()

function makeBuilder() {
  const b: Record<string, unknown> = {}
  const self = () => b
  b.select = vi.fn(self)
  b.eq = vi.fn(self)
  b.gte = vi.fn(self)
  b.lt = vi.fn(self)
  b.insert = vi.fn((rows: unknown) => { insertSpy(rows); return b })
  // Thenable: any `await builder` resolves to chainResult (carries `count`).
  b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(chainResult).then(res, rej)
  return b
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => makeBuilder(),
  }),
}))

import {
  computeLineItemSubtotal,
  normalizeLineItems,
  computeTotals,
  generatePublicToken,
  generateQuoteNumber,
  logQuoteEvent,
  formatCents,
  formatBpsAsPct,
  type QuoteLineItem,
} from './quote'

beforeEach(() => {
  chainResult = { data: null, count: null, error: null }
  insertSpy.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('computeLineItemSubtotal', () => {
  it('multiplies quantity by unit price', () => {
    expect(computeLineItemSubtotal({ id: 'x', name: 'a', quantity: 3, unit_price_cents: 500 })).toBe(1500)
  })

  it('rounds fractional products to the nearest cent', () => {
    expect(computeLineItemSubtotal({ id: 'x', name: 'a', quantity: 1.5, unit_price_cents: 333 })).toBe(500) // 499.5 -> 500
  })

  it('clamps negative quantity and price to zero', () => {
    expect(computeLineItemSubtotal({ id: 'x', name: 'a', quantity: -4, unit_price_cents: 500 })).toBe(0)
    expect(computeLineItemSubtotal({ id: 'x', name: 'a', quantity: 4, unit_price_cents: -500 })).toBe(0)
  })

  it('treats missing/NaN quantity or price as zero', () => {
    expect(computeLineItemSubtotal({ id: 'x', name: 'a', quantity: NaN, unit_price_cents: 500 })).toBe(0)
    expect(computeLineItemSubtotal({ id: 'x', name: 'a', quantity: 2, unit_price_cents: undefined as unknown as number })).toBe(0)
  })
})

describe('normalizeLineItems', () => {
  it('returns [] for null/undefined input', () => {
    expect(normalizeLineItems(null as unknown as [])).toEqual([])
    expect(normalizeLineItems(undefined as unknown as [])).toEqual([])
  })

  it('drops entries with neither a name nor a quantity', () => {
    const out = normalizeLineItems([{ description: 'ghost' }, { name: 'keep', quantity: 1, unit_price_cents: 100 }])
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('keep')
  })

  it('coerces string quantity/price to numbers and computes subtotal', () => {
    const out = normalizeLineItems([{ name: 'a', quantity: '2' as unknown as number, unit_price_cents: '250' as unknown as number }])
    expect(out[0].quantity).toBe(2)
    expect(out[0].unit_price_cents).toBe(250)
    expect(out[0].subtotal_cents).toBe(500)
  })

  it('defaults name to "Item" and generates an id when absent', () => {
    const out = normalizeLineItems([{ quantity: 1 }])
    expect(out[0].name).toBe('Item')
    expect(out[0].id).toMatch(/^li_0_/)
  })

  it('preserves a provided id', () => {
    const out = normalizeLineItems([{ id: 'fixed', name: 'a', quantity: 1 }])
    expect(out[0].id).toBe('fixed')
  })

  it('a non-optional item is always selected; optional keeps its selected flag', () => {
    const out = normalizeLineItems([
      { name: 'base', quantity: 1 },
      { name: 'addon-on', quantity: 1, optional: true, selected: true },
      { name: 'addon-off', quantity: 1, optional: true, selected: false },
    ])
    expect(out[0].selected).toBe(true)   // non-optional -> forced selected
    expect(out[1].selected).toBe(true)   // optional + selected
    expect(out[2].selected).toBe(false)  // optional + unselected
  })

  it('optional item with no selected flag defaults to not selected', () => {
    const out = normalizeLineItems([{ name: 'addon', quantity: 1, optional: true }])
    expect(out[0].optional).toBe(true)
    expect(out[0].selected).toBe(false)
  })

  it('omits description when not provided', () => {
    const out = normalizeLineItems([{ name: 'a', quantity: 1 }])
    expect(out[0].description).toBeUndefined()
  })
})

describe('computeTotals', () => {
  const items = (partials: Partial<QuoteLineItem>[]): QuoteLineItem[] => normalizeLineItems(partials)

  it('sums selected line-item subtotals', () => {
    const t = computeTotals(items([{ name: 'a', quantity: 2, unit_price_cents: 500 }, { name: 'b', quantity: 1, unit_price_cents: 1000 }]), 0, 0)
    expect(t.subtotal_cents).toBe(2000)
    expect(t.total_cents).toBe(2000)
  })

  it('excludes unselected (optional deselected) items from the subtotal', () => {
    const t = computeTotals(items([
      { name: 'base', quantity: 1, unit_price_cents: 1000 },
      { name: 'addon', quantity: 1, unit_price_cents: 5000, optional: true, selected: false },
    ]), 0, 0)
    expect(t.subtotal_cents).toBe(1000)
  })

  it('applies tax in basis points on the post-discount amount', () => {
    // subtotal 10000, discount 0, tax 8.75% = 875 bps -> round(10000*875/10000)=875
    const t = computeTotals(items([{ name: 'a', quantity: 1, unit_price_cents: 10000 }]), 875, 0)
    expect(t.tax_cents).toBe(875)
    expect(t.total_cents).toBe(10875)
  })

  it('taxes the amount after discount, not before', () => {
    // subtotal 10000, discount 2000 -> taxable 8000, tax 10% (1000 bps) = 800
    const t = computeTotals(items([{ name: 'a', quantity: 1, unit_price_cents: 10000 }]), 1000, 2000)
    expect(t.discount_cents).toBe(2000)
    expect(t.tax_cents).toBe(800)
    expect(t.total_cents).toBe(8800)
  })

  it('clamps a discount larger than the subtotal down to the subtotal', () => {
    const t = computeTotals(items([{ name: 'a', quantity: 1, unit_price_cents: 3000 }]), 0, 999999)
    expect(t.discount_cents).toBe(3000)
    expect(t.total_cents).toBe(0)
  })

  it('clamps a negative discount up to zero', () => {
    const t = computeTotals(items([{ name: 'a', quantity: 1, unit_price_cents: 3000 }]), 0, -500)
    expect(t.discount_cents).toBe(0)
    expect(t.total_cents).toBe(3000)
  })

  it('rounds tax to the nearest cent', () => {
    // subtotal 333, tax 10% (1000 bps) -> 33.3 -> 33
    const t = computeTotals(items([{ name: 'a', quantity: 1, unit_price_cents: 333 }]), 1000, 0)
    expect(t.tax_cents).toBe(33)
  })

  it('handles an empty line-item list as all zeros', () => {
    const t = computeTotals([], 875, 500)
    expect(t).toEqual({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 })
  })
})

describe('generatePublicToken', () => {
  it('produces a url-safe, unpadded token', () => {
    const tok = generatePublicToken()
    expect(tok).toMatch(/^[A-Za-z0-9_-]+$/) // base64url alphabet, no +,/,=
    expect(tok).not.toContain('=')
  })

  it('encodes 24 bytes as 32 base64url chars', () => {
    expect(generatePublicToken()).toHaveLength(32)
  })

  it('is effectively unique across calls', () => {
    expect(generatePublicToken()).not.toBe(generatePublicToken())
  })
})

describe('generateQuoteNumber', () => {
  const prefix = (): string => {
    const now = new Date()
    return `Q-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  }

  it('matches the Q-YYYYMM-NNNN shape', async () => {
    chainResult = { count: 0 }
    expect(await generateQuoteNumber('t1')).toMatch(/^Q-\d{6}-\d{4}$/)
  })

  it('uses (this-month count)+1, zero-padded to four digits', async () => {
    chainResult = { count: 6 }
    expect(await generateQuoteNumber('t1')).toBe(`${prefix()}-0007`)
  })

  it('treats a null count as zero -> first quote is 0001', async () => {
    chainResult = { count: null }
    expect(await generateQuoteNumber('t1')).toBe(`${prefix()}-0001`)
  })

  it('does not truncate a count past 9999', async () => {
    chainResult = { count: 9999 }
    expect(await generateQuoteNumber('t1')).toBe(`${prefix()}-10000`)
  })
})

describe('logQuoteEvent', () => {
  it('inserts a normalized activity row, nulling optional fields', async () => {
    await logQuoteEvent({ quote_id: 'q1', tenant_id: 't1', event_type: 'accepted' })
    expect(insertSpy).toHaveBeenCalledTimes(1)
    expect(insertSpy).toHaveBeenCalledWith({
      quote_id: 'q1',
      tenant_id: 't1',
      event_type: 'accepted',
      detail: null,
      ip_address: null,
      user_agent: null,
    })
  })

  it('passes through detail, ip_address and user_agent when provided', async () => {
    await logQuoteEvent({
      quote_id: 'q2', tenant_id: 't2', event_type: 'viewed',
      detail: { via: 'link' }, ip_address: '1.2.3.4', user_agent: 'UA',
    })
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      detail: { via: 'link' }, ip_address: '1.2.3.4', user_agent: 'UA',
    }))
  })
})

describe('formatCents', () => {
  it('formats cents as USD currency', () => {
    expect(formatCents(123456)).toBe('$1,234.56')
    expect(formatCents(0)).toBe('$0.00')
  })

  it('treats null/undefined as zero', () => {
    expect(formatCents(null as unknown as number)).toBe('$0.00')
  })

  it('formats negatives with a leading minus', () => {
    expect(formatCents(-500)).toBe('-$5.00')
  })
})

describe('formatBpsAsPct', () => {
  it('renders a whole-number percent with no decimals', () => {
    expect(formatBpsAsPct(200)).toBe('2%')   // 200 bps -> 2%
    expect(formatBpsAsPct(0)).toBe('0%')
  })

  it('renders a fractional percent with three decimals', () => {
    expect(formatBpsAsPct(875)).toBe('8.750%') // 875 bps -> 8.75%
    expect(formatBpsAsPct(250)).toBe('2.500%')
  })

  it('treats null/undefined as zero', () => {
    expect(formatBpsAsPct(undefined as unknown as number)).toBe('0%')
  })
})
