import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * referrals/track POST rate-limit hardening.
 *
 * BUG (fixed this pass): unauthenticated referral_code lookup (bypasses RLS
 * via supabaseAdmin, returns valid/invalid + full tenant identity — a
 * code-guessing oracle exactly like referrers GET) had zero rate limiting,
 * unlike every other public code-lookup/form endpoint in this codebase
 * (94 routes use rateLimitDb; the sibling referrers/route.ts GET lookup uses
 * it with failClosed:true for the same reason). FIX: now goes through
 * rateLimitDb, failClosed:true, matching referrer-lookup's rationale.
 */

let rateLimitCalls: Array<{ key: string; max: number; windowMs: number; opts?: { failClosed?: boolean } }>
let rateLimitAllowed: boolean

const REFERRAL = { id: 'referral_1', tenant_id: 'tenant_1' }
const TENANT = { id: 'tenant_1', name: 'Acme', slug: 'acme' }

function referralsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: REFERRAL, error: null }),
  }
  return chain
}

function tenantsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: TENANT, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'referrals') return referralsBuilder()
      if (table === 'tenants') return tenantsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (
    key: string,
    max: number,
    windowMs: number,
    opts?: { failClosed?: boolean }
  ) => {
    rateLimitCalls.push({ key, max, windowMs, opts })
    return rateLimitAllowed
      ? { allowed: true, remaining: max - 1 }
      : { allowed: false, remaining: 0 }
  },
}))

import { POST } from './route'

function postReq(body: unknown): Request {
  return {
    json: async () => body,
    headers: { get: () => '203.0.113.5' },
  } as unknown as Request
}

beforeEach(() => {
  rateLimitCalls = []
  rateLimitAllowed = true
})

describe('POST /api/referrals/track — rate limit is persistent + fail-closed', () => {
  it('calls the persistent rate limiter with failClosed:true (code-guessing oracle)', async () => {
    await POST(postReq({ referral_code: 'ABC123' }))

    expect(rateLimitCalls).toHaveLength(1)
    expect(rateLimitCalls[0].key).toBe('referrals-track:203.0.113.5')
    expect(rateLimitCalls[0].opts).toEqual({ failClosed: true })
  })

  it('serves the lookup when the limiter allows', async () => {
    const res = await POST(postReq({ referral_code: 'ABC123' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tenant.slug).toBe('acme')
  })

  it('fails closed (429) when the limiter denies — including a DB-outage denial', async () => {
    rateLimitAllowed = false
    const res = await POST(postReq({ referral_code: 'ABC123' }))
    expect(res.status).toBe(429)
  })
})
