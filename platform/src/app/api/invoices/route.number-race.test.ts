/**
 * INVOICE NUMBER RACE — POST /api/invoices number-generation TOCTOU.
 *
 * generateInvoiceNumber() derives the next invoice_number from a COUNT()
 * snapshot of the tenant's invoices this month (src/lib/invoice.ts). Two
 * concurrent creates that both read the same count compute the SAME
 * invoice_number; the (tenant_id, invoice_number) unique index then rejects
 * the second insert outright (023_invoices.sql idx_invoices_tenant_number),
 * so a legitimate concurrent request 500'd instead of just getting the next
 * number.
 *
 * Fix: on a 23505 unique violation, retry with a freshly generated number
 * (only when the caller didn't explicitly supply invoice_number — an
 * explicit duplicate is a real conflict, not a race, and should still
 * error). This test forces the exact race window: the first generated
 * number collides with a row that lands "concurrently" between the count
 * read and the insert, and proves the request still succeeds with a
 * distinct number instead of surfacing a 500.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('invoices', 'invoice_number')
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_ID }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

let generateCalls = 0
vi.mock('@/lib/invoice', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/invoice')>()
  return {
    ...original,
    generateInvoiceNumber: vi.fn(async () => {
      generateCalls++
      if (generateCalls === 1) {
        // Simulate a concurrent request's insert landing in the exact
        // count-read -> insert window this generator has no lock across.
        const { supabaseAdmin } = await import('@/lib/supabase')
        await (supabaseAdmin as unknown as FakeSupabase).from('invoices').insert({
          tenant_id: TENANT_ID,
          invoice_number: 'INV-RACE-0001',
          status: 'draft',
        })
        return 'INV-RACE-0001'
      }
      return 'INV-RACE-0002'
    }),
  }
})

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function createRequest(body: Record<string, unknown> = {}) {
  return new Request('http://x/api/invoices', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/invoices — invoice_number generation race', () => {
  it('retries with a fresh number instead of 500ing on a concurrent-number collision', async () => {
    const res = await POST(
      createRequest({ line_items: [{ name: 'Test', quantity: 1, unit_price_cents: 1000 }] }),
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.error).toBeUndefined()
    expect(body.invoice.invoice_number).toBe('INV-RACE-0002')

    const invoices = fake._all('invoices')
    expect(invoices.length).toBe(2) // the "concurrent winner" + this request's own row
    const numbers = invoices.map((i) => i.invoice_number)
    expect(new Set(numbers).size).toBe(2) // no duplicate invoice_number made it into the store
  })

  it('does not retry when the caller explicitly supplies invoice_number (real conflict surfaces as an error)', async () => {
    fake._seed('invoices', [{ tenant_id: TENANT_ID, invoice_number: 'INV-MANUAL-0001', status: 'draft' }])

    const res = await POST(
      createRequest({
        invoice_number: 'INV-MANUAL-0001',
        line_items: [{ name: 'Test', quantity: 1, unit_price_cents: 1000 }],
      }),
    )
    expect(res.status).toBe(500)
  })
})
