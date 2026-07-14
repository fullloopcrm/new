import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/sms/send checked only getTenantForRequest() (any authenticated
 * tenant member) with no requirePermission() call. Unlike /api/sms (client-
 * scoped 1:1 conversation, tenant + client_id validated), this route sends
 * an arbitrary `message` to an arbitrary `to` phone number using the
 * tenant's Telnyx credentials -- zero recipient scoping. 'staff' (lacks
 * campaigns.send) could spam any phone number under the tenant's SMS
 * number/reputation with zero permission check, same "raw outbound
 * broadcast" class already gated on campaigns.send for social/post,
 * google/posts, admin/broadcast-guidelines this session.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
let currentRole = 'staff'
let smsSent = false

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { telnyx_api_key: 'key', telnyx_phone: '+15550000000' }, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/sms', () => ({
  sendSMS: async () => { smsSent = true },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, role: currentRole, tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

import { POST } from '@/app/api/sms/send/route'

function postReq(body: unknown): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/sms/send — RBAC enforcement', () => {
  beforeEach(() => {
    currentRole = 'staff'
    smsSent = false
  })

  it('staff (no campaigns.send) cannot send an arbitrary SMS', async () => {
    currentRole = 'staff'
    const res = await POST(postReq({ to: '+15551234567', message: 'anything to anyone' }) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(403)
    expect(smsSent).toBe(false)
  })

  it('admin (has campaigns.send) can send an SMS', async () => {
    currentRole = 'admin'
    const res = await POST(postReq({ to: '+15551234567', message: 'authorized send' }) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    expect(smsSent).toBe(true)
  })
})
