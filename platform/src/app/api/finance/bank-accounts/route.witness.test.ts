import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key injection on POST /api/finance/bank-accounts.
 * FIXED (was proven-LIVE, register P4): both `entity_id` and `coa_id` are now
 * verified tenant-owned (`.eq('id',...).eq('tenant_id', tenantId)`) before insert,
 * 404 on either miss.
 *
 * HARD-tier, BANK (`bank_accounts`). Both `entities` (migration 034) and
 * `chart_of_accounts` (migration 032) carry their own `tenant_id`, so a foreign
 * `entity_id` / `coa_id` would link tenant A's bank account to B's entity/GL
 * account — surfaced back on read via the GET route's `entities()` /
 * `chart_of_accounts()` embeds.
 *
 * LOCK: proves a foreign entity_id or coa_id is rejected (404) before any insert.
 * CONTROL: proves the default/omitted path (own entity, null coa_id) still works.
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
  getDefaultEntityId: vi.fn(async () => 'entity-a'),
  entityIdFromUrl: () => null,
}))

import { POST } from './route'

function seed() {
  return {
    bank_accounts: [] as Record<string, unknown>[],
    entities: [
      { id: 'entity-a', tenant_id: CTX_TENANT, name: 'A-Entity' },
      { id: 'entity-b', tenant_id: OTHER_TENANT, name: 'B-Entity' },
    ],
    chart_of_accounts: [
      { id: 'coa-a', tenant_id: CTX_TENANT, code: '1010', name: 'A-Cash' },
      { id: 'coa-b', tenant_id: OTHER_TENANT, code: '1010', name: 'B-Cash' },
    ],
  }
}

function postReq(body: unknown): Request {
  return { url: 'http://x/api/finance/bank-accounts', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/bank-accounts POST — cross-tenant entity_id/coa_id FK injection WITNESS', () => {
  it('LOCK: a foreign entity_id is rejected (404), no bank_accounts row created', async () => {
    const res = await POST(postReq({ name: 'Ops Checking', entity_id: 'entity-b' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'bank_accounts')).toBeUndefined()
  })

  it('LOCK: a foreign coa_id is rejected (404), no bank_accounts row created', async () => {
    const res = await POST(postReq({ name: 'Ops Checking', coa_id: 'coa-b' }))
    expect(res.status).toBe(404)
    expect(h.capture.inserts.find((i) => i.table === 'bank_accounts')).toBeUndefined()
  })

  it("CONTROL: omitting both FKs stamps A's own default entity and a null coa_id (safe path)", async () => {
    const res = await POST(postReq({ name: 'Ops Checking' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'bank_accounts')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBe('entity-a')
    expect(row.coa_id).toBeNull()
  })

  it("CONTROL: explicit own-tenant entity_id + coa_id pass the ownership check", async () => {
    const res = await POST(postReq({ name: 'Ops Checking', entity_id: 'entity-a', coa_id: 'coa-a' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'bank_accounts')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBe('entity-a')
    expect(row.coa_id).toBe('coa-a')
  })
})
