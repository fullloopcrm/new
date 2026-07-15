import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/dashboard/messages — sender identity spoofing (broad-hunt:
 * Messages has no `perm` gate in dashboard-shell.tsx nav, so any tenant
 * member of any role can reach this owner<->platform-admin thread. The
 * route used to hardcode sender/sender_role to 'owner' regardless of who
 * actually sent it — same bug class as the schedule-issues `resolved_by`
 * hardcode fixed earlier this session. sender_role is a trust signal Jefe's
 * read_tenant_thread/send_tenant_message tools rely on, so a staff-role
 * member's message would misrepresent itself as authoritative owner input.
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A' }, userId: 'user-A', role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

const postReq = (body: unknown) =>
  new NextRequest('http://x/api/dashboard/messages', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = { tenant_owner_messages: [], notifications: [] }
})

describe('POST /api/dashboard/messages — sender identity', () => {
  it("stamps a staff member's message with their real role, not a hardcoded 'owner'", async () => {
    h.role = 'staff'
    const res = await POST(postReq({ body: 'hi from staff' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.message.sender_role).toBe('staff')
    expect(json.message.sender).toBe('staff')
  })

  it("stamps the actual owner's message with role 'owner'", async () => {
    h.role = 'owner'
    const res = await POST(postReq({ body: 'hi from owner' }))
    const json = await res.json()

    expect(json.message.sender_role).toBe('owner')
  })

  it('admin notification title reflects a non-owner sender', async () => {
    h.role = 'manager'
    await POST(postReq({ body: 'hi from manager' }))

    expect(h.store.notifications[0].title).toContain('Team reply')
  })
})
