import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — mass-assignment FK injection + row donation on PUT /api/finance/expenses/[id].
 *
 * HARD-tier, MONEY. Register P7. Was UNCONVERTED (raw `supabaseAdmin`) and spread the
 * ENTIRE request body into the row with no column allow-list:
 *
 *     supabaseAdmin.from('expenses').update(body).eq('id', id).eq('tenant_id', tenantId)
 *
 * The `.eq('tenant_id', tenantId)` filter DOES scope WHICH row is updated — so an
 * attacker cannot select another tenant's expense (proven by the CONTROL below).
 * BUT because the whole `body` was written, the caller controlled EVERY column on their
 * own row, including:
 *   • `entity_id` — repoint A's expense at tenant B's accounting entity (cross-tenant
 *     FK injection; `entities` carries its own tenant_id), and
 *   • `tenant_id` — overwrite the row's own tenant_id with B, DONATING A's expense
 *     into tenant B's books.
 *
 * FIXED: the route now allow-lists assignable columns (category, amount, description,
 * receipt_url, date, entity_id) — tenant_id is never accepted from the body — and
 * verifies a caller-supplied entity_id belongs to the tenant before the update runs.
 *
 * LOCK: proves a foreign entity_id is rejected (404) before any update, and that
 * tenant_id in the body is silently dropped (never reaches the row) on an otherwise
 * valid update.
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

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PUT } from './route'

function seed() {
  return {
    expenses: [
      { id: 'exp-a', tenant_id: CTX_TENANT, entity_id: 'entity-a', category: 'Supplies', amount: 500 },
      { id: 'exp-b', tenant_id: OTHER_TENANT, entity_id: 'entity-b', category: 'Rent', amount: 999 },
    ],
    entities: [
      { id: 'entity-a', tenant_id: CTX_TENANT, name: 'A-Entity' },
      { id: 'entity-b', tenant_id: OTHER_TENANT, name: 'B-Entity' },
    ],
  }
}

function putReq(body: unknown): Request {
  return { url: 'http://x/api/finance/expenses/x', json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/expenses/[id] PUT — mass-assignment FK injection + row donation WITNESS', () => {
  it('LOCK: a foreign entity_id is rejected (404), no update reaches the row', async () => {
    const res = await PUT(putReq({ entity_id: 'entity-b', tenant_id: OTHER_TENANT }), ctx('exp-a'))
    expect(res.status).toBe(404)

    const upd = h.capture.updates.find((u) => u.table === 'expenses')
    expect(upd).toBeFalsy()

    const row = h.seed.expenses.find((r) => r.id === 'exp-a')!
    expect(row.entity_id).toBe('entity-a')
    expect(row.tenant_id).toBe(CTX_TENANT)
  })

  it('LOCK: tenant_id in the body is dropped by the allow-list — an otherwise valid update never donates the row', async () => {
    const res = await PUT(putReq({ category: 'Updated', tenant_id: OTHER_TENANT }), ctx('exp-a'))
    expect(res.status).toBe(200)

    const upd = h.capture.updates.find((u) => u.table === 'expenses')
    expect(upd).toBeTruthy()
    const row = upd!.matched[0]
    expect(row.category).toBe('Updated')
    // tenant_id is not in the allow-list, so it stays the caller's own tenant.
    expect(row.tenant_id).toBe(CTX_TENANT)
  })

  it('CONTROL: an explicit own-tenant entity_id passes the ownership check', async () => {
    const res = await PUT(putReq({ entity_id: 'entity-a' }), ctx('exp-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'expenses')
    expect(upd!.matched[0].entity_id).toBe('entity-a')
  })

  it('CONTROL: the tenant_id filter blocks selecting a FOREIGN expense — B\'s row is never mutated', async () => {
    // Attempt to update tenant B's expense from tenant A's context.
    await PUT(putReq({ category: 'HIJACKED', amount: 1 }), ctx('exp-b'))

    // No row matched (`.eq('tenant_id', A)` excluded exp-b), so B's expense is untouched.
    const victim = h.seed.expenses.find((r) => r.id === 'exp-b')!
    expect(victim.category).toBe('Rent')
    expect(victim.amount).toBe(999)
    expect(victim.tenant_id).toBe(OTHER_TENANT)
  })
})
