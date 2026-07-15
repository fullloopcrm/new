import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/notifications — notifications.view gate (broad-hunt:
 * notification preferences module). Before this fix the route only called
 * getTenantForRequest() (base tenant auth) with no permission check — every
 * default role happens to include notifications.view, so this was invisible
 * day-to-day, but rbac.ts lets a tenant override per-role permissions
 * (tenants.selena_config.role_permissions) and that override was silently
 * ignored here: a tenant that revoked notifications.view from staff still had
 * every staff member able to read and mark-read the in-app notification feed
 * and trigger the 15-min-warning client SMS. Fixed with
 * requirePermission('notifications.view'), matching the deals/settings fixes'
 * convention of enforcing the tenant's actual configured permission set.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  overrides: null as Record<string, unknown> | null,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string; overrides: Record<string, unknown> | null }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: h.overrides ? { role_permissions: h.overrides } : null },
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
vi.mock('@/lib/notify', () => ({ notify: vi.fn() }))

import { GET, POST } from './route'

const getReq = () => new NextRequest('http://x/api/notifications')
const postReq = (body: unknown) =>
  new NextRequest('http://x/api/notifications', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.overrides = null
  h.store = { notifications: [], bookings: [] }
})

describe('GET/POST /api/notifications — notifications.view permission', () => {
  it('allows staff (has notifications.view by default) to read', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })

  it('allows staff (has notifications.view by default) to trigger a warning', async () => {
    const res = await POST(postReq({ type: '15min_warning', booking_id: null, message: 'hi' }))
    expect(res.status).toBe(200)
  })

  it('rejects staff with 403 once the tenant overrides notifications.view off for staff', async () => {
    h.overrides = { staff: { 'notifications.view': false } }
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('rejects the POST too once the tenant override revokes staff notifications.view', async () => {
    h.overrides = { staff: { 'notifications.view': false } }
    const res = await POST(postReq({ type: '15min_warning', booking_id: null, message: 'hi' }))
    expect(res.status).toBe(403)
    expect(h.store.notifications).toHaveLength(0)
  })

  it('owner is never affected by a staff override (owner bypasses permission checks)', async () => {
    h.role = 'owner'
    h.overrides = { staff: { 'notifications.view': false } }
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })
})
