/**
 * PUT /api/bookings/batch-update — cross-tenant FK injection on
 * client_id/team_member_id/service_type_id (same P9-P11-class bug already
 * fixed on the single-booking sibling PUT /api/bookings/[id] and on
 * POST /api/bookings/batch, but missed on this batch-update route). The route
 * spread the caller-supplied `data` object straight into `.update()` with
 * only `.eq('tenant_id', tenantId)` on the WHERE clause -- nothing verified
 * the FK VALUES themselves belonged to the caller's tenant, so a caller with
 * legit bookings.edit access to their OWN booking could reassign it to
 * another tenant's client/team member/service type and exfiltrate that row's
 * PII via this route's own clients()/team_members() joins on the response.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PUT } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    bookings: [
      { id: 'book-1', tenant_id: TENANT_A, client_id: 'client-A1', team_member_id: 'tm-A1', status: 'scheduled', start_time: '2026-08-01T09:00:00' },
      { id: 'book-2', tenant_id: TENANT_A, client_id: 'client-A1', team_member_id: 'tm-A1', status: 'scheduled', start_time: '2026-08-02T09:00:00' },
    ],
    clients: [{ id: 'client-A1', tenant_id: TENANT_A, name: 'Pat A' }, { id: 'client-B1', tenant_id: TENANT_B, name: 'Pat B (secret)' }],
    team_members: [{ id: 'tm-A1', tenant_id: TENANT_A, name: 'Sam A' }, { id: 'tm-B1', tenant_id: TENANT_B, name: 'Sam B (secret)' }],
    service_types: [{ id: 'svc-A1', tenant_id: TENANT_A, name: 'Deep Clean' }],
  }
})

describe('PUT /api/bookings/batch-update — cross-tenant FK injection', () => {
  it('rejects a client_id belonging to another tenant instead of writing it', async () => {
    const res = await PUT(putReq({ updates: [{ id: 'book-1', data: { client_id: 'client-B1' } }] }))

    expect(res.status).toBe(400)
    expect(h.store.bookings[0].client_id).toBe('client-A1')
  })

  it('rejects a team_member_id belonging to another tenant, even buried in a later batch row', async () => {
    const res = await PUT(putReq({
      updates: [
        { id: 'book-1', data: { notes: 'fine' } },
        { id: 'book-2', data: { team_member_id: 'tm-B1' } },
      ],
    }))

    expect(res.status).toBe(400)
    expect(h.store.bookings[0].notes).not.toBe('fine')
    expect(h.store.bookings[1].team_member_id).toBe('tm-A1')
  })

  it('rejects a service_type_id that does not belong to this tenant', async () => {
    const res = await PUT(putReq({ updates: [{ id: 'book-1', data: { service_type_id: 'not-a-real-service-type' } }] }))

    expect(res.status).toBe(400)
  })

  it('still updates the batch when every FK genuinely belongs to the caller tenant', async () => {
    const res = await PUT(putReq({
      updates: [{ id: 'book-1', data: { client_id: 'client-A1', team_member_id: 'tm-A1', notes: 'updated' } }],
    }))

    expect(res.status).toBe(200)
    expect(h.store.bookings[0].notes).toBe('updated')
  })
})
