import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — PATCH /api/finance/bank-transactions/[id] (converted to tenantDb).
 *
 * The route loads the transaction by id via tenantDb, which injects
 * `.eq('tenant_id', ctx)`. A transaction that exists but belongs to ANOTHER
 * tenant must be indistinguishable from a non-existent one — the `.single()`
 * finds no row and the route 404s BEFORE any journal is posted or any row is
 * updated. That is the wrong-tenant probe on a 💰 money-moving surface.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

// Ledger writes touch the real DB — stub so the test stays hermetic. The probe
// path never reaches it (404 first); the positive path uses the 'ignored' branch
// which also returns before any journal is posted.
vi.mock('@/lib/ledger', () => ({
  postJournalEntry: vi.fn(async () => 'je-x'),
  normalizeDescription: (s: string) => s,
}))

import { PATCH } from './route'

function seed() {
  return {
    bank_transactions: [
      { id: 'txn-a', tenant_id: CTX_TENANT, status: 'pending', amount_cents: -5000, txn_date: '2026-07-01', description: 'A coffee' },
      { id: 'txn-b', tenant_id: OTHER_TENANT, status: 'pending', amount_cents: -9900, txn_date: '2026-07-01', description: 'B rent' },
    ],
    chart_of_accounts: [],
    categorization_patterns: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

function patch(id: string, body: unknown) {
  return PATCH(
    new Request('http://t/api/finance/bank-transactions/' + id, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    ctx(id),
  )
}

describe('finance/bank-transactions/[id] PATCH — tenant isolation', () => {
  it('positive control: tenant A can ignore its OWN transaction', async () => {
    const res = await patch('txn-a', { status: 'ignored' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    // The write landed on tenant A's row only.
    expect(h.capture.updates).toHaveLength(1)
    expect(h.capture.updates[0].matched.map((r) => r.id)).toEqual(['txn-a'])
  })

  it("wrong-tenant probe: PATCHing tenant B's transaction id returns 404, never mutates B", async () => {
    const res = await patch('txn-b', { status: 'ignored' })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
    // No update reached tenant B's row — the 404 guard fired first.
    expect(h.capture.updates).toHaveLength(0)
    expect(h.seed.bank_transactions.find((r) => r.id === 'txn-b')!.status).toBe('pending')
  })
})
