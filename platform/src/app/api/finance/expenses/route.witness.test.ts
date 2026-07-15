import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key injection on POST /api/finance/expenses.
 * FIXED (was proven-LIVE, register P5): `body.entity_id` is now verified
 * tenant-owned (`.eq('id',...).eq('tenant_id', tenantId)`) before insert, 404 on
 * miss.
 *
 * HARD-tier, MONEY. `entities` carries its own `tenant_id` (migration 034); a
 * foreign entity id would make tenant A's expense reference B's legal/accounting
 * entity, surfaced back on read via finance embeds of `entities(name)`.
 *
 * LOCK: proves a foreign entity_id is rejected (404) before any insert.
 * CONTROL: proves the default-entity path (own entity) still works.
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
  isEntityOwnedByTenant: vi.fn(async (tenantId: string, entityId: string) => {
    const seedEntities: Record<string, string> = { 'entity-a': CTX_TENANT, 'entity-b': OTHER_TENANT }
    return seedEntities[entityId] === tenantId
  }),
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
  it('LOCK: a foreign entity_id from the body is rejected (404), no expense row created', async () => {
    const res = await POST(postReq({ category: 'Supplies', amount: 10, entity_id: 'entity-b' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'expenses')).toBeUndefined()
  })

  it('CONTROL: with no entity_id, the default resolves to the caller\'s OWN entity (safe path)', async () => {
    const res = await POST(postReq({ category: 'Supplies', amount: 10 }))
    expect(res.status).toBe(201)

    const row = h.capture.inserts.find((i) => i.table === 'expenses')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    // Default path stamps A's own entity — proving the guard didn't just block
    // everything, it specifically rejects foreign ids.
    expect(row.entity_id).toBe('entity-a')
  })

  it('CONTROL: an explicit own-tenant entity_id passes the ownership check', async () => {
    const res = await POST(postReq({ category: 'Supplies', amount: 10, entity_id: 'entity-a' }))
    expect(res.status).toBe(201)

    const row = h.capture.inserts.find((i) => i.table === 'expenses')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBe('entity-a')
  })
})
