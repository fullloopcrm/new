import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key INJECTION on POST /api/finance/periods.
 *
 * HARD-tier, ACCOUNTING (`accounting_periods` — the month-close / period-lock ledger).
 * UNCONVERTED (raw `supabaseAdmin`). The row is stamped `tenant_id = <acting tenant>`,
 * but `body.entity_id` is UPSERTED VERBATIM with no ownership check:
 *
 *     supabaseAdmin.from('accounting_periods').upsert({
 *       tenant_id: tenantId, entity_id: body.entity_id || null, year, month, ...
 *     }, { onConflict: 'tenant_id,entity_id,year,month' })
 *
 * `entities` carries its own `tenant_id` (migration 034) and `accounting_periods.entity_id`
 * is an FK into it (migration 035), so passing tenant B's entity id creates an accounting
 * period in A that is scoped to B's entity. Because the on-conflict key includes
 * `entity_id`, a foreign entity id also opens a DISTINCT period row A can't otherwise
 * reach — and GET /api/finance/periods embeds `entities(name)`, surfacing B's entity
 * name back to A on read-back.
 *
 * LIVE today. When a guard lands (verify body.entity_id belongs to `tenantId` before
 * upsert, else 400/404), FLIP the LEAK test to expect rejection.
 *
 * Non-vacuous: reads the ACTUAL upserted `entity_id`; the CONTROL proves the omitted
 * path stores a null entity_id, so the LEAK can only pass because the foreign id flowed.
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

vi.mock('@/lib/entity', () => ({ entityIdFromUrl: () => null }))

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
  it("LEAK: a foreign entity_id from the body scopes the acting tenant's accounting period to B's entity", async () => {
    const res = await POST(postReq({ year: 2026, month: 3, entity_id: 'entity-b' }))
    expect(res.status).toBe(200)

    const ins = h.capture.inserts.find((i) => i.table === 'accounting_periods')
    expect(ins).toBeTruthy()
    const row = ins!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    // Period is stamped to A but scoped to tenant B's entity — no ownership check ran.
    expect(row.entity_id).toBe('entity-b')
  })

  it('CONTROL: with no entity_id, the period is stored with a null entity_id (safe path)', async () => {
    const res = await POST(postReq({ year: 2026, month: 3 }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'accounting_periods')!.rows[0]
    expect(row.tenant_id).toBe(CTX_TENANT)
    expect(row.entity_id).toBeNull()
  })
})
