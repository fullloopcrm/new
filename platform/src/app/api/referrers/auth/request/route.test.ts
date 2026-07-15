import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * Referrer OTP request — CSPRNG regression test.
 *
 * BUG (fixed in 49f8f5e2): the login code was generated with
 * `Math.floor(100000 + Math.random() * 900000)`. Math.random() is not
 * cryptographically secure — its output is predictable from observed values,
 * letting an attacker narrow/predict a valid login OTP.
 *
 * FIX: `100000 + randomInt(0, 900000)` from node:crypto. Same 6-digit range,
 * no behavior change. This test proves Math.random() is never invoked to
 * produce the code, and that the emailed code is still a valid 6-digit value.
 */

const REFERRER = { id: 'ref_1', name: 'Pat', email: 'pat@example.com' }

let sentEmails: Array<{ to: string; subject: string; html: string }>
let updatePayloads: Array<Record<string, unknown>>

function tenantsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({
      data: { name: 'Acme Cleaning', primary_color: '#0d9488', resend_api_key: null, resend_domain: null },
      error: null,
    }),
  }
  return chain
}

function referrersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    update: (payload: Record<string, unknown>) => { updatePayloads.push(payload); return chain },
    eq: () => chain,
    ilike: () => chain,
    maybeSingle: async () => ({ data: REFERRER, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsBuilder()
      if (table === 'referrers') return referrersBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: 'tenant_1' }),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 5 }),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: async (opts: { to: string; subject: string; html: string }) => {
    sentEmails.push(opts)
  },
}))

import { POST } from './route'

function req(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: { get: () => 'unknown' },
  } as unknown as NextRequest
}

beforeEach(() => {
  sentEmails = []
  updatePayloads = []
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

describe('referrer OTP request — uses crypto RNG, not Math.random()', () => {
  it('never calls Math.random() while generating the login code', async () => {
    const mathRandomSpy = vi.spyOn(Math, 'random')
    const response = await POST(req({ email: REFERRER.email }))

    expect(response.status).toBe(200)
    expect(mathRandomSpy).not.toHaveBeenCalled()
    mathRandomSpy.mockRestore()
  })

  it('emails a valid 6-digit code in the 100000-999999 range', async () => {
    await POST(req({ email: REFERRER.email }))

    expect(sentEmails).toHaveLength(1)
    const code = sentEmails[0].subject.split(' ')[0]
    expect(code).toMatch(/^\d{6}$/)
    const n = Number(code)
    expect(n).toBeGreaterThanOrEqual(100000)
    expect(n).toBeLessThanOrEqual(999999)

    // The stored hash update ran with a code derived from the same value.
    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0].otp_hash).toBeTruthy()
  })
})
