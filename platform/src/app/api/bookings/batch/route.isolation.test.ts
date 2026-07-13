import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — bookings/batch/route.ts (docs/adr/0004).
 * Proves the wrapper stamps every row in a bulk-create with the requesting
 * tenant's id — even though the caller no longer builds tenant_id into each
 * row at all — and that a batch created for tenant A never touches or
 * becomes visible under tenant B's existing booking for the same client_id.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'sms' }) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({ jobAssignment: () => 'sms' }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const CLIENT_A = 'client-a'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('tenants', [{ id: A_ID, name: 'A Co' }, { id: B_ID, name: 'B Co' }])
  fake._seed('bookings', [
    { id: 'b-existing', tenant_id: B_ID, client_id: CLIENT_A, start_time: '2026-08-01T10:00:00', status: 'scheduled' },
  ])
})

function req(bookings: Array<Record<string, unknown>>): Request {
  return new Request('http://x/api/bookings/batch', { method: 'POST', body: JSON.stringify({ bookings }) })
}

describe('bookings/batch POST — tenantDb isolation', () => {
  it("stamps every row in the batch with tenant A's id via tenantDb, even though input rows carry no tenant_id at all", async () => {
    const res = await POST(req([
      { client_id: CLIENT_A, start_time: '2026-08-02T10:00:00', end_time: '2026-08-02T12:00:00', status: 'pending' },
      { client_id: CLIENT_A, start_time: '2026-08-03T10:00:00', end_time: '2026-08-03T12:00:00', status: 'pending' },
    ]))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.created).toBe(2)
    expect((body.bookings as { tenant_id: string }[]).every((b) => b.tenant_id === A_ID)).toBe(true)
  })

  it("a batch created for tenant A leaves tenant B's existing same-client_id booking untouched and invisible to A", async () => {
    await POST(req([
      { client_id: CLIENT_A, start_time: '2026-08-04T10:00:00', end_time: '2026-08-04T12:00:00', status: 'pending' },
    ]))
    const aRows = fake._all('bookings').filter((b) => b.client_id === CLIENT_A && b.tenant_id === A_ID)
    expect(aRows.length).toBe(1)
    const bRows = fake._all('bookings').filter((b) => b.tenant_id === B_ID)
    expect(bRows.length).toBe(1)
  })
})

describe('LEAK CONTROL', () => {
  it("reading bookings by client_id ALONE (no tenant_id filter) WOULD return both tenants' rows for the same client_id — proves the route's tenantDb scoping above is load-bearing", async () => {
    await POST(req([
      { client_id: CLIENT_A, start_time: '2026-08-05T10:00:00', end_time: '2026-08-05T12:00:00', status: 'pending' },
    ]))
    const { data } = await supabaseAdmin
      .from('bookings') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .select('id, tenant_id')
      .eq('client_id', CLIENT_A)
    expect((data as { tenant_id: string }[]).map((r) => r.tenant_id).sort()).toEqual([A_ID, B_ID])
  })
})
