import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — admin/cleanup-test-bookings/route.ts (docs/adr/0004).
 * This route purges test-generated clients/bookings/conversations by NAME/PHONE/
 * EMAIL pattern, not by id — so without tenant scoping, an admin running the
 * purge for tenant A would sweep up (and DELETE) tenant B's same-named test
 * data too. The LEAK CONTROL case proves the store has no implicit tenant
 * scoping, so the route's tenantDb filter is what keeps the purge tenant-local.
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

import { supabaseAdmin } from '@/lib/supabase'
import { POST, TEST_EMAIL_PATTERN } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('clients', [
    { id: 'client-a', tenant_id: A_ID, name: 'Test Person', phone: '+15550001111', email: 'a@realbiz.com' },
    { id: 'client-b', tenant_id: B_ID, name: 'Test Person', phone: '+15550002222', email: 'b@realbiz.com' },
  ])
  fake._seed('bookings', [
    { id: 'bk-a', tenant_id: A_ID, client_id: 'client-a' },
    { id: 'bk-b', tenant_id: B_ID, client_id: 'client-b' },
  ])
  fake._seed('sms_conversations', [
    { id: 'convo-a', tenant_id: A_ID, client_id: 'client-a' },
    { id: 'convo-b', tenant_id: B_ID, client_id: 'client-b' },
  ])
})

function postReq(dry: boolean): NextRequestLike {
  return { nextUrl: new URL(`http://x/api?dry=${dry}`) } as unknown as NextRequestLike
}
type NextRequestLike = { nextUrl: URL }

describe('admin/cleanup-test-bookings POST — tenantDb isolation', () => {
  it("dry run for tenant A finds only tenant A's test client/booking/conversation (positive control)", async () => {
    const res = await POST(postReq(true) as any)
    const body = await res.json()
    expect(body.testClientIds).toEqual(['client-a'])
    expect(body.bookingIds).toEqual(['bk-a'])
    expect(body.conversationIds).toEqual(['convo-a'])
  })

  it("live purge for tenant A deletes tenant A's rows and leaves tenant B's same-named test data untouched", async () => {
    const res = await POST(postReq(false) as any)
    expect(res.status).toBe(200)

    expect(fake._all('clients').find((r) => r.id === 'client-a')).toBeUndefined()
    expect(fake._all('bookings').find((r) => r.id === 'bk-a')).toBeUndefined()
    expect(fake._all('sms_conversations').find((r) => r.id === 'convo-a')).toBeUndefined()

    expect(fake._all('clients').find((r) => r.id === 'client-b')).toBeDefined()
    expect(fake._all('bookings').find((r) => r.id === 'bk-b')).toBeDefined()
    expect(fake._all('sms_conversations').find((r) => r.id === 'convo-b')).toBeDefined()
  })

  it("LEAK CONTROL: selecting clients by test NAME ALONE (no tenant_id filter) WOULD return tenant B's test client too — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('clients') // tenant-scope-ok: deliberate unscoped LEAK CONTROL probe, proves the route's tenantDb filter is load-bearing
      .select('id, name')
      .in('name', ['Test Person'])
    const ids = (data as { id: string }[]).map((r) => r.id).sort()
    expect(ids).toEqual(['client-a', 'client-b'])
  })

  it('TEST_EMAIL_PATTERN does not match real emails that merely contain "test" as a substring', () => {
    // Regression: the pattern used to be unanchored (`test\d*@`), which matched
    // any email containing that substring anywhere before the @ — flagging real
    // customers for permanent deletion by this purge.
    for (const real of ['latest@company.com', 'protest@union.org', 'contest@promo.com', 'attest@legal.com', 'clientest@gmail.com']) {
      expect(TEST_EMAIL_PATTERN.test(real)).toBe(false)
    }
    for (const testy of ['test@gmail.com', 'test123@gmail.com', 'Test5@x.com']) {
      expect(TEST_EMAIL_PATTERN.test(testy)).toBe(true)
    }
  })
})
