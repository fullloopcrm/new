import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key INJECTION on POST /api/finance/bank-accounts.
 *
 * HARD-tier, BANK (`bank_accounts`). UNCONVERTED (raw `supabaseAdmin`). The row is
 * stamped `tenant_id = <acting tenant>`, but TWO caller-supplied foreign keys are
 * inserted VERBATIM with no ownership check:
 *
 *     const entityId = body.entity_id || (await getDefaultEntityId(tenantId))
 *     supabaseAdmin.from('bank_accounts').insert({ tenant_id: tenantId, entity_id: entityId,
 *                                                  coa_id: body.coa_id || null, ... })
 *
 * Both `entities` (migration 034) and `chart_of_accounts` (migration 032) carry
 * their own `tenant_id`, so passing tenant B's `entity_id` / `coa_id` links tenant
 * A's bank account to B's entity and B's GL account. GET /api/finance/bank-accounts
 * embeds `entities(id, name)` and `chart_of_accounts(code, name, type)` off this row,
 * so a foreign id can surface B's entity/account identity back to A on read-back.
 *
 * This is the `entity_id` / `coa_id` FK-injection variant the register's §4 sweep
 * did not cover (it looked at client_id/booking_id/service_type_id only).
 *
 * LIVE today. When a guard lands (verify entity_id + coa_id belong to `tenantId`
 * before insert, else 400/404), FLIP the LEAK test to expect rejection.
 *
 * Non-vacuous: reads the ACTUAL stored `entity_id`/`coa_id`; the CONTROL proves the
 * default/omitted path stamps A's own entity and a null coa_id.
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
  it("LEAK: foreign entity_id + coa_id from the body land on the acting tenant's bank account", async () => {
    const res = await POST(postReq({ name: 'Ops Checking', entity_id: 'entity-b', coa_id: 'coa-b' }))
    expect(res.status).toBe(200)

    const ins = h.capture.inserts.find((i) => i.table === 'bank_accounts')
    expect(ins).toBeTruthy()
    const row = ins!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    // Both foreign FKs written verbatim — no ownership check ran on either.
    expect(row.entity_id).toBe('entity-b')
    expect(row.coa_id).toBe('coa-b')
  })

  it("CONTROL: omitting both FKs stamps A's own default entity and a null coa_id (safe path)", async () => {
    const res = await POST(postReq({ name: 'Ops Checking' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'bank_accounts')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBe('entity-a')
    expect(row.coa_id).toBeNull()
  })
})
