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
  // Ownership-check rows for the FK-injection guard in POST: CLIENT_A exists
  // ONLY under tenant A, so a batch scoped to tenant A resolves it.
  fake._seed('clients', [{ id: CLIENT_A, tenant_id: A_ID, name: 'Client A' }])
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

describe('bookings/batch POST — FK-injection guard (client_id / team_member_id ownership)', () => {
  const FOREIGN_CLIENT = 'client-foreign'
  const TM_A = 'tm-a'
  const FOREIGN_TM = 'tm-foreign'

  it("rejects a batch containing a client_id belonging to another tenant -- otherwise that stranger's full row (via this route's clients(*) join) would leak into the response and a real confirmation SMS would fire to their real phone", async () => {
    fake._seed('clients', [{ id: FOREIGN_CLIENT, tenant_id: B_ID, name: 'Foreign Client', phone: '+15555550001' }])
    const res = await POST(req([
      { client_id: FOREIGN_CLIENT, start_time: '2026-08-06T10:00:00', end_time: '2026-08-06T12:00:00', status: 'scheduled' },
    ]))
    expect(res.status).toBe(404)
    expect(fake._all('bookings').some((b) => b.client_id === FOREIGN_CLIENT)).toBe(false)
  })

  it("rejects a batch containing a team_member_id belonging to another tenant -- otherwise that stranger's full row (via this route's team_members(*) join, incl. portal-login pin) would leak into the response and a real job-assignment SMS would fire to their real phone", async () => {
    fake._seed('team_members', [{ id: FOREIGN_TM, tenant_id: B_ID, name: 'Foreign Member', phone: '+15555550002', pin: '9999' }])
    const res = await POST(req([
      { client_id: CLIENT_A, team_member_id: FOREIGN_TM, start_time: '2026-08-07T10:00:00', end_time: '2026-08-07T12:00:00', status: 'scheduled' },
    ]))
    expect(res.status).toBe(404)
    expect(fake._all('bookings').some((b) => b.team_member_id === FOREIGN_TM)).toBe(false)
  })

  it('accepts a batch whose client_id and team_member_id are both genuinely owned by the caller tenant (control)', async () => {
    fake._seed('team_members', [{ id: TM_A, tenant_id: A_ID, name: 'Member A' }])
    const res = await POST(req([
      { client_id: CLIENT_A, team_member_id: TM_A, start_time: '2026-08-08T10:00:00', end_time: '2026-08-08T12:00:00', status: 'pending' },
    ]))
    expect(res.status).toBe(200)
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
