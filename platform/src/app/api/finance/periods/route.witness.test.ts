import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key injection on POST /api/finance/periods.
 * FIXED (was proven-LIVE, register P6): `body.entity_id` is now verified
 * tenant-owned (`.eq('id',...).eq('tenant_id', tenantId)`) before upsert, 404 on
 * miss.
 *
 * HARD-tier, ACCOUNTING (`accounting_periods` — the month-close / period-lock
 * ledger). `entities` carries its own `tenant_id` (migration 034) and
 * `accounting_periods.entity_id` is an FK into it (migration 035); a foreign
 * entity id would scope A's period to B's entity, and — because the on-conflict
 * key includes `entity_id` — open a distinct row, surfacing B's entity name back
 * to A via the GET route's `entities(name)` embed.
 *
 * LOCK: proves a foreign entity_id is rejected (404) before any upsert.
 * CONTROL: proves the omitted path (null entity_id) still works.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

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

vi.mock('@/lib/entity', () => ({
  entityIdFromUrl: () => null,
  isEntityOwnedByTenant: vi.fn(async (tenantId: string, entityId: string) => {
    const seedEntities: Record<string, string> = { 'entity-a': CTX_TENANT, 'entity-b': OTHER_TENANT }
    return seedEntities[entityId] === tenantId
  }),
}))

import { POST } from './route'

function seed() {
  return {
    accounting_periods: [] as Record<string, unknown>[],
    entities: [
      { id: 'entity-a', tenant_id: CTX_TENANT, name: 'A-Entity' },
      { id: 'entity-b', tenant_id: OTHER_TENANT, name: 'B-Entity' },
    ],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://x/api/finance/periods', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/periods POST — cross-tenant entity_id FK injection WITNESS', () => {
  it('LOCK: a foreign entity_id from the body is rejected (404), no period row created', async () => {
    const res = await POST(postReq({ year: 2026, month: 3, entity_id: 'entity-b' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'accounting_periods')).toBeUndefined()
  })

  it('CONTROL: with no entity_id, the period is stored with a null entity_id (safe path)', async () => {
    const res = await POST(postReq({ year: 2026, month: 3 }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'accounting_periods')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBeNull()
  })

  it('CONTROL: an explicit own-tenant entity_id passes the ownership check', async () => {
    const res = await POST(postReq({ year: 2026, month: 3, entity_id: 'entity-a' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'accounting_periods')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBe('entity-a')
  })
})
