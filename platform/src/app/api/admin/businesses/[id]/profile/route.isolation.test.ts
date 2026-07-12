import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/businesses/[id]/profile — tenantDb() conversion wrong-tenant
 * probe (P1/W1 queue-a). The PATCH `entities` write is now scoped through
 * tenantDb(id) instead of a hand-written `.eq('tenant_id', id)` — verifying
 * a save for tenant A never touches tenant B's default entity row.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/tenant-profile', () => ({
  getTenantProfile: async () => null,
  routeProfileWrite: (incoming: Record<string, unknown>) => ({
    tenantCols: {},
    entityCols: incoming,
    selenaKeys: {},
    complianceKeys: {},
    ignored: [],
  }),
}))
vi.mock('@/lib/tenant-readiness', () => ({ computeReadiness: async () => ({ score: 1 }) }))
vi.mock('@/lib/entity-provision', () => ({ ensureDefaultEntity: async () => {} }))
vi.mock('@/lib/secret-crypto', () => ({ encryptTenantSecrets: (v: unknown) => v }))
vi.mock('@/lib/settings', () => ({ clearSettingsCache: () => {} }))

import { PATCH } from './route'

const params = (id: string) => Promise.resolve({ id })
const patchReq = (body: unknown) =>
  new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme A' }, { id: 'tenant-B', name: 'Acme B' }],
    entities: [
      { id: 'e-A1', tenant_id: 'tenant-A', is_default: true, phone: 'old-A' },
      { id: 'e-B1', tenant_id: 'tenant-B', is_default: true, phone: 'old-B' },
    ],
  }
})

describe('PATCH /api/admin/businesses/[id]/profile — tenant isolation', () => {
  it("saving tenant A's default entity does not touch tenant B's", async () => {
    const res = await PATCH(patchReq({ field: 'phone', value: 'new-A' }), { params: params('tenant-A') })
    expect(res.status).toBe(200)

    const a = h.store.entities.find((e) => e.id === 'e-A1')
    const b = h.store.entities.find((e) => e.id === 'e-B1')
    expect(a?.phone).toBe('new-A')
    expect(b?.phone).toBe('old-B')
  })
})
