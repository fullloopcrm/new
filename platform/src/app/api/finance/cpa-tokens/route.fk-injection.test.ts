/**
 * POST /api/finance/cpa-tokens — cross-tenant FK injection on entity_id.
 * GET on this same route already embeds `entities(name)` on every token row,
 * so an unverified entity_id on POST would let a caller mint a CPA token
 * against another tenant's real entity_id and then read that entity's name
 * back out through their own GET /api/finance/cpa-tokens.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.store = {
    cpa_access_tokens: [],
    entities: [
      { id: 'ent-A1', tenant_id: 'tenant-A', name: 'Acme A' },
      { id: 'ent-B1', tenant_id: 'tenant-B', name: 'Acme B (secret)' },
    ],
  }
})

describe('POST /api/finance/cpa-tokens — cross-tenant FK injection', () => {
  it('rejects an entity_id belonging to another tenant and does not mint a token', async () => {
    const res = await POST(postReq({ entity_id: 'ent-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.cpa_access_tokens.length).toBe(0)
  })

  it('mints the token when entity_id genuinely belongs to the caller tenant', async () => {
    const res = await POST(postReq({ entity_id: 'ent-A1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.token.entity_id).toBe('ent-A1')
  })

  it('mints with entity_id null when omitted (all-entities token)', async () => {
    const res = await POST(postReq({}))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.token.entity_id).toBe(null)
  })
})
