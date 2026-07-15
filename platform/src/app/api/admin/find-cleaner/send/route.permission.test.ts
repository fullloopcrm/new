import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/find-cleaner/send — team.edit gate (broad-hunt: this
 * route only called getTenantForRequest() for base tenant auth, no
 * requirePermission check, despite SMS-blasting team members over the
 * tenant's own Telnyx number to ask for job availability. Same class of
 * gap already fixed on the sibling /api/admin/broadcast-guidelines team
 * SMS blast (team.edit). Currently limited in blast radius by the
 * hard-coded TEST_MODE flag in ../preview/route.ts, but that's a runtime
 * guard, not an authorization gate. Per rbac.ts 'staff' and 'manager' both
 * have team.view only, not team.edit; only 'admin'/'owner' have team.edit
 * and must keep working.
 */

const sentTo: string[] = []

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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: {}, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/sms', () => ({
  sendSMS: async ({ to }: { to: string }) => { sentTo.push(to); return { success: true } },
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  sentTo.length = 0
  h.store = {
    tenants: [{ id: 'tenant-A', telnyx_api_key: 'key-A', telnyx_phone: '+15550000001' }],
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Jeff Tucker', phone: '+15551110001', preferred_language: 'en', hourly_rate: 30 },
    ],
    cleaner_broadcasts: [],
    cleaner_broadcast_recipients: [],
  }
})

const body = {
  job_date: '2026-08-01',
  start_time: '09:00',
  duration_hours: 3,
  qty_needed: 1,
  cleaner_ids: ['tm-A1'],
  confirmed: true,
}

describe('POST /api/admin/find-cleaner/send — team.edit permission', () => {
  it('rejects a staff member (no team.edit) with 403 and sends nothing', async () => {
    const res = await POST(postReq(body))

    expect(res.status).toBe(403)
    expect(sentTo).toEqual([])
  })

  it('rejects a manager (team.view only, no team.edit) with 403 and sends nothing', async () => {
    h.role = 'manager'
    const res = await POST(postReq(body))

    expect(res.status).toBe(403)
    expect(sentTo).toEqual([])
  })

  it('allows an admin (has team.edit) to send the broadcast', async () => {
    h.role = 'admin'
    const res = await POST(postReq(body))

    expect(res.status).toBe(200)
    expect(sentTo).toEqual(['+15551110001'])
  })

  it('allows an owner to send the broadcast', async () => {
    h.role = 'owner'
    const res = await POST(postReq(body))

    expect(res.status).toBe(200)
    expect(sentTo).toEqual(['+15551110001'])
  })
})
