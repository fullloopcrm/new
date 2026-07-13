import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/onboarding/profile — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-c). Owner-facing onboarding wizard. The `entities` lookups
 * (GET prefill, POST default-entity resolve/insert/update) previously carried
 * their own manual `.eq('tenant_id', …)` filter; that filter now comes solely
 * from the wrapper — this proves it still holds.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' } }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST } from './route'

const postReq = (data: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify({ data }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme A', selena_config: {}, compliance: {} }],
    entities: [
      { id: 'ent-A1', tenant_id: 'tenant-A', is_default: true, name: 'Acme A LLC', legal_name: 'Acme A Holdings LLC' },
      { id: 'ent-B1', tenant_id: 'tenant-B', is_default: true, name: 'Acme B LLC', legal_name: 'Acme B Secret Holdings LLC' },
    ],
  }
})

describe('GET /api/dashboard/onboarding/profile — tenant isolation', () => {
  it("prefill never resolves another tenant's default entity", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.prefill.legalName).toBe('Acme A Holdings LLC')
    expect(JSON.stringify(json)).not.toContain('Secret')
  })

  it("tenant B's prefill resolves its own entity, not tenant A's (first row in the table)", async () => {
    h.tenantId = 'tenant-B'
    h.store.tenants.push({ id: 'tenant-B', name: 'Acme B', selena_config: {}, compliance: {} })

    const res = await GET()
    const json = await res.json()
    expect(json.prefill.legalName).toBe('Acme B Secret Holdings LLC')
  })
})

describe('POST /api/dashboard/onboarding/profile — tenant isolation', () => {
  it("submit updates tenant A's own default entity, never tenant B's", async () => {
    const res = await POST(postReq({ businessName: 'Acme A Updated', legalName: 'Acme A Updated LLC' }))
    expect(res.status).toBe(200)

    const entA = h.store.entities.find((e) => e.id === 'ent-A1')
    const entB = h.store.entities.find((e) => e.id === 'ent-B1')
    expect(entA?.legal_name).toBe('Acme A Updated LLC')
    expect(entB?.legal_name).toBe('Acme B Secret Holdings LLC')
  })

  it("submit for a tenant with no existing entity creates one stamped with its own tenant_id, not another tenant's default", async () => {
    h.tenantId = 'tenant-C'
    const res = await POST(postReq({ businessName: 'Acme C' }))
    expect(res.status).toBe(200)

    const created = h.store.entities.find((e) => e.name === 'Acme C')
    expect(created?.tenant_id).toBe('tenant-C')
    // Tenant A/B defaults must remain untouched.
    expect(h.store.entities.filter((e) => e.is_default).length).toBe(3)
  })
})
