/**
 * POST /api/client/verify-code — OTP + email-ILIKE account-takeover regression.
 *
 * After a caller proves ownership of their OWN phone via a real SMS OTP, the
 * client-resolution fallback ran `.ilike('email', email.trim())` with raw
 * attacker input. Submitting `email: '%'` in the same request matched every
 * client row (ILIKE wildcard), letting any visitor who owns any phone number
 * log in AS an arbitrary existing client (real session cookie minted) and
 * overwrite that victim's stored email. Same bug class as the referrer OTP
 * wildcard fix (a7ef16d0) and the sibling client/book + client/check routes,
 * which already guard their `.ilike('email', ...)` calls with
 * escapeLikeValue() — this route was the one place that skipped it.
 *
 * This uses a real (if minimal) SQL LIKE-pattern matcher, not a naive
 * string-compare fake, because the property under test IS wildcard
 * semantics — see src/app/api/referrers/route.test.ts for the same pattern.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

function ilikeMatches(pattern: string, value: string): boolean {
  let regex = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      regex += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      regex += '.*'
    } else if (c === '_') {
      regex += '.'
    } else {
      regex += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${regex}$`, 'i').test(value)
}

const VICTIM = {
  id: 'victim-1',
  tenant_id: 'tenant-1',
  name: 'Victim',
  email: 'victim@example.com',
  phone: '2125551111',
  do_not_service: false,
}

const CODES = [
  { tenant_id: 'tenant-1', identifier: 'sms:3475559999', code: 'ATTACKER1', expires_at: '2099-01-01T00:00:00Z' },
  { tenant_id: 'tenant-1', identifier: 'victim@example.com', code: 'VICTIM1', expires_at: '2099-01-01T00:00:00Z' },
]

let clients: (typeof VICTIM)[] = []
let nextId = 0

function verificationCodesTable() {
  const state: { eqs: Record<string, unknown> } = { eqs: {} }
  const builder = {
    select: () => builder,
    eq(col: string, val: unknown) {
      state.eqs[col] = val
      return builder
    },
    delete: () => builder,
    maybeSingle: async () => {
      const row = CODES.find(
        (c) => c.tenant_id === state.eqs.tenant_id && c.identifier === state.eqs.identifier && c.code === state.eqs.code
      )
      return { data: row || null, error: null }
    },
    then: (resolve: (r: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
  }
  return builder
}

function clientsTable() {
  const state: {
    eqs: Record<string, unknown>
    ilike?: { col: string; val: string }
    limit?: number
    insertPayload?: Record<string, unknown>
    updatePayload?: Record<string, unknown>
  } = { eqs: {} }

  const builder = {
    select: () => builder,
    eq(col: string, val: unknown) {
      state.eqs[col] = val
      return builder
    },
    ilike(col: string, val: string) {
      state.ilike = { col, val }
      return builder
    },
    order: () => builder,
    limit(n: number) {
      state.limit = n
      return builder
    },
    update(payload: Record<string, unknown>) {
      state.updatePayload = payload
      return builder
    },
    insert(payload: Record<string, unknown>) {
      state.insertPayload = payload
      return builder
    },
    single: async () => {
      if (state.insertPayload) {
        const row = { id: `new-client-${++nextId}`, do_not_service: false, ...state.insertPayload } as typeof VICTIM
        clients.push(row)
        return { data: row, error: null }
      }
      return { data: null, error: { message: 'no insert payload' } }
    },
    then: (resolve: (r: { data: (typeof VICTIM)[] | null; error: null }) => void) => {
      if (state.updatePayload) {
        const row = clients.find((c) => c.id === state.eqs.id && c.tenant_id === state.eqs.tenant_id)
        if (row) Object.assign(row, state.updatePayload)
        resolve({ data: null, error: null })
        return
      }
      let rows = clients.filter((c) => c.tenant_id === state.eqs.tenant_id)
      if (state.ilike) {
        const { val } = state.ilike
        rows = rows.filter((c) => ilikeMatches(val, c.email))
      }
      if (state.limit) rows = rows.slice(0, state.limit)
      resolve({ data: rows, error: null })
    },
  }
  return builder
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
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 10 })),
}))
vi.mock('@/lib/client-auth', () => ({
  createClientSession: vi.fn(() => 'signed-session-token'),
  clientSessionCookieOptions: vi.fn(() => ({
    name: 'client_session',
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: 3600,
    path: '/',
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
  clients = [{ ...VICTIM }]
  nextId = 0
})

describe('POST /api/client/verify-code -- email ILIKE wildcard account takeover', () => {
  it('a caller who verifies their OWN phone cannot hijack another client via email:"%"', async () => {
    const res = await postJson({ phone: '3475559999', code: 'ATTACKER1', email: '%' })
    const json = await res.json()

    expect(res.status).toBe(200)
    // Must NOT resolve to the victim's account.
    expect(json.client.id).not.toBe('victim-1')
    expect(json.client.email).not.toBe('victim@example.com')
  })

  it('a partial wildcard like "%@example.com" does not match the victim either', async () => {
    const res = await postJson({ phone: '3475559999', code: 'ATTACKER1', email: '%@example.com' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.client.id).not.toBe('victim-1')
  })

  it('the victim email is never overwritten by the wildcard attempt', async () => {
    await postJson({ phone: '3475559999', code: 'ATTACKER1', email: '%' })
    const victim = clients.find((c) => c.id === 'victim-1')
    expect(victim?.email).toBe('victim@example.com')
  })

  it('positive control: exact email match still resolves the real client', async () => {
    const res = await postJson({ email: 'victim@example.com', code: 'VICTIM1' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.client.id).toBe('victim-1')
  })
})

describe('POST /api/client/verify-code -- phone endsWith cross-client account takeover', () => {
  const PHONE_VICTIM = {
    id: 'phone-victim-1',
    tenant_id: 'tenant-1',
    name: 'Phone Victim',
    email: 'phonevictim@example.com',
    // 11 digits, leading "9" (not a US country-code "1") — a genuinely
    // different national number that merely ENDS WITH the attacker's own
    // 10-digit number below. Realistic for sloppily-imported/international
    // numbers, same class the sibling fix (p1-w2 8fc5f304) targeted.
    phone: '92125551234',
    do_not_service: false,
  }
  const ATTACKER_PHONE = '2125551234'

  CODES.push({
    tenant_id: 'tenant-1',
    identifier: `sms:${ATTACKER_PHONE}`,
    code: 'PHONEATTACK1',
    expires_at: '2099-01-01T00:00:00Z',
  })

  beforeEach(() => {
    clients.push({ ...PHONE_VICTIM })
  })

  it('a caller who verifies their OWN phone cannot resolve a different client whose stored number merely ends with it', async () => {
    const res = await postJson({ phone: ATTACKER_PHONE, code: 'PHONEATTACK1' })
    const json = await res.json()

    // No client has this exact national number on file (only a lookalike),
    // and there's no email fallback in this request — correct behavior is to
    // fail closed rather than fall through to the WRONG client.
    expect(res.status).not.toBe(200)
    expect(json.client?.id).not.toBe('phone-victim-1')
  })

  it('positive control: an 11-digit stored number with a leading US "1" still matches its 10-digit national number', async () => {
    const usFormatVictim = { ...PHONE_VICTIM, id: 'us-format-victim', phone: `1${ATTACKER_PHONE}`, email: 'usformat@example.com' }
    clients.push(usFormatVictim)

    const res = await postJson({ phone: ATTACKER_PHONE, code: 'PHONEATTACK1' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.client.id).toBe('us-format-victim')
  })
})

describe('POST /api/client/verify-code -- response strips secrets/internal fields', () => {
  it('never returns the raw clients row (pin credential, internal fields) in the JSON body', async () => {
    clients = [{
      ...VICTIM,
      // Fields a raw `{ client }` response would otherwise leak: the
      // standalone client-portal login credential plus internal-only data.
      pin: '482913',
      selena_memory_summary: 'internal AI notes about this client',
      apology_credit_cents: 500,
    } as typeof VICTIM]

    const res = await postJson({ email: 'victim@example.com', code: 'VICTIM1' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.client.id).toBe('victim-1')
    expect(json.client).not.toHaveProperty('pin')
    expect(json.client).not.toHaveProperty('selena_memory_summary')
    expect(json.client).not.toHaveProperty('apology_credit_cents')
    // Only the UI-needed fields survive.
    expect(Object.keys(json.client).sort()).toEqual(['email', 'id', 'name', 'phone'])
  })
})
