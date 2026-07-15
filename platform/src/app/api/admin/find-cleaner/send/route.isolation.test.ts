import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/find-cleaner/send — tenantDb() conversion wrong-tenant probe
 * (P1/W1 backlog batch). The `team_members` lookup previously carried its
 * own manual `.eq('tenant_id', tenantId)`; that filter now comes solely from
 * the wrapper — this proves a crafted `cleaner_ids` list spanning both
 * tenants never texts another tenant's team member, and the resulting
 * `cleaner_broadcasts`/`cleaner_broadcast_recipients` rows are auto-stamped
 * with the caller's own tenant_id (previously threaded manually).
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
  getTenantForRequest: async () => ({ tenantId: h.tenantId, role: 'owner' }),
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
  sentTo.length = 0
  h.store = {
    tenants: [
      { id: 'tenant-A', telnyx_api_key: 'key-A', telnyx_phone: '+15550000001' },
      { id: 'tenant-B', telnyx_api_key: 'key-B', telnyx_phone: '+15550000002' },
    ],
    team_members: [
      // TEST_MODE (see ../preview/route.ts) only messages a row whose name
      // contains "jeff tucker" — both fixtures use it so TEST_MODE doesn't
      // mask the tenant-isolation assertions below.
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Jeff Tucker', phone: '+15551110001', preferred_language: 'en', hourly_rate: 30 },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Jeff Tucker', phone: '+15552220002', preferred_language: 'en', hourly_rate: 30 },
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
  cleaner_ids: ['tm-A1', 'tm-B1'],
  confirmed: true,
}

describe('POST /api/admin/find-cleaner/send — tenant isolation', () => {
  it("a crafted cleaner_ids list spanning both tenants only texts tenant A's team member", async () => {
    const res = await POST(postReq(body))
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(sentTo).toEqual(['+15551110001'])
    expect(json.sent).toBe(1)
  })

  it("the resulting broadcast + recipient rows are auto-stamped tenant-A, never wrong-tenant", async () => {
    await POST(postReq(body))

    expect(h.store.cleaner_broadcasts.length).toBe(1)
    expect(h.store.cleaner_broadcasts[0].tenant_id).toBe('tenant-A')
    expect(h.store.cleaner_broadcast_recipients.length).toBe(1)
    expect(h.store.cleaner_broadcast_recipients[0].tenant_id).toBe('tenant-A')
    expect(h.store.cleaner_broadcast_recipients[0].cleaner_id).toBe('tm-A1')
  })

  it("run for tenant B only texts tenant B's own team member", async () => {
    h.tenantId = 'tenant-B'
    const res = await POST(postReq(body))
    const json = await res.json()

    expect(sentTo).toEqual(['+15552220002'])
    expect(json.sent).toBe(1)
  })
})
