import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * `protectClientAPI(requiredClientId?)` (src/lib/nycmaid/auth.ts) is the
 * customer-portal authorization gate: it verifies the signed `client_session`
 * cookie, then enforces that the session's client (a) is still serviceable and
 * (b) matches the client the request is acting on. Its four fail-closed exits:
 *
 *   - no client_session cookie                 -> 401 Not logged in
 *   - session HMAC/expiry does not verify      -> 401 Session expired
 *   - client row flagged do_not_service        -> 401 Session expired  (REVOCATION)
 *   - session client !== requiredClientId      -> 403 Unauthorized      (ISOLATION)
 *
 * The route-level IDOR suites (client-idor*.test.ts) exercise the 401/403 exits
 * INDIRECTLY through routes, but they pin the client row to
 * `do_not_service:false`, so the revocation branch is never taken. This file
 * covers the gate DIRECTLY — including that revocation branch — using the REAL
 * createClientSession/verifyClientSession HMAC (only next/headers + supabase are
 * mocked). A positive control that returns `{ clientId }` proves the gate can
 * open, so the rejections below are not vacuous.
 */

const ADMIN_PASSWORD = 'client-portal-secret-under-test'
const ORIG_PW = process.env.ADMIN_PASSWORD

const CLIENT_A = 'client-A-9f2a'
const CLIENT_B = 'client-B-7d1c'

// Controllable collaborator state (reset per test).
let sessionCookie: string | undefined
let clientDoNotService: boolean
// Records which client id the clients table was filtered by, so we can assert
// the gate checks the SESSION's own client — never an attacker-supplied one.
let queriedClientId: string | null

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'client_session' && sessionCookie !== undefined ? { value: sessionCookie } : undefined,
  }),
  headers: async () => ({ get: () => null }),
}))

function sbBuilder(table: string) {
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      if (table === 'clients' && col === 'id') queriedClientId = String(val)
      return chain
    },
    single: async () => {
      if (table === 'clients') return { data: { do_not_service: clientDoNotService }, error: null }
      return { data: null, error: null }
    },
  }
  return chain
}
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => sbBuilder(t) } }))

import { protectClientAPI, createClientSession } from './auth'

/** Forge a client_session with a real HMAC but an arbitrary timestamp. */
function mintSession(clientId: string, timestampMs: number): string {
  const payload = `${clientId}.${timestampMs}`
  const sig = crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update(payload).digest('hex')
  return `${payload}.${sig}`
}

beforeEach(() => {
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD
  sessionCookie = undefined
  clientDoNotService = false
  queriedClientId = null
})

afterEach(() => {
  if (ORIG_PW === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = ORIG_PW
})

describe('protectClientAPI — positive control (gate opens)', () => {
  it('returns { clientId } for a genuine session with a serviceable client and no required id', async () => {
    sessionCookie = createClientSession(CLIENT_A)
    const res = await protectClientAPI()
    expect(res).not.toBeInstanceOf(NextResponse)
    expect(res).toEqual({ clientId: CLIENT_A })
    // isolation: the serviceability check was scoped to the session's own client.
    expect(queriedClientId).toBe(CLIENT_A)
  })

  it('returns { clientId } when requiredClientId matches the session client', async () => {
    sessionCookie = createClientSession(CLIENT_A)
    const res = await protectClientAPI(CLIENT_A)
    expect(res).toEqual({ clientId: CLIENT_A })
  })
})

describe('protectClientAPI — fail closed on missing / invalid session', () => {
  it('401 when no client_session cookie is present', async () => {
    sessionCookie = undefined
    const res = await protectClientAPI()
    expect(res).toBeInstanceOf(NextResponse)
    expect((res as NextResponse).status).toBe(401)
    // No session -> the clients table must never be queried.
    expect(queriedClientId).toBeNull()
  })

  it('401 for a tampered session signature — verified BEFORE any DB read', async () => {
    const genuine = createClientSession(CLIENT_A)
    sessionCookie = genuine.slice(0, -1) + (genuine.endsWith('a') ? 'b' : 'a')
    const res = await protectClientAPI()
    expect(res).toBeInstanceOf(NextResponse)
    expect((res as NextResponse).status).toBe(401)
    expect(queriedClientId).toBeNull()
  })

  it('401 for a validly-signed session older than 30 days', async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000
    sessionCookie = mintSession(CLIENT_A, thirtyOneDaysAgo)
    const res = await protectClientAPI()
    expect(res).toBeInstanceOf(NextResponse)
    expect((res as NextResponse).status).toBe(401)
    expect(queriedClientId).toBeNull()
  })
})

describe('protectClientAPI — revocation (do_not_service)', () => {
  it('401 when the session is genuine but the client row is flagged do_not_service', async () => {
    // A fired / banned client keeps a still-valid signed cookie; access must be
    // revoked at the gate. This branch is untouched by the route-level IDOR suites.
    sessionCookie = createClientSession(CLIENT_A)
    clientDoNotService = true
    const res = await protectClientAPI()
    expect(res).toBeInstanceOf(NextResponse)
    expect((res as NextResponse).status).toBe(401)
    // The revocation decision was made against the session's own client row.
    expect(queriedClientId).toBe(CLIENT_A)
  })
})

describe('protectClientAPI — cross-client isolation', () => {
  it('403 when a genuine session for client A is used to act on client B', async () => {
    // Session authenticates A; the request targets B. Even a serviceable, fully
    // valid A-session must not authorize acting as another client.
    sessionCookie = createClientSession(CLIENT_A)
    clientDoNotService = false
    const res = await protectClientAPI(CLIENT_B)
    expect(res).toBeInstanceOf(NextResponse)
    expect((res as NextResponse).status).toBe(403)
    // The gate resolved the client from the SIGNED session (A), not from the
    // attacker-supplied requiredClientId (B).
    expect(queriedClientId).toBe(CLIENT_A)
  })
})
