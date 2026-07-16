/**
 * POST /api/invoices — retry-on-conflict for invoice_number.
 *
 * idx_invoices_tenant_number (027_invoices.sql) uniquely constrains
 * (tenant_id, invoice_number). generateInvoiceNumber() is a non-atomic
 * SELECT-count()+1 (not a DB sequence), so two concurrent creates in the
 * same tenant+month can both compute the same number and race to insert.
 * Pre-fix, the loser's raw 23505 was rethrown as an unhandled 500 (same
 * class as the sibling POST /api/quotes fix). This verifies the route
 * instead regenerates and retries when the collided number was
 * auto-generated, and returns a clean 409 (no silent renumbering) when the
 * caller explicitly supplied the colliding number.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  store: { invoices: [] as Array<Record<string, unknown>> },
  requirePermission: vi.fn(),
}))

function conflictError() {
  return { code: '23505', message: 'duplicate key value violates unique constraint "idx_invoices_tenant_number"' }
}

vi.mock('@/lib/supabase', () => {
  const fake = {
    from(table: string) {
      let payload: Record<string, unknown> | undefined
      const chain = {
        insert(p: Record<string, unknown>) {
          payload = p
          return chain
        },
        select: () => chain,
        eq: () => chain,
        single: async () => {
          if (table !== 'invoices') return { data: null, error: null }
          const dup = h.store.invoices.find(
            (r) => r.tenant_id === payload!.tenant_id && r.invoice_number === payload!.invoice_number,
          )
          if (dup) return { data: null, error: conflictError() }
          const row = { id: `invoice-${h.store.invoices.length + 1}`, ...payload }
          h.store.invoices.push(row)
          return { data: row, error: null }
        },
        maybeSingle: async () => ({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/entity', () => ({
  getDefaultEntityId: vi.fn(async () => null),
  entityIdFromUrl: () => null,
}))
vi.mock('@/lib/invoice', () => ({
  normalizeLineItems: (items: unknown) => items,
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  generateInvoicePublicToken: () => `tok_${Math.random()}`,
  generateInvoiceNumber: vi.fn(),
  logInvoiceEvent: vi.fn(async () => {}),
}))

import { POST } from './route'
import { generateInvoiceNumber } from '@/lib/invoice'

const TENANT_A = 'tenant-A'
const postReq = (body: unknown = {}) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store.invoices = [{ id: 'existing', tenant_id: TENANT_A, invoice_number: 'INV-0001' }]
  vi.mocked(generateInvoiceNumber).mockReset()
})

describe('POST /api/invoices — invoice_number conflict handling', () => {
  it('regenerates and retries when an auto-generated invoice_number collides', async () => {
    vi.mocked(generateInvoiceNumber)
      .mockResolvedValueOnce('INV-0001') // collides with the seeded row
      .mockResolvedValueOnce('INV-0002') // retry succeeds

    const res = await POST(postReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.invoice.invoice_number).toBe('INV-0002')
    expect(h.store.invoices).toHaveLength(2)
    expect(generateInvoiceNumber).toHaveBeenCalledTimes(2)
  })

  it('returns 409 without renumbering when the caller explicitly supplies a colliding invoice_number', async () => {
    const res = await POST(postReq({ invoice_number: 'INV-0001' }))

    expect(res.status).toBe(409)
    expect(h.store.invoices).toHaveLength(1)
    expect(generateInvoiceNumber).not.toHaveBeenCalled()
  })
})
