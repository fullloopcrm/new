/**
 * GET /api/referrers/:code — masked-error probe (found already-fixed-but-
 * never-committed in this worktree; adding coverage before landing). A real
 * DB failure on the referrer or tenant lookup used to look identical to "no
 * such referrer" (403) or "tenant deleted" (404) because the route used
 * .single() with the error discarded — same masked-error class already
 * fixed 3x elsewhere in this repo (tenant.ts/tenant-lookup.ts/tenant-query.ts,
 * domains.ts). Now both lookups use maybeSingle() + an explicit error check
 * that returns 500 instead of silently matching the "not found" path.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  referrerResult: { data: null as unknown, error: null as unknown },
  tenantResult: { data: null as unknown, error: null as unknown },
  domainRows: [] as unknown[],
  commissions: [] as unknown[],
  auth: { rid: 'ref-1', tid: 'tenant-A' } as { rid: string; tid: string } | null,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => {
          if (table === 'referrers') return Promise.resolve(h.referrerResult)
          if (table === 'tenants') return Promise.resolve(h.tenantResult)
          return Promise.resolve({ data: null, error: null })
        },
        then: (res: (v: unknown) => unknown) => {
          if (table === 'tenant_domains') return Promise.resolve({ data: h.domainRows, error: null }).then(res)
          if (table === 'referral_commissions') return Promise.resolve({ data: h.commissions, error: null }).then(res)
          return Promise.resolve({ data: [], error: null }).then(res)
        },
      }
      return chain
    },
  },
}))
vi.mock('@/lib/referrer-portal-auth', () => ({ getReferrerAuth: () => h.auth }))

import { GET } from './route'

const params = (code: string) => ({ params: Promise.resolve({ code }) })
const req = () => new Request('http://x')

beforeEach(() => {
  h.auth = { rid: 'ref-1', tid: 'tenant-A' }
  h.referrerResult = {
    data: { id: 'ref-1', tenant_id: 'tenant-A', name: 'Ref', email: 'r@x.com', referral_code: 'CODE1', commission_rate: 0.1, total_earned: 100, total_paid: 0 },
    error: null,
  }
  h.tenantResult = { data: { name: 'Acme', slug: 'acme', domain: null, primary_color: null }, error: null }
  h.domainRows = []
  h.commissions = []
})

describe('GET /api/referrers/:code — masked-error handling', () => {
  it('returns 500 (not 403) when the referrer lookup itself fails', async () => {
    h.referrerResult = { data: null, error: { message: 'connection reset' } }

    const res = await GET(req(), params('CODE1'))

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Could not load referrer account. Please try again.' })
  })

  it('returns 403 (unchanged) for a genuinely wrong/forged code, not a DB error', async () => {
    const res = await GET(req(), params('WRONG-CODE'))

    expect(res.status).toBe(403)
  })

  it('returns 500 (not 404) when the tenant lookup itself fails', async () => {
    h.tenantResult = { data: null, error: { message: 'timeout' } }

    const res = await GET(req(), params('CODE1'))

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Could not load business. Please try again.' })
  })

  it('returns 404 (unchanged) when the tenant genuinely does not exist', async () => {
    h.tenantResult = { data: null, error: null }

    const res = await GET(req(), params('CODE1'))

    expect(res.status).toBe(404)
  })

  it('happy path still returns referrer + tenant + share_url', async () => {
    const res = await GET(req(), params('CODE1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.referrer.id).toBe('ref-1')
    expect(json.tenant.name).toBe('Acme')
    expect(json.share_url).toContain('CODE1')
  })
})
