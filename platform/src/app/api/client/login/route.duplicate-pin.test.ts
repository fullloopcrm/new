/**
 * CLIENT LOGIN DUPLICATE PIN — clients.pin has no DB-level uniqueness
 * guarantee (idx_clients_pin is a plain index, not unique; see
 * 2026_07_16_client_team_pin_hash.sql's header + the
 * 2026_07_17_clients_pin_dedupe.backfill.sql / 2026_07_17_clients_pin_unique.sql
 * pair prepared to close that gap). The PIN lookup here used
 * `.maybeSingle()`, which does NOT protect against a 2+ row match:
 * postgrest-js sets `data:null` with a PGRST116 error for both the 0-row
 * AND the 2+-row case, and the error went unchecked — so a legitimate
 * client whose PIN collided with another client's in the same tenant got a
 * permanent "Invalid PIN" lockout from self-service portal login. Same
 * failure class as this session's phone-lookup fixes (portal/auth
 * send_code, webhooks/telnyx).
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
  getTenantFromHeaders: vi.fn(async () => ({ id: TENANT_ID, name: 'Acme', slug: 'acme' })),
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

let cookieJar: Map<string, { value: string }>
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const PIN = '482913'

function seed(clients: Partial<Row>[]) {
  fake._store.clear()
  fake._seed('clients', clients)
  cookieJar = new Map()
}

function loginReq(pin: string) {
  return new Request('http://x/api/client/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'client-login-test-secret'
})

describe('POST /api/client/login — duplicate clients.pin rows', () => {
  it('still logs in (not a 401) when two clients in the same tenant share a PIN', async () => {
    seed([
      { id: 'client-1', tenant_id: TENANT_ID, name: 'First Client', pin: PIN, do_not_service: false },
      { id: 'client-2', tenant_id: TENANT_ID, name: 'Duplicate Client', pin: PIN, do_not_service: false },
    ])

    const res = await POST(loginReq(PIN))
    const body = await res.json()

    // Before the fix: .maybeSingle() swallowed the 2-row match as data:null
    // (same PGRST116 code as the 0-row case), client resolved to null, and
    // this legitimate client got a permanent 401 "Invalid PIN" lockout.
    expect(res.status).toBe(200)
    expect(['client-1', 'client-2']).toContain(body.client_id)
    expect(cookieJar.get('client_session')).toBeTruthy()
  })

  it('a genuinely wrong PIN still 401s (0-row case unaffected)', async () => {
    seed([{ id: 'client-1', tenant_id: TENANT_ID, name: 'Someone Else', pin: '999999', do_not_service: false }])

    const res = await POST(loginReq(PIN))
    expect(res.status).toBe(401)
  })

  it('the do_not_service gate still applies to whichever colliding row is picked (deterministic: lowest id first)', async () => {
    seed([
      { id: 'client-1', tenant_id: TENANT_ID, name: 'DNS Client', pin: PIN, do_not_service: true },
      { id: 'client-2', tenant_id: TENANT_ID, name: 'Active Client', pin: PIN, do_not_service: false },
    ])

    // order('id', ascending) picks client-1 first, which is do_not_service —
    // the gate must still reject it rather than silently falling through to
    // client-2.
    const res = await POST(loginReq(PIN))
    expect(res.status).toBe(401)
  })
})
