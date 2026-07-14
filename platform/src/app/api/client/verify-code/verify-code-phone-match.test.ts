import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the client/verify-code exact-phone-match
 * fix (ffa048ae).
 *
 * Fix ffa048ae replaced `cDigits.endsWith(phoneDigits) || phoneDigits.endsWith(cDigits)`
 * with an exact-equality compare of the normalized national number. Pre-fix, a
 * caller who verified a real OTP sent to THEIR OWN phone could still resolve —
 * and be logged in as — a DIFFERENT client in the same tenant whose stored phone
 * was a digit-suffix/superset of the caller's number (e.g. a malformed short
 * stored number like "5551234" is a suffix of the caller's real
 * "+1 (800) 555-1234"), because the old check only tested endsWith in either
 * direction with no length floor on the candidate.
 *
 * This suite proves the wrong-client resolution is closed while the legitimate
 * exact match still logs the right client in.
 */

process.env.PORTAL_SECRET = 'unit-test-portal-secret' // real client-auth signing key

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const VICTIM = '11111111-0000-0000-0000-000000000001'
const CALLER = '22222222-0000-0000-0000-000000000002'

// The caller's real phone. Digits: 18005551234 (11, valid national number).
const CALLER_PHONE = '+1 (800) 555-1234'
const CALLER_DIGITS = '18005551234'

// Victim's phone is malformed/short in the DB — a digit-suffix of the caller's
// number ("5551234" are the last 7 digits of 18005551234).
const VICTIM_PHONE_SHORT = '5551234'

type Row = Record<string, unknown>

let clients: Row[] = []
let storedCode: Row | null = null
const deletes: Array<{ table: string; eqs: Row }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'delete' = 'read'
    const c: Record<string, unknown> = {
      select: () => c,
      insert: () => c,
      update: () => c,
      delete: () => { kind = 'delete'; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      ilike: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      limit: () => c,
      maybeSingle: async () => {
        if (table === 'verification_codes') {
          if (storedCode && eqs.tenant_id === storedCode.tenant_id && eqs.identifier === storedCode.identifier && eqs.code === storedCode.code) {
            return { data: { ...storedCode }, error: null }
          }
          return { data: null, error: null }
        }
        return { data: null, error: null }
      },
      single: async () => ({ data: null, error: null }),
      then: (res: (v: { data?: unknown; error: unknown }) => unknown) => {
        if (kind === 'delete') { deletes.push({ table, eqs: { ...eqs } }); return res({ data: null, error: null }) }
        if (table === 'clients') return res({ data: clients.filter((c) => c.tenant_id === eqs.tenant_id), error: null })
        return res({ data: [], error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT, name: 'Canary', slug: 'canary' }),
}))

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 5 }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({ success: true }) }))

import { POST } from './route'

function jsonReq(body: Row): Request {
  return new Request('https://canary.example.com/api/client/verify-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  deletes.length = 0
  clients = [
    { id: VICTIM, tenant_id: TENANT, phone: VICTIM_PHONE_SHORT, email: 'victim@example.com', do_not_service: false },
  ]
  // A real code, issued to the CALLER's own phone identifier.
  storedCode = {
    tenant_id: TENANT,
    identifier: `sms:${CALLER_DIGITS}`,
    code: '482913',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }
})

describe('W4 verify-code: exact national-number match required (no suffix/superset cross-resolve)', () => {
  it('does NOT resolve a different client whose stored phone is a digit-suffix of the caller number', async () => {
    const res = await POST(jsonReq({ phone: CALLER_PHONE, code: '482913' }))
    const body = await res.json() as { client?: Row; error?: string }

    // Pre-fix this would have been 200 with client.id === VICTIM (session hijack).
    expect(body.client?.id).not.toBe(VICTIM)
    // No email was supplied so a non-match cannot fall through to account
    // creation either — the caller gets no session at all.
    expect(res.status).not.toBe(200)
    expect(res.cookies.get('client_session')).toBeFalsy()
  })

  it('STILL resolves the correct client on an exact national-number match (fix does not break legit login)', async () => {
    // Give the caller their own client row with the FULL matching number.
    clients.push({ id: CALLER, tenant_id: TENANT, phone: CALLER_PHONE, email: 'caller@example.com', do_not_service: false })

    const res = await POST(jsonReq({ phone: CALLER_PHONE, code: '482913' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { client: Row }
    expect(body.client.id).toBe(CALLER)
  })
})
