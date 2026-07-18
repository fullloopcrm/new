import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/referrals/track is fully anonymous (public referral-link click
 * tracker) and had no rate limit. Unlike every other public-token route in
 * this codebase (invoice/quote/document public links use 192-bit
 * randomBytes tokens), referral_code is a short 6-char Math.random()
 * base36 code — brute-force-enumerable at high request volume without a
 * throttle, letting a scripted caller harvest tenant id/name/slug for every
 * live referral code. Now capped per IP via rateLimitDb, same pattern as
 * /api/feedback and /api/contact.
 */

const { rateLimitAllowed } = vi.hoisted(() => ({ rateLimitAllowed: { value: true } }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

const referralLookupMock = vi.fn(async () => ({ data: { id: 'ref-1', tenant_id: 'tenant-1' } }))
const tenantLookupMock = vi.fn(async () => ({ data: { id: 'tenant-1', name: 'Acme', slug: 'acme' } }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => (table === 'referrals' ? referralLookupMock() : tenantLookupMock()),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function makeRequest(body: Record<string, unknown>, ip = '1.2.3.4') {
  return new Request('http://localhost/api/referrals/track', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/referrals/track — rate limit', () => {
  it('429s once the per-IP rate limit is exhausted, before any code-enumeration lookup', async () => {
    rateLimitAllowed.value = false
    const res = await POST(makeRequest({ referral_code: 'ABC123' }))
    expect(res.status).toBe(429)
    expect(referralLookupMock).not.toHaveBeenCalled()
  })

  it('allows a normal lookup through when under the limit', async () => {
    rateLimitAllowed.value = true
    const res = await POST(makeRequest({ referral_code: 'ABC123' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tenant.slug).toBe('acme')
  })
})
