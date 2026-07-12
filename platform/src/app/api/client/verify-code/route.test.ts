import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/verify-code — phone cross-client collision regression test.
 *
 * BUG (fixed in ffa048ae): client resolution matched on
 * `cDigits.endsWith(phoneDigits) || phoneDigits.endsWith(cDigits)`, so a code
 * verified for one phone could resolve a DIFFERENT client whose stored number
 * was a suffix/superset of it (e.g. malformed/junk-prefixed data that happens
 * to end with the same digits), handing the attacker that other client's
 * session.
 *
 * FIX: compare the full national number exactly (last 10 digits, dropping a
 * leading US "1" so 10- vs 11-digit stored formats still match), never a
 * partial/suffix match.
 */

const TENANT_ID = 'tenant_1'
const CODE = '654321'
const REQUESTER_DIGITS = '2125551234'

let clientsInTenant: Array<{ id: string; phone: string; do_not_service: boolean; email: string | null }>

function verificationCodesBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    delete: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({
      data: { code: CODE, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
      error: null,
    }),
  }
  return chain
}

function clientsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    // Terminal call for the phone-match path: select('*').eq('tenant_id', ...)
    // is awaited directly with no .single()/.maybeSingle(), so eq() itself
    // must resolve to the { data, error } shape.
    eq: () => ({ data: clientsInTenant, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'verification_codes') return verificationCodesBuilder()
      if (table === 'clients') return clientsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 5 }),
}))

vi.mock('@/lib/notify', () => ({
  notify: async () => {},
}))

import { POST } from './route'

function req(body: unknown): Request {
  return {
    json: async () => body,
    headers: { get: () => 'unknown' },
  } as unknown as Request
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'test-portal-secret'
})

describe('client/verify-code — exact phone match (no suffix cross-match)', () => {
  it('resolves the exact-match client, not a different client whose number is merely a superset', async () => {
    // Wrong client listed FIRST — under the old endsWith bug, .find() would
    // return this one since "99992125551234".endsWith("2125551234") is true.
    clientsInTenant = [
      { id: 'client_wrong_superset', phone: '99992125551234', do_not_service: false, email: null },
      { id: 'client_correct_exact', phone: REQUESTER_DIGITS, do_not_service: false, email: null },
    ]

    const res = await POST(req({ phone: REQUESTER_DIGITS, code: CODE }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.client.id).toBe('client_correct_exact')
  })

  it('does NOT resolve a client whose stored number is only a suffix/superset match', async () => {
    // Only the wrong-superset client exists — no exact match anywhere.
    clientsInTenant = [
      { id: 'client_wrong_superset', phone: '99992125551234', do_not_service: false, email: null },
    ]

    const res = await POST(req({ phone: REQUESTER_DIGITS, code: CODE }))
    const data = await res.json()

    // No email was supplied either, so an unresolved client is a hard failure
    // rather than falling through to auto-create — proving the superset
    // number was correctly rejected as a candidate.
    expect(res.status).toBe(500)
    expect(data.error).toBe('Could not resolve account')
  })

  it('positive control: 11-digit stored number (leading US "1") still matches a 10-digit request', async () => {
    clientsInTenant = [
      { id: 'client_11digit', phone: `1${REQUESTER_DIGITS}`, do_not_service: false, email: null },
    ]

    const res = await POST(req({ phone: REQUESTER_DIGITS, code: CODE }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.client.id).toBe('client_11digit')
  })
})
