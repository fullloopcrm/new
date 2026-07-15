/**
 * POST /api/bookings/batch — cross-tenant FK injection on client_id /
 * team_member_id / service_type_id.
 * This route's own insert response embeds `clients(*)` and
 * `team_members!bookings_team_member_id_fkey(*)`, so an unverified FK here
 * would let a caller attribute a batch-created booking to another tenant's
 * client/team-member and read that row's full PII straight back out of the
 * response. The single-booking sibling POST /api/bookings and the
 * PUT /api/bookings/batch-update sibling both already verify these FKs
 * belong to the caller's tenant before writing; this route did not.
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
    bookings: [],
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Acme A' },
      { id: 'client-B1', tenant_id: 'tenant-B', name: 'Acme B (secret)', phone: '555-0100', email: 'b@secret.example' },
    ],
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alice' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Bob (secret)' },
    ],
    service_types: [
      { id: 'svc-A1', tenant_id: 'tenant-A', name: 'Standard' },
      { id: 'svc-B1', tenant_id: 'tenant-B', name: 'Secret Service' },
    ],
  }
})

describe('POST /api/bookings/batch — cross-tenant FK injection', () => {
  it('rejects a client_id belonging to another tenant and inserts nothing', async () => {
    const res = await POST(postReq({
      bookings: [{ client_id: 'client-B1', start_time: '2026-08-01T10:00:00Z', status: 'pending' }],
    }))

    expect(res.status).toBe(400)
    expect(h.store.bookings.length).toBe(0)
  })

  it('rejects a team_member_id belonging to another tenant and inserts nothing', async () => {
    const res = await POST(postReq({
      bookings: [{ client_id: 'client-A1', team_member_id: 'tm-B1', start_time: '2026-08-01T10:00:00Z', status: 'pending' }],
    }))

    expect(res.status).toBe(400)
    expect(h.store.bookings.length).toBe(0)
  })

  it('rejects a service_type_id belonging to another tenant and inserts nothing', async () => {
    const res = await POST(postReq({
      bookings: [{ client_id: 'client-A1', service_type_id: 'svc-B1', start_time: '2026-08-01T10:00:00Z', status: 'pending' }],
    }))

    expect(res.status).toBe(400)
    expect(h.store.bookings.length).toBe(0)
  })

  it('rejects the whole batch if any one row references a foreign FK', async () => {
    const res = await POST(postReq({
      bookings: [
        { client_id: 'client-A1', start_time: '2026-08-01T10:00:00Z', status: 'pending' },
        { client_id: 'client-B1', start_time: '2026-08-02T10:00:00Z', status: 'pending' },
      ],
    }))

    expect(res.status).toBe(400)
    expect(h.store.bookings.length).toBe(0)
  })

  it('creates the batch when every FK genuinely belongs to the caller tenant', async () => {
    const res = await POST(postReq({
      bookings: [
        { client_id: 'client-A1', team_member_id: 'tm-A1', service_type_id: 'svc-A1', start_time: '2026-08-01T10:00:00Z', status: 'pending' },
      ],
    }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.created).toBe(1)
    expect(h.store.bookings.length).toBe(1)
  })
})
