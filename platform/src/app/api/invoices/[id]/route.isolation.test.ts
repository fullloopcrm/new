import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/invoices/[id] (converted to tenantDb).
 *
 * The route reads an invoice by id via tenantDb (which injects
 * `.eq('tenant_id', ctx)`) plus an explicit `.eq('tenant_id', tenantId)`.
 * An invoice that exists but belongs to ANOTHER tenant must never surface: the
 * `.single()` finds no row, the route re-throws PGRST116, and the caller gets a
 * generic failure — the foreign row is never in the body. That is the probe.
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
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    invoices: [
      { id: 'inv-a', tenant_id: CTX_TENANT, status: 'draft', total_cents: 5000 },
      { id: 'inv-b', tenant_id: OTHER_TENANT, status: 'draft', total_cents: 9999 },
    ],
    invoice_activity: [],
    payments: [],
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

describe('invoices/[id] GET — tenant isolation', () => {
  it('positive control: tenant A can read its OWN invoice', async () => {
    const res = await GET(new Request('http://t/api/invoices/inv-a'), ctx('inv-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.invoice.id).toBe('inv-a')
    expect(body.invoice.tenant_id).toBe(CTX_TENANT)
  })

  it("wrong-tenant probe: fetching tenant B's invoice never returns the row", async () => {
    const res = await GET(new Request('http://t/api/invoices/inv-b'), ctx('inv-b'))
    expect(res.status).not.toBe(200)
    const body = await res.json()
    expect(body.invoice).toBeUndefined()
  })
})
