import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/onboarding/profile — broad-hunt: GET/PUT/POST (business
 * identity incl. EIN, licensing/insurance, brand + contact info) had zero
 * permission check, only base tenant auth via getTenantForRequest(). Any
 * authenticated tenant member of any role could read or overwrite this
 * sensitive setup data. Gated on 'settings.edit' (owner/admin only).
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { selena_config: null }, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, PUT, POST } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const postReq = (data: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify({ data }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme A', selena_config: {}, compliance: {} }],
    entities: [{ id: 'ent-A1', tenant_id: 'tenant-A', is_default: true, active: true, name: 'Acme A LLC', legal_name: 'Acme A Holdings LLC' }],
  }
})

describe('/api/dashboard/onboarding/profile — settings.edit permission', () => {
  it('GET rejects a staff member', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('PUT rejects a staff member, draft untouched', async () => {
    const res = await PUT(putReq({ draft: { businessName: 'hijacked' } }))
    expect(res.status).toBe(403)
    expect(h.store.tenants[0].onboarding_draft).toBeUndefined()
  })

  it('POST rejects a staff member, entity untouched', async () => {
    const res = await POST(postReq({ legalName: 'hijacked llc' }))
    expect(res.status).toBe(403)
    expect(h.store.entities[0].legal_name).toBe('Acme A Holdings LLC')
  })

  it('an owner passes all three', async () => {
    h.role = 'owner'
    expect((await GET()).status).toBe(200)
    expect((await PUT(putReq({ draft: {} }))).status).toBe(200)
    expect((await POST(postReq({ legalName: 'Acme A Updated LLC' }))).status).toBe(200)
    expect(h.store.entities[0].legal_name).toBe('Acme A Updated LLC')
  })
})
