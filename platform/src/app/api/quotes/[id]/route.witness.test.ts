import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant client_id FK injection on PATCH /api/quotes/[id].
 *
 * `client_id` is in the PATCH allow-list (assignables), but until this fix
 * no ownership check ran before the update — a caller could repoint their OWN
 * quote at ANOTHER tenant's client_id. GET /api/quotes/[id] embeds
 * `clients(id, name, email, phone, address)` off the row, so the foreign
 * client's PII would surface back to the attacker's tenant on the next read.
 * Same class as the deals/[id] and invoices/[id] client_id FK-injection fix.
 *
 * FIXED: a caller-supplied client_id is now verified tenant-owned
 * (`db.from('clients')...maybeSingle()`, tenantDb auto-scopes by tenant_id)
 * before the update runs; 404 on miss.
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

import { PATCH } from './route'

function seed() {
  return {
    quotes: [
      { id: 'q-a', tenant_id: CTX_TENANT, status: 'draft', total_cents: 4200, client_id: 'client-a' },
    ],
    clients: [
      { id: 'client-a', tenant_id: CTX_TENANT, name: 'A Client' },
      { id: 'client-b', tenant_id: OTHER_TENANT, name: 'B Client' },
    ],
    quote_activity: [],
  }
}

function patchReq(body: unknown): Request {
  return { url: 'http://t/api/quotes/q-a', json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('quotes/[id] PATCH — client_id FK injection WITNESS', () => {
  it('LOCK: a foreign client_id is rejected (404), quote untouched', async () => {
    const res = await PATCH(patchReq({ client_id: 'client-b' }), ctx('q-a'))
    expect(res.status).toBe(404)

    const upd = h.capture.updates.find((u) => u.table === 'quotes')
    expect(upd).toBeFalsy()
    const row = h.seed.quotes.find((r) => r.id === 'q-a')!
    expect(row.client_id).toBe('client-a')
  })

  it('CONTROL: an explicit own-tenant client_id passes the ownership check', async () => {
    const res = await PATCH(patchReq({ client_id: 'client-a', title: 'Updated', silent: true }), ctx('q-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'quotes')
    expect(upd!.matched[0].client_id).toBe('client-a')
    expect(upd!.matched[0].title).toBe('Updated')
  })

  it('CONTROL: omitting client_id still allows an unrelated field update', async () => {
    const res = await PATCH(patchReq({ title: 'Renamed', silent: true }), ctx('q-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'quotes')
    expect(upd!.matched[0].title).toBe('Renamed')
  })
})
