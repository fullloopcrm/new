import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/sms/send — team.edit gate (broad-hunt: this route's own
 * docstring says "Admin-triggered manual SMS" but the code only called
 * getTenantForRequest() for base tenant auth, no requirePermission check —
 * any authenticated tenant member of any role could send an arbitrary SMS
 * to any phone number via the tenant's Telnyx credentials, unlike the
 * sibling SMS-blast routes (broadcast-guidelines, find-cleaner/send,
 * message-applicants/send) already gated on team.edit). Per rbac.ts,
 * 'staff' and 'manager' both lack team.edit — only 'admin'/'owner' must
 * keep working.
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
vi.mock('@/lib/sms', () => ({
  sendSMS: async ({ to }: { to: string }) => { sentTo.push(to); return { success: true } },
}))

import { POST } from './route'

const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })
const body = { to: '+15551234567', message: 'hey' }

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  sentTo.length = 0
  h.store = {
    tenants: [
      { id: 'tenant-A', telnyx_api_key: 'key-A', telnyx_phone: '+15550000001' },
    ],
  }
})

describe('POST /api/sms/send — team.edit permission', () => {
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

  it('allows an admin (has team.edit) to send', async () => {
    h.role = 'admin'
    const res = await POST(postReq(body))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sentTo).toEqual(['+15551234567'])
  })

  it('allows an owner to send', async () => {
    h.role = 'owner'
    const res = await POST(postReq(body))

    expect(res.status).toBe(200)
    expect(sentTo).toEqual(['+15551234567'])
  })
})
