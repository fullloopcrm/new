/**
 * CLIENT VERIFY-CODE ROUTE RACE — one-time-code double-use gap.
 *
 * TOCTOU audit finding (2026-07-13, deploy-prep/toctou-audit-p1-w3.md),
 * first of two bugs flagged for this route and left unfixed until now: "the
 * one-time code is checked via SELECT then burned via a separate DELETE — a
 * double-tap on 'verify' (or any concurrent retry) can race both requests
 * past the check before either delete lands." (The second flagged bug, the
 * duplicate-client-row race, was already closed — see route.race.test.ts —
 * but that fix never touched this one.)
 *
 * A verification_codes row is meant to be single-use: whoever submits the
 * correct code first should authenticate, and a second concurrent submit of
 * the SAME code should be rejected, not silently also succeed. Before this
 * fix, both requests could read the row (via the old separate SELECT) before
 * either's DELETE landed, so both would authenticate off one code.
 *
 * Fix: the check and the burn are now one DELETE...WHERE...RETURNING call —
 * an atomic claim, same shape as this codebase's other TOCTOU fixes
 * (`claim_open_job`, the payment/booking race guards). This suite proves
 * exactly one of two concurrent submits of the same code succeeds.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const EMAIL = 'existing@test.co'
const CODE = '654321'

function verifyRequest() {
  return new Request('http://x/api/client/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, code: CODE }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'test-secret'
  fake._store.clear()
  fake._seed('clients', [
    { id: 'existing-client', tenant_id: TENANT_ID, email: EMAIL, phone: '', do_not_service: false } as Row,
  ])
  fake._seed('verification_codes', [
    {
      id: 'vc-1',
      tenant_id: TENANT_ID,
      identifier: EMAIL,
      code: CODE,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    } as Row,
  ])
})

describe('POST /api/client/verify-code — one-time-code claim race', () => {
  it('two concurrent verifies with the same code: exactly one succeeds, the other is rejected', async () => {
    const results = await Promise.allSettled([POST(verifyRequest()), POST(verifyRequest())])
    const responses = results.map((r) => (r as PromiseFulfilledResult<Response>).value)
    const bodies = await Promise.all(responses.map((r) => r.json()))

    const statuses = responses.map((r) => r.status).sort()
    expect(statuses).toEqual([200, 401])

    const rejected = bodies.find((b, i) => responses[i].status === 401)
    expect(rejected.error).toBe('Invalid code')

    // The code row itself is gone exactly once — not left behind, not
    // double-consumed into some inconsistent state.
    expect(fake._all('verification_codes').length).toBe(0)
  })

  it('a genuinely expired code is rejected without being deleted (unchanged behavior)', async () => {
    fake._store.clear()
    fake._seed('clients', [{ id: 'existing-client', tenant_id: TENANT_ID, email: EMAIL, phone: '', do_not_service: false } as Row])
    fake._seed('verification_codes', [
      { id: 'vc-expired', tenant_id: TENANT_ID, identifier: EMAIL, code: CODE, expires_at: new Date(Date.now() - 1000).toISOString() } as Row,
    ])

    const res = await POST(verifyRequest())
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Code expired')
    // Expired row is left in place, same as before this fix.
    expect(fake._all('verification_codes').length).toBe(1)
  })

  it('a wrong code against an existing identifier is rejected as invalid, row untouched', async () => {
    const res = await POST(
      new Request('http://x/api/client/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email: EMAIL, code: '000000' }),
      }),
    )
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Invalid code')
    expect(fake._all('verification_codes').length).toBe(1)
  })

  it('single legitimate verify still succeeds and burns the code (no regression)', async () => {
    const res = await POST(verifyRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.client.id).toBe('existing-client')
    expect(fake._all('verification_codes').length).toBe(0)
  })
})
