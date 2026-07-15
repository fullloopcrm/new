import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/admin/selena — settings.view gate (broad-hunt: same fix as
 * the live /api/selena route, applied here for defense-in-depth — this
 * duplicate route has no live UI caller today but is still a directly
 * addressable API surface with the identical client-PII-transcript +
 * SMS-send capability).
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
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  getClientProfile: vi.fn(async () => null),
}))

import { GET, POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  sentTo.length = 0
  h.store = {
    tenants: [{ id: 'tenant-A', telnyx_api_key: 'key-A', telnyx_phone: '+15550000001' }],
    sms_conversations: [{ id: 'convo-A1', tenant_id: 'tenant-A', phone: '+15551110001', name: 'Real Client', booking_checklist: {} }],
    sms_conversation_messages: [{ id: 'm1', conversation_id: 'convo-A1', direction: 'inbound', message: 'secret client message' }],
    notifications: [],
  }
})

describe('GET /api/admin/selena — settings.view permission', () => {
  it('rejects a staff member (no settings.view) with 403', async () => {
    const res = await GET(new Request('http://x') as never)
    expect(res.status).toBe(403)
  })

  it('allows an admin (has settings.view) past the permission gate', async () => {
    // The in-memory fake doesn't implement .or(), so the route's later error-log
    // query 500s — this only asserts the permission gate itself passed (not 403).
    h.role = 'admin'
    const res = await GET(new Request('http://x') as never)
    expect(res.status).not.toBe(403)
  })
})

describe('POST /api/admin/selena — settings.view permission', () => {
  it('rejects a staff member (no settings.view) with 403 and sends no SMS', async () => {
    const res = await POST(postReq({ conversationId: 'convo-A1' }) as never)
    expect(res.status).toBe(403)
    expect(sentTo).toEqual([])
  })

  it('allows an admin (has settings.view) to reset the conversation', async () => {
    h.role = 'admin'
    const res = await POST(postReq({ conversationId: 'convo-A1' }) as never)
    expect(res.status).toBe(200)
    expect(sentTo).toEqual(['+15551110001'])
  })
})
