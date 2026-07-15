import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key injection on POST /api/finance/cpa-tokens.
 * FIXED. `entity_id` is now verified tenant-owned (`.eq('id',...).eq('tenant_id',
 * tenantId)`) before insert, 404 on miss. Same class as the finance entity_id
 * fixes in the leak register (bank-accounts/expenses/periods).
 *
 * `entities` (migration 034) carries its own `tenant_id` with no cross-tenant FK
 * check on `cpa_access_tokens.entity_id`. A foreign entity_id here would let a
 * CPA-access token mint against another tenant's entity, and GET
 * /api/finance/cpa-tokens embeds `entities(name)` off that FK unscoped — the
 * foreign entity's name surfaces back to the attacker's tenant on the next list.
 *
 * LOCK: proves a foreign entity_id is rejected (404) before any insert.
 * CONTROL: proves the omitted/own-tenant paths still work.
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
  return { AuthError }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { POST } from './route'

function seed() {
  return {
    cpa_access_tokens: [] as Record<string, unknown>[],
    entities: [
      { id: 'entity-a', tenant_id: CTX_TENANT, name: 'A-Entity' },
      { id: 'entity-b', tenant_id: OTHER_TENANT, name: 'B-Entity' },
    ],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://x/api/finance/cpa-tokens', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/cpa-tokens POST — cross-tenant entity_id FK injection WITNESS', () => {
  it('LOCK: a foreign entity_id is rejected (404), no cpa_access_tokens row created', async () => {
    const res = await POST(postReq({ entity_id: 'entity-b', cpa_name: 'Attacker CPA' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'cpa_access_tokens')).toBeUndefined()
  })

  it('CONTROL: omitting entity_id stamps a null entity_id (safe path)', async () => {
    const res = await POST(postReq({ cpa_name: 'Our CPA' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'cpa_access_tokens')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBeNull()
  })

  it("CONTROL: explicit own-tenant entity_id passes the ownership check", async () => {
    const res = await POST(postReq({ entity_id: 'entity-a', cpa_name: 'Our CPA' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'cpa_access_tokens')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBe('entity-a')
  })
})
