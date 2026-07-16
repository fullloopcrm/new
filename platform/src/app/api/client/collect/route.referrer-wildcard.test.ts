/**
 * REFERRAL-ATTRIBUTION WILDCARD INJECTION — the referrer-by-name lookup
 * embedded the raw, unauthenticated `referrer_name` field into an
 * `ilike('name', '%'+name+'%')` pattern with no escaping. `%` and `_` are
 * ilike metacharacters: a submitter typing "%" as the referrer name matched
 * EVERY active referrer in the tenant (first row wins), silently attributing
 * a stranger's booking -- and the commission `team-portal/checkout` later
 * pays out on it -- to an arbitrary real referrer who never referred anyone.
 * This suite proves a `%`-only name can no longer resolve to a referrer,
 * while a genuine partial-name match still works exactly as before. (`_` is
 * the other ilike metacharacter in real Postgres, but the in-repo Supabase
 * fake used here doesn't model single-char wildcard matching, so it can't be
 * meaningfully red/green-tested against this harness -- escapeLike() still
 * covers it in production.)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenant: { id: string; name: string; primary_color?: string | null; logo_url?: string | null }
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => currentTenant,
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => ({}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 'x', html: 'x' }) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-1'
const REAL_REFERRER_ID = 'referrer-real'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: TENANT_ID, name: 'Test Tenant' }
  fake._seed('referrers', [
    { id: REAL_REFERRER_ID, tenant_id: TENANT_ID, name: 'Local Neighbor Bob', phone: '5559990000', active: true },
  ])
})

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/client/collect', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/client/collect — referrer_name ilike wildcard injection', () => {
  it('a referrer_name of "%" does NOT match and get attributed to an unrelated real referrer', async () => {
    const res = await POST(postReq({ name: 'Attacker Submission', phone: '2125550000', referrer_name: '%' }))
    expect(res.status).toBe(200)
    const created = fake._all('clients').find((c) => c.name === 'Attacker Submission')!
    expect(created.referrer_id).not.toBe(REAL_REFERRER_ID)
    expect(created.referrer_id).toBeFalsy()
  })

  it('a genuine partial-name match still correctly attributes the referrer', async () => {
    const res = await POST(postReq({ name: 'Legit Customer', phone: '2125550002', referrer_name: 'Local Neighbor' }))
    expect(res.status).toBe(200)
    const created = fake._all('clients').find((c) => c.name === 'Legit Customer')!
    expect(created.referrer_id).toBe(REAL_REFERRER_ID)
  })
})
