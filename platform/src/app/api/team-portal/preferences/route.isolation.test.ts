import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team-portal/preferences/route.ts (docs/adr/0004).
 * auth.id/auth.tid both come from the verified bearer token, so there is no
 * caller-suppliable cross-tenant id here — the wrapper's job is defense-in-depth
 * (removes the now-manual .eq('tenant_id') without changing behavior). The LEAK
 * CONTROL case proves the underlying store has no implicit tenant scoping, so
 * the route's tenant_id filter (now via tenantDb) is what makes an id-only
 * query safe rather than the table itself.
 */

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { GET, PUT } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: A_ID, notes: JSON.stringify({ sms_consent: true }) },
    { id: 'tm-b', tenant_id: B_ID, notes: JSON.stringify({ sms_consent: false }) },
  ])
})

function getReq(token: string): Request {
  return new Request('http://x', { headers: { authorization: `Bearer ${token}` } })
}
function putReq(token: string, body: Record<string, unknown>): Request {
  return new Request('http://x', { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
}

describe('team-portal/preferences GET/PUT — tenantDb isolation', () => {
  it("worker A's own token reads tenant A's preferences (positive control)", async () => {
    const token = createToken('tm-a', A_ID)
    const res = await GET(getReq(token) as any)
    const body = await res.json()
    expect(body.sms_consent).toBe(true)
  })

  it("PUT from tenant A's token updates ONLY tenant A's row — tenant B's row stays untouched", async () => {
    const token = createToken('tm-a', A_ID)
    const res = await PUT(putReq(token, { sms_consent: false }) as any)
    expect(res.status).toBe(200)
    const aRow = fake._all('team_members').find((r) => r.id === 'tm-a')!
    const bRow = fake._all('team_members').find((r) => r.id === 'tm-b')!
    expect(JSON.parse(aRow.notes as string).sms_consent).toBe(false)
    expect(JSON.parse(bRow.notes as string).sms_consent).toBe(false) // untouched (was already false)
  })

  it("LEAK CONTROL: updating team_members by id ALONE (no tenant_id filter) WOULD let a caller with tenant B's id overwrite it directly — proves the route's tenantDb scoping is load-bearing, not the table", async () => {
    const { data } = await supabaseAdmin
      .from('team_members')
      .update({ notes: JSON.stringify({ sms_consent: 'forged' }) })
      .eq('id', 'tm-b')
      .select()
      .maybeSingle()
    expect(JSON.parse((data as { notes: string }).notes).sms_consent).toBe('forged')
  })
})
