import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generateInvoiceNumber / generateQuoteNumber — duplicate-number TOCTOU race.
 *
 * BUG (fixed here): both derived NNNN from `SELECT COUNT(*) this month` then
 * appended `count + 1` — two concurrent creates for the same tenant/month
 * could both read the same count and both mint the SAME invoice/quote number
 * (no unique constraint catches it; migrations/2026_07_13_document_number_atomic.sql).
 *
 * FIX: one atomic supabaseAdmin.rpc('next_document_number', ...) per call,
 * backed by an INSERT ... ON CONFLICT DO UPDATE counter row. This test's fake
 * `rpc` models that contract — a single synchronous read-increment-write
 * against shared per-(tenant, doc_type, period) counter state, no `await` in
 * between — mirroring the DB function's row-lock atomicity. Firing many
 * concurrent calls via Promise.all proves every one gets a distinct sequence
 * number, which the old count-then-append code could not guarantee.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({
  counters: new Map<string, number>(),
}))

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'next_document_number') throw new Error(`unexpected rpc: ${fn}`)
      const key = `${args.p_tenant_id}:${args.p_doc_type}:${args.p_period}`
      const next = (holder.counters.get(key) || 0) + 1
      holder.counters.set(key, next)
      return { data: next, error: null }
    },
  },
}))

import { generateInvoiceNumber } from './invoice'
import { generateQuoteNumber } from './quote'

beforeEach(() => {
  holder.counters.clear()
})

describe('generateInvoiceNumber — duplicate-number race closed', () => {
  it('20 concurrent calls for the same tenant/month all get distinct numbers', async () => {
    const numbers = await Promise.all(Array.from({ length: 20 }, () => generateInvoiceNumber(TENANT)))
    expect(new Set(numbers).size).toBe(20)
  })

  it('positive control: sequential calls increment 0001, 0002, 0003', async () => {
    const n1 = await generateInvoiceNumber(TENANT)
    const n2 = await generateInvoiceNumber(TENANT)
    const n3 = await generateInvoiceNumber(TENANT)
    expect(n1).toMatch(/-0001$/)
    expect(n2).toMatch(/-0002$/)
    expect(n3).toMatch(/-0003$/)
  })
})

describe('generateQuoteNumber — duplicate-number race closed', () => {
  it('20 concurrent calls for the same tenant/month all get distinct numbers', async () => {
    const numbers = await Promise.all(Array.from({ length: 20 }, () => generateQuoteNumber(TENANT)))
    expect(new Set(numbers).size).toBe(20)
  })

  it("invoice and quote sequences for the same tenant/month don't share a counter", async () => {
    const inv = await generateInvoiceNumber(TENANT)
    const quo = await generateQuoteNumber(TENANT)
    expect(inv).toMatch(/-0001$/)
    expect(quo).toMatch(/-0001$/) // independent doc_type counter, not shared with invoices
  })
})
