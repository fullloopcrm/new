import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/settings/services — settings.edit gate.
 *
 * Only called getTenantForRequest() (base session auth) with no
 * requirePermission check — any authenticated tenant member of any role
 * (including 'staff', which has no settings permissions at all) could create
 * a priced service_types row, unlike the sibling PUT /api/settings/* routes
 * (notifications, service-area) gated on 'settings.edit'. GET is unchanged —
 * it mirrors the base /api/settings GET, which is session-only.
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

import { POST } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = { service_types: [] }
})

const postReq = () =>
  new Request('http://x/api/settings/services', { method: 'POST', body: JSON.stringify({ name: 'New Service' }) })

describe('POST /api/settings/services — settings.edit permission', () => {
  it('rejects a staff member (no settings.edit) with 403 and does not insert', async () => {
    const res = await POST(postReq())
    expect(res.status).toBe(403)
    expect(h.store.service_types.length).toBe(0)
  })

  it('allows an admin (has settings.edit) to create a service', async () => {
    h.role = 'admin'
    const res = await POST(postReq())
    expect(res.status).toBe(201)
    expect(h.store.service_types.length).toBe(1)
  })
})
