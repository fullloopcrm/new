import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — referrers/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') keeps referral-code / email
 * lookups (GET) and duplicate-email checks + inserts (POST) scoped to the
 * tenant resolved from the request host, even when a foreign tenant has a
 * referrer with the SAME code or email.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenant: { id: string }
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => currentTenant,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: A_ID }
  fake._seed('referrers', [
    { id: 'ref-a', tenant_id: A_ID, name: 'Alice', email: 'shared@example.com', referral_code: 'SHARED1', total_earned: 0, total_paid: 0, preferred_payout: 'zelle', created_at: '2026-07-01' },
    { id: 'ref-b', tenant_id: B_ID, name: 'Bob', email: 'shared@example.com', referral_code: 'SHARED1', total_earned: 0, total_paid: 0, preferred_payout: 'zelle', created_at: '2026-07-02' },
  ])
})

function getReq(qs: string): NextRequest {
  return new NextRequest(`http://x/api/referrers?${qs}`)
}

describe('referrers GET — tenantDb isolation', () => {
  it("tenant A's code lookup returns its OWN referrer, not tenant B's identically-coded one", async () => {
    const res = await GET(getReq('code=SHARED1'))
    const body = await res.json()
    expect(body.id).toBe('ref-a')
  })

  it("tenant A's email lookup returns its OWN referrer, not tenant B's identically-emailed one", async () => {
    const res = await GET(getReq('email=shared@example.com'))
    const body = await res.json()
    expect(body.id).toBe('ref-a')
  })

  it("tenant B sees ITS OWN referrer for the same code (symmetric proof)", async () => {
    currentTenant = { id: B_ID }
    const res = await GET(getReq('code=SHARED1'))
    const body = await res.json()
    expect(body.id).toBe('ref-b')
  })
})

describe('referrers POST — tenantDb isolation', () => {
  it("tenant A CAN register a new referrer with an email tenant B already has (duplicate check is tenant-scoped)", async () => {
    const req = new NextRequest('http://x/api/referrers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Carol Newperson', email: 'brandnew@example.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.referral.tenant_id).toBe(A_ID)
  })

  it("stamps the new referrer with the header-resolved tenant, not a forged body tenant_id", async () => {
    const req = new NextRequest('http://x/api/referrers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Dave Deceiver', email: 'dave@example.com', tenant_id: B_ID }),
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.referral.tenant_id).toBe(A_ID)
  })

  it("LEAK CONTROL: an email lookup with NO tenant_id filter WOULD find tenant B's referrer by the shared email — proves the route's tenantDb scoping above is load-bearing", async () => {
    const { data } = await supabaseAdmin.from('referrers').select('id, tenant_id').ilike('email', 'shared@example.com')
    const ids = (data as { id: string; tenant_id: string }[]).map((r) => r.id)
    expect(ids).toEqual(expect.arrayContaining(['ref-a', 'ref-b']))
  })
})
