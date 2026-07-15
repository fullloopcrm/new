import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/message-applicants/send — tenantDb() conversion wrong-tenant
 * probe (P1/W1 backlog batch). The applicant lookup previously carried its
 * own manual `.eq('tenant_id', tenantId)`; that filter now comes solely from
 * the wrapper — this proves a crafted applicant_ids list that includes
 * another tenant's applicant never gets texted, and the resulting
 * notification is auto-stamped with the caller's own tenant_id.
 */

const sentTo: string[] = []

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { telnyx_api_key: 'key-' + h.tenantId, telnyx_phone: '+15550000000' },
    role: 'admin',
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/sms', () => ({
  sendSMS: async ({ to }: { to: string }) => { sentTo.push(to) },
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  sentTo.length = 0
  h.store = {
    cleaner_applications: [
      { id: 'app-A1', tenant_id: 'tenant-A', name: 'Jeff Tucker', phone: '+15551110001', status: 'new' },
      { id: 'app-B1', tenant_id: 'tenant-B', name: 'Jeff Tucker', phone: '+15552220002', status: 'new' },
    ],
    notifications: [],
  }
})

describe('POST /api/admin/message-applicants/send — tenant isolation', () => {
  it("a crafted applicant_ids list spanning both tenants only texts tenant A's applicant", async () => {
    const res = await POST(postReq({
      applicant_ids: ['app-A1', 'app-B1'],
      message: 'We have a shift for you',
      confirmed: true,
    }))
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(sentTo).toEqual(['+15551110001'])
    expect(json.sent).toBe(1)
    const okIds = (json.results as Array<{ id: string; sent: boolean }>).filter((r) => r.sent).map((r) => r.id)
    expect(okIds).toEqual(['app-A1'])
  })

  it("the resulting notification is auto-stamped tenant-A, never wrong-tenant", async () => {
    await POST(postReq({ applicant_ids: ['app-A1', 'app-B1'], message: 'hi', confirmed: true }))

    expect(h.store.notifications.length).toBe(1)
    expect(h.store.notifications[0].tenant_id).toBe('tenant-A')
  })

  it("run for tenant B only texts tenant B's own applicant", async () => {
    h.tenantId = 'tenant-B'
    const res = await POST(postReq({ applicant_ids: ['app-A1', 'app-B1'], message: 'hi', confirmed: true }))
    const json = await res.json()

    expect(sentTo).toEqual(['+15552220002'])
    expect(json.sent).toBe(1)
  })
})
