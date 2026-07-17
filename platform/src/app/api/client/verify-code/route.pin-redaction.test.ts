import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/verify-code — clients.pin redaction probe.
 *
 * BUG (fixed here): the phone-match/email-match lookups both do
 * `select('*')` on `clients`, and the matched row is returned wholesale as
 * `{ client, do_not_service: false }` — including `pin`, the plaintext
 * client-portal login PIN that POST /api/client/login checks directly
 * (`.eq('pin', pin)`). That sibling route deliberately narrows its own
 * SELECT to `id, do_not_service` to avoid ever returning it; this OTP-flow
 * sibling drifted from that invariant. No frontend consumer reads
 * `client.pin` from this route's response (unlike POST /api/client/book,
 * whose 4 booking-form frontends deliberately read `data.clients.pin` once
 * to show a brand-new client their PIN — that route is correctly left
 * alone). Same shape as the tenant_members.pin_hash fix.
 */

const TENANT_ID = 'tenant_1'
const CODE = '654321'
const PHONE = '2125551234'
const SECRET_PIN = '739284'

let clientsInTenant: Array<{ id: string; phone: string; do_not_service: boolean; email: string | null; pin?: string }>

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
    // is awaited directly with no .single()/.maybeSingle().
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

describe('client/verify-code — pin redaction probe', () => {
  it('never returns clients.pin in the response body', async () => {
    clientsInTenant = [
      { id: 'client_correct', phone: PHONE, do_not_service: false, email: null, pin: SECRET_PIN },
    ]

    const res = await POST(req({ phone: PHONE, code: CODE }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.client.pin).toBeUndefined()
    expect(JSON.stringify(data.client)).not.toContain(SECRET_PIN)
  })

  it('CONTROL: still returns the resolved client id (session-establishing field)', async () => {
    clientsInTenant = [
      { id: 'client_correct', phone: PHONE, do_not_service: false, email: null, pin: SECRET_PIN },
    ]

    const res = await POST(req({ phone: PHONE, code: CODE }))
    const data = await res.json()

    expect(data.client.id).toBe('client_correct')
  })
})
