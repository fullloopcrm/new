import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/PUT /api/settings/notifications — settings.view/settings.edit gate
 * (broad-hunt: notification preferences module). Before this fix the route
 * only called getTenantForRequest() (base tenant auth) with no permission
 * check at all — unlike its sibling /api/settings (PUT gated on
 * settings.edit). Per rbac.ts, 'staff' has no settings.view and 'manager' has
 * settings.view but not settings.edit, so any tenant member — including
 * staff, who shouldn't even see settings — could read AND rewrite the
 * tenant's comms preferences (which channel/timing alerts fire on).
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
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))

import { GET, PUT } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    tenants: [{ id: 'tenant-A', notification_preferences: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null }],
  }
})

describe('GET /api/settings/notifications — settings.view permission', () => {
  it('rejects a staff member (no settings.view) with 403', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows a manager (has settings.view) to read', async () => {
    h.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/settings/notifications — settings.edit permission', () => {
  it('rejects a manager (settings.view only, no settings.edit) with 403 and leaves prefs untouched', async () => {
    const res = await PUT(putReq({ preferences: { comms: {}, timing: {} } }))

    expect(res.status).toBe(403)
    expect(h.store.tenants.find((t) => t.id === 'tenant-A')?.notification_preferences).toBeNull()
  })

  it('allows an admin (has settings.edit) to write', async () => {
    h.role = 'admin'
    const res = await PUT(putReq({ preferences: { comms: {}, timing: {} } }))

    expect(res.status).toBe(200)
    expect(h.store.tenants.find((t) => t.id === 'tenant-A')?.notification_preferences).not.toBeNull()
  })
})
