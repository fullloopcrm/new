import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/quotes/[id] (converted to tenantDb).
 *
 * Reads a quote by id via tenantDb + an explicit `.eq('tenant_id', tenantId)`.
 * A quote owned by another tenant must be indistinguishable from a missing one:
 * `.single()` matches nothing, PGRST116 re-throws, and the foreign row never
 * appears in the response body. That is the wrong-tenant probe.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t) },
}))

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

import { GET } from './route'

function seed() {
  return {
    quotes: [
      { id: 'q-a', tenant_id: CTX_TENANT, status: 'draft', total_cents: 4200 },
      { id: 'q-b', tenant_id: OTHER_TENANT, status: 'draft', total_cents: 8800 },
    ],
    quote_activity: [],
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

describe('quotes/[id] GET — tenant isolation', () => {
  it('positive control: tenant A can read its OWN quote', async () => {
    const res = await GET(new Request('http://t/api/quotes/q-a'), ctx('q-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.quote.id).toBe('q-a')
    expect(body.quote.tenant_id).toBe(CTX_TENANT)
  })

  it("wrong-tenant probe: fetching tenant B's quote never returns the row", async () => {
    const res = await GET(new Request('http://t/api/quotes/q-b'), ctx('q-b'))
    expect(res.status).not.toBe(200)
    const body = await res.json()
    expect(body.quote).toBeUndefined()
  })
})
