import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/referrers/[code] — referrer earnings dashboard, bearer-token gated.
 *
 * BUG (fixed here): both the referrer lookup and the tenant lookup used
 * `.single()` with the `error` field discarded (only `data` destructured). A
 * genuine transient DB failure surfaces identically to "0 rows" once
 * destructured this way:
 *   - referrer lookup: a DB failure looked identical to "no such referrer"
 *     and fell into the SAME 403 Forbidden a real cross-tenant/forged-token
 *     request gets — masking a server outage as an auth rejection.
 *   - tenant lookup: a DB failure looked identical to "tenant deleted" and
 *     returned 404 instead of a server error.
 * Fixed with maybeSingle() + explicit error check + 500, mirroring the
 * pattern already applied throughout tenant.ts / tenant-lookup.ts /
 * tenant-query.ts / api/tenants/route.ts.
 */

type Resolution = { data: unknown; error: unknown }

const calls: { table: string; eqs: Record<string, unknown> }[] = []
let resolveReferrers: (eqs: Record<string, unknown>) => Resolution
let resolveTenants: (eqs: Record<string, unknown>) => Resolution

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      calls.push({ table, eqs })
      if (table === 'referrers') return resolveReferrers(eqs)
      if (table === 'tenants') return resolveTenants(eqs)
      throw new Error(`unexpected maybeSingle table ${table}`)
    },
    // Mirrors maybeSingle()'s resolution so the mutation test isolates what
    // the route DOES with a returned error (checked vs discarded), not which
    // method name it called.
    single: async () => {
      calls.push({ table, eqs })
      if (table === 'referrers') return resolveReferrers(eqs)
      if (table === 'tenants') return resolveTenants(eqs)
      throw new Error(`unexpected single table ${table}`)
    },
    then: (onFulfilled: (v: unknown) => unknown) => {
      // tenant_domains / referral_commissions queries just resolve to no rows
      calls.push({ table, eqs })
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const getReferrerAuth = vi.fn<(request: Request) => { rid: string; tid: string } | null>()
vi.mock('@/lib/referrer-portal-auth', () => ({ getReferrerAuth: (r: Request) => getReferrerAuth(r) }))

import { GET } from './route'

const REFERRER_ROW = {
  id: 'ref-1',
  tenant_id: 'tenant-1',
  name: 'Pat',
  email: 'pat@example.com',
  referral_code: 'PATT123',
  commission_rate: 0.1,
  total_earned: 5000,
  total_paid: 2000,
}

const TENANT_ROW = {
  name: 'Acme Cleaning',
  slug: 'acme',
  domain: null,
  primary_color: '#0d9488',
}

function get(code: string) {
  const req = new Request(`http://t/api/referrers/${code}`, {
    headers: { authorization: 'Bearer good-token' },
  })
  return GET(req, { params: Promise.resolve({ code }) })
}

beforeEach(() => {
  calls.length = 0
  getReferrerAuth.mockReset().mockReturnValue({ rid: 'ref-1', tid: 'tenant-1' })
  resolveReferrers = () => ({ data: REFERRER_ROW, error: null })
  resolveTenants = () => ({ data: TENANT_ROW, error: null })
})

describe('GET /api/referrers/[code] — masked-error PROBEs', () => {
  it('REFERRER_LOOKUP_ERROR PROBE: a DB failure on the referrer lookup returns 500, not the same 403 a forged/cross-tenant token gets', async () => {
    resolveReferrers = () => ({ data: null, error: { message: 'upstream connect error' } })

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await get('PATT123')
    errSpy.mockRestore()

    expect(res.status).toBe(500)
    expect(res.status).not.toBe(403)
  })

  it('TENANT_LOOKUP_ERROR PROBE: a DB failure on the tenant lookup returns 500, not the same 404 a deleted tenant gets', async () => {
    resolveTenants = () => ({ data: null, error: { message: 'upstream connect error' } })

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await get('PATT123')
    errSpy.mockRestore()

    expect(res.status).toBe(500)
    expect(res.status).not.toBe(404)
  })

  it('WRONG-TENANT PROBE: a valid token for a DIFFERENT tenant\'s referrer is still rejected 403, not served this referrer\'s earnings', async () => {
    getReferrerAuth.mockReturnValue({ rid: 'ref-1', tid: 'some-other-tenant' })

    const res = await get('PATT123')

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).not.toHaveProperty('referrer')
    expect(body).not.toHaveProperty('stats')
  })

  it('a mismatched code for an otherwise-valid token is still rejected 403 (not served under the wrong code)', async () => {
    const res = await get('SOMEONE-ELSES-CODE')

    expect(res.status).toBe(403)
  })

  it('happy path still returns 200 with referrer + tenant data once both lookups succeed', async () => {
    const res = await get('PATT123')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.referrer.referral_code).toBe('PATT123')
    expect(body.tenant.name).toBe('Acme Cleaning')
  })
})
