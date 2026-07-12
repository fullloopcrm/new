import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key INJECTION on POST /api/finance/expenses.
 *
 * HARD-tier, MONEY. This route is UNCONVERTED (raw `supabaseAdmin`) and inserts
 * a caller-supplied `body.entity_id` VERBATIM:
 *
 *     const entityId = body.entity_id || (await getDefaultEntityId(tenantId))
 *     supabaseAdmin.from('expenses').insert({ tenant_id: tenantId, entity_id: entityId, ... })
 *
 * The expense row is correctly stamped `tenant_id = <acting tenant>`, BUT nothing
 * verifies that `entity_id` belongs to the acting tenant. `entities` carries its
 * own `tenant_id` (migration 034), so passing tenant B's entity id makes tenant A's
 * expense reference B's legal/accounting entity — a cross-tenant reference write.
 *
 * Blast radius is not just a dangling id: finance read-sides embed `entities(name)`
 * off the parent row (e.g. GET /api/finance/periods, GET /api/finance/bank-accounts
 * both `select('*, entities(...)')`), so a foreign entity id can surface B's entity
 * NAME/identity back to A. Same shape as the P2/P3 invoice/quote FK-injection leaks
 * already in the register — this is the `entity_id` variant the §4 sweep did not cover.
 *
 * These tests assert the leak is CURRENTLY LIVE. When an ownership guard lands
 * (verify body.entity_id belongs to `tenantId` before insert, else 400/404), FLIP
 * the LEAK test to expect rejection — it becomes the regression lock.
 *
 * Mutation-safe / non-vacuous: the RED assertion reads the ACTUAL stored
 * `entity_id`; a guard that rejects or replaces a foreign id makes it fail. The
 * CONTROL proves the default-entity path stamps the caller's OWN entity, so the
 * LEAK assertion can only pass because the foreign id genuinely flowed through.
 */

const CTX_TENANT = 'tid-a' // attacker (the caller)
const OTHER_TENANT = 'tid-b' // victim

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

// DB-free stubs so the ONLY supabaseAdmin traffic reaching the harness is the
// route's own expenses insert. getDefaultEntityId returns the CALLER'S own entity
// so the control path is provably safe (see CONTROL). audit is a no-op.
vi.mock('@/lib/entity', () => ({
  getDefaultEntityId: vi.fn(async () => 'entity-a'),
  entityIdFromUrl: () => null,
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    expenses: [] as Record<string, unknown>[],
    entities: [
      { id: 'entity-a', tenant_id: CTX_TENANT, name: 'A-Entity' },
      { id: 'entity-b', tenant_id: OTHER_TENANT, name: 'B-Entity' },
    ],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://x/api/finance/expenses', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/expenses POST — cross-tenant entity_id FK injection WITNESS', () => {
  it("LEAK: a foreign entity_id from the body is stored on the acting tenant's expense", async () => {
    const res = await POST(postReq({ category: 'Supplies', amount: 10, entity_id: 'entity-b' }))
    expect(res.status).toBe(201)

    const ins = h.capture.inserts.find((i) => i.table === 'expenses')
    expect(ins).toBeTruthy()
    const row = ins!.rows[0]
    // Expense is stamped to tenant A …
    expect(row.tenant_id).toBe(CTX_TENANT)
    // … yet references tenant B's accounting entity — no ownership check ran.
    expect(row.entity_id).toBe('entity-b')
  })

  it('CONTROL: with no entity_id, the default resolves to the caller\'s OWN entity (safe path)', async () => {
    const res = await POST(postReq({ category: 'Supplies', amount: 10 }))
    expect(res.status).toBe(201)

    const row = h.capture.inserts.find((i) => i.table === 'expenses')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    // Default path stamps A's own entity — proving the LEAK above is the foreign id
    // flowing through, not the default.
    expect(row.entity_id).toBe('entity-a')
  })
})
