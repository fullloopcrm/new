/**
 * POST /api/client/verify-code — no CAS on consuming the single-use code.
 *
 * The SELECT (via `.maybeSingle()`) that matches phone/email + code only
 * proves the code existed at READ time. The old "burn the code" step was an
 * unconditional `.delete().eq('tenant_id',...).eq('identifier',...)` whose
 * result was never checked — two concurrent verify-code calls for the same
 * still-valid code both passed the SELECT before either DELETE ran, and an
 * unconditional delete "succeeds" (0 or 1 rows removed, no error either way)
 * regardless of who got there first. Both requests fell through to resolve/
 * create a client and mint a session cookie from one single-use code — same
 * TOCTOU class fixed for portal_auth_codes and member_pin_reset_codes this
 * session (verification_codes even has the same unused `used` column).
 *
 * FIX: the delete is now scoped to the exact matched identifier+code and
 * checked via `.select()` for whether a row actually came back. The loser of
 * the race gets a clean 401 instead of a second silently-issued session.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const TENANT_ID = 'tenant-1'
const IDENTIFIER = 'victim@example.com'
const REAL_CODE = 'REALCODE1'

const CODE_ROW = { tenant_id: TENANT_ID, identifier: IDENTIFIER, code: REAL_CODE, expires_at: '2099-01-01T00:00:00Z' }

/** Set true by a test to simulate a concurrent request already having
 *  consumed the code by the time THIS request's CAS-delete runs. */
let consumedByRival = false

function verificationCodesTable() {
  const state: { eqs: Record<string, unknown>; op: 'select' | 'delete'; selectAfterWrite: boolean } = {
    eqs: {},
    op: 'select',
    selectAfterWrite: false,
  }
  const builder = {
    select: () => {
      if (state.op === 'delete') state.selectAfterWrite = true
      return builder
    },
    eq(col: string, val: unknown) {
      state.eqs[col] = val
      return builder
    },
    delete: () => {
      state.op = 'delete'
      return builder
    },
    maybeSingle: async () => {
      const row =
        CODE_ROW.tenant_id === state.eqs.tenant_id &&
        CODE_ROW.identifier === state.eqs.identifier &&
        CODE_ROW.code === state.eqs.code
          ? CODE_ROW
          : null
      return { data: row, error: null }
    },
    then: (resolve: (r: { data: unknown; error: null }) => void) => {
      if (state.op === 'delete' && state.selectAfterWrite) {
        // A rival request winning the race means THIS delete's CAS filters
        // (identifier + code) no longer match anything — mirrors a real
        // Postgres DELETE ... RETURNING that already lost the row.
        const matched =
          !consumedByRival &&
          CODE_ROW.tenant_id === state.eqs.tenant_id &&
          CODE_ROW.identifier === state.eqs.identifier &&
          CODE_ROW.code === state.eqs.code
        resolve({ data: matched ? [CODE_ROW] : [], error: null })
        return
      }
      resolve({ data: null, error: null })
    },
  }
  return builder
}

function clientsTable() {
  return {
    select: () => ({
      eq: () => ({
        ilike: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }),
      }),
    }),
    insert: (row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => ({ data: { id: 'client-1', do_not_service: false, ...row }, error: null }),
      }),
    }),
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'verification_codes') return verificationCodesTable()
      if (table === 'clients') return clientsTable()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: TENANT_ID })),
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 10 })),
}))
vi.mock('@/lib/client-auth', () => ({
  createClientSession: vi.fn(() => 'signed-session-token'),
  clientSessionCookieOptions: vi.fn(() => ({
    name: 'client_session', httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 3600, path: '/',
  })),
  randomClientPin: vi.fn(() => '482913'),
  MAX_CLIENT_PIN_ATTEMPTS: 5,
}))

import { POST } from './route'

function postJson(body: unknown) {
  return POST(
    new NextRequest('http://x/api/client/verify-code', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  consumedByRival = false
})

describe('POST /api/client/verify-code — single-use code TOCTOU race', () => {
  it('rejects the CAS-consume when a rival request already burned the code between the read and the write', async () => {
    consumedByRival = true

    const res = await postJson({ email: IDENTIFIER, code: REAL_CODE })
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/already used/i)
    expect(json.client).toBeUndefined()
  })

  it('a genuinely fresh code still succeeds (no regression)', async () => {
    const res = await postJson({ email: IDENTIFIER, code: REAL_CODE })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.client.id).toBe('client-1')
  })
})
