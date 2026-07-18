import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/admin/websites — domain normalization on insert.
 *
 * activate-tenant.ts normalizes an auto-registered tenant_domains row
 * (trim/lowercase/strip scheme+path/strip leading www.) before writing it,
 * via the same logic exported as normalizeDomain() in src/lib/seo/onboarding.ts.
 * This admin-UI "add a website domain" POST route wrote request.body.domain
 * straight through with none of that. An admin pasting a domain as a full
 * URL, in mixed case, or with a leading www. would silently create a
 * tenant_domains row the reconcile gate's own norm() flags as drift and that
 * middleware's lowercased/port-stripped hostname compare never matches —
 * the domain looks "added" in the admin UI but never actually routes.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://x/api/admin/websites', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
})

describe('POST /api/admin/websites — domain normalization', () => {
  it('strips scheme, path, and normalizes case before insert', async () => {
    const res = await POST(postReq({ tenant_id: 't1', domain: 'HTTPS://Example.com/some/path' }))
    expect(res.status).toBe(201)
    const row = fake._all('tenant_domains')[0]
    expect(row.domain).toBe('example.com')
  })

  it('strips a leading www.', async () => {
    const res = await POST(postReq({ tenant_id: 't1', domain: 'www.Example.com' }))
    expect(res.status).toBe(201)
    const row = fake._all('tenant_domains')[0]
    expect(row.domain).toBe('example.com')
  })

  it('rejects a domain that normalizes to an empty/invalid hostname', async () => {
    const res = await POST(postReq({ tenant_id: 't1', domain: 'https://' }))
    expect(res.status).toBe(400)
    expect(fake._all('tenant_domains')).toHaveLength(0)
  })
})
