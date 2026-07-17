import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/referrers/[code] — tenant.email in the response.
 *
 * BUG (fixed here): the response never included a tenant contact email at
 * all, only tenant.name/slug/primary_color. The shared /site/template
 * referral portal (site/template/referral/page.tsx) is the one client
 * component that shows a tenant support contact to the public, and until
 * this fix it had nothing real to read — it hardcoded "hi@example.com" for
 * every template tenant instead. Precedence mirrors the template's own
 * contact.email (site/template/_config/load.ts): tenants.email, then
 * tenants.owner_email, else null (frontend falls back to a neutral
 * "Contact the business directly" string rather than showing null).
 */

type Resolution = { data: unknown; error: unknown }

let resolveReferrers: () => Resolution
let resolveTenants: () => Resolution

function builder(table: string) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      if (table === 'referrers') return resolveReferrers()
      if (table === 'tenants') return resolveTenants()
      throw new Error(`unexpected maybeSingle table ${table}`)
    },
    then: (onFulfilled: (v: unknown) => unknown) => {
      // tenant_domains / referral_commissions queries just resolve to no rows
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const getReferrerAuth = vi.fn<() => { rid: string; tid: string } | null>()
vi.mock('@/lib/referrer-portal-auth', () => ({ getReferrerAuth: () => getReferrerAuth() }))

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

function get(code: string) {
  const req = new Request(`http://t/api/referrers/${code}`, {
    headers: { authorization: 'Bearer good-token' },
  })
  return GET(req, { params: Promise.resolve({ code }) })
}

beforeEach(() => {
  getReferrerAuth.mockReset().mockReturnValue({ rid: 'ref-1', tid: 'tenant-1' })
  resolveReferrers = () => ({ data: REFERRER_ROW, error: null })
})

describe('GET /api/referrers/[code] — tenant.email precedence', () => {
  it('prefers tenants.email over tenants.owner_email when both are set', async () => {
    resolveTenants = () => ({
      data: { name: 'Acme Cleaning', slug: 'acme', domain: null, primary_color: '#0d9488', email: 'support@acme.com', owner_email: 'owner@acme.com' },
      error: null,
    })

    const res = await get('PATT123')
    const body = await res.json()

    expect(body.tenant.email).toBe('support@acme.com')
  })

  it('falls back to tenants.owner_email when tenants.email is unset', async () => {
    resolveTenants = () => ({
      data: { name: 'Acme Cleaning', slug: 'acme', domain: null, primary_color: '#0d9488', email: null, owner_email: 'owner@acme.com' },
      error: null,
    })

    const res = await get('PATT123')
    const body = await res.json()

    expect(body.tenant.email).toBe('owner@acme.com')
  })

  it('returns null (not a fake placeholder) when the tenant has no email at all', async () => {
    resolveTenants = () => ({
      data: { name: 'Acme Cleaning', slug: 'acme', domain: null, primary_color: '#0d9488', email: null, owner_email: null },
      error: null,
    })

    const res = await get('PATT123')
    const body = await res.json()

    expect(body.tenant.email).toBeNull()
  })
})
