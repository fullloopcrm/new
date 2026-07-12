import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/bank-transactions (converted to tenantDb).
 *
 * The list reads `bank_transactions` through tenantDb, so a foreign tenant's
 * transactions never appear in this tenant's review/categorization UI.
 * Probe: a tenant-B transaction is filtered out — only the acting tenant's row
 * comes back.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))

import { GET } from './route'

function seed() {
  return {
    bank_transactions: [
      { id: 'txn-a', tenant_id: A, txn_date: '2026-07-01', status: 'unreviewed', amount_cents: 1000 },
      { id: 'txn-b', tenant_id: B, txn_date: '2026-07-02', status: 'unreviewed', amount_cents: 9999 },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/bank-transactions GET — tenant isolation', () => {
  it("returns only the acting tenant's transactions, never a foreign tenant's row", async () => {
    const res = await GET(new Request('http://t/api/finance/bank-transactions'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.transactions as Array<{ id: string }>).map((t) => t.id)
    expect(ids).toEqual(['txn-a'])
    expect(ids).not.toContain('txn-b')
  })
})
