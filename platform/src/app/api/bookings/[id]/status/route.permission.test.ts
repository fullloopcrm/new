import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PATCH /api/bookings/[id]/status — bookings.edit gate (broad-hunt: booking
 * status/stage transitions had zero permission check, only base tenant auth
 * via getTenantForRequest()). This route also mirrors the transition into the
 * linked booking-mode deal's stage, so an ungated transition doubled as an
 * ungated deal-stage change. RBAC (rbac.ts) grants 'staff' only bookings.view
 * + bookings.create, not bookings.edit — matching the sibling
 * bookings/[id]/route.ts PUT, which already requires bookings.edit.
 * 'manager'+ have bookings.edit and must keep working.
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
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: null },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { PATCH } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    bookings: [{ id: 'book-A1', tenant_id: 'tenant-A', status: 'scheduled' }],
    deals: [],
  }
})

describe('PATCH /api/bookings/:id/status — bookings.edit permission', () => {
  it('rejects a staff member (no bookings.edit) with 403 and leaves the status untouched', async () => {
    const res = await PATCH(patchReq({ status: 'in_progress' }), params('book-A1'))

    expect(res.status).toBe(403)
    expect(h.store.bookings.find((b) => b.id === 'book-A1')?.status).toBe('scheduled')
  })

  it('allows a manager (has bookings.edit) to transition the status', async () => {
    h.role = 'manager'
    const res = await PATCH(patchReq({ status: 'in_progress' }), params('book-A1'))

    expect(res.status).toBe(200)
    expect(h.store.bookings.find((b) => b.id === 'book-A1')?.status).toBe('in_progress')
  })

  it('allows an owner to transition the status', async () => {
    h.role = 'owner'
    const res = await PATCH(patchReq({ status: 'confirmed' }), params('book-A1'))

    expect(res.status).toBe(200)
    expect(h.store.bookings.find((b) => b.id === 'book-A1')?.status).toBe('confirmed')
  })
})
