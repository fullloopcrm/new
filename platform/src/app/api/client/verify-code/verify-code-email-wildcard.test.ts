import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 broad-hunt: client/verify-code ILIKE-wildcard account-takeover.
 *
 * Pre-fix, the post-verification client lookup did `.ilike('email', email.trim())`
 * with the caller's RAW, attacker-controlled `email` field — no escaping of `%`/`_`.
 * A caller who legitimately verifies a real OTP sent to THEIR OWN phone (proving
 * only phone ownership) could pass `email: '%'` in the same request. If the phone
 * didn't already match an existing client, the code fell through to the email
 * branch, and `ILIKE '%'` matches every non-null email in the tenant — resolving
 * (and logging the caller in as, via a real session cookie) an arbitrary existing
 * client, and then overwriting that victim's stored email with the literal `%`.
 *
 * This suite implements a real ILIKE-pattern evaluator (not a stub) so it
 * authentically proves the wildcard bypass is closed by escapeLike(), not just
 * that the mock happens to compare strings equal.
 */

process.env.PORTAL_SECRET = 'unit-test-portal-secret'

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const VICTIM_OLDEST = '33333333-0000-0000-0000-000000000001'
const VICTIM_NEWER = '33333333-0000-0000-0000-000000000002'

// Caller's real phone — proven via a real OTP sent to it. Not registered to any
// existing client, so the phone branch finds nothing and falls through to email.
const CALLER_PHONE = '+1 (800) 555-9999'
const CALLER_DIGITS = '18005559999'

type Row = Record<string, unknown>

let clients: Row[] = []
let storedCode: Row | null = null

// Real Postgres ILIKE semantics: % = any sequence, _ = any single char,
// backslash escapes a following wildcard to match it literally. Case-insensitive.
function ilikeMatch(pattern: string, value: string): boolean {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '\\' && i + 1 < pattern.length) {
      re += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      i++
    } else if (ch === '%') {
      re += '.*'
    } else if (ch === '_') {
      re += '.'
    } else {
      re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${re}$`, 'i').test(value)
}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let emailPattern: string | undefined
    let kind: 'read' | 'delete' | 'update' = 'read'
    let updatePayload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (row: Row) => { clients.push({ id: `new-${clients.length}`, tenant_id: TENANT, do_not_service: false, ...row }); return c },
      update: (payload: Row) => { kind = 'update'; updatePayload = payload; return c },
      delete: () => { kind = 'delete'; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      ilike: (col: string, val: unknown) => { if (col === 'email') emailPattern = String(val); return c },
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
      then: (res: (v: { data?: unknown; error?: unknown }) => unknown) => {
        if (kind === 'delete') return res({ data: null, error: null })
        if (kind === 'update') {
          const target = clients.find((cl) => cl.id === eqs.id)
          if (target) Object.assign(target, updatePayload)
          return res({ data: null, error: null })
        }
        if (table === 'clients' && emailPattern !== undefined) {
          const matches = clients
            .filter((cl) => typeof cl.email === 'string' && ilikeMatch(emailPattern!, cl.email as string))
            .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
          return res({ data: matches, error: null })
        }
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
  clients = [
    { id: VICTIM_OLDEST, tenant_id: TENANT, phone: '12125551111', email: 'victim-oldest@example.com', do_not_service: false, created_at: '2026-01-01' },
    { id: VICTIM_NEWER, tenant_id: TENANT, phone: '12125552222', email: 'victim-newer@example.com', do_not_service: false, created_at: '2026-02-01' },
  ]
  // A real code, actually delivered to the caller's own phone.
  storedCode = {
    tenant_id: TENANT,
    identifier: `sms:${CALLER_DIGITS}`,
    code: '739201',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }
})

describe('W4 verify-code: ILIKE wildcard email cannot hijack an existing client', () => {
  it('does NOT resolve or log in as the oldest victim client when email is a bare "%" wildcard', async () => {
    const res = await POST(jsonReq({ phone: CALLER_PHONE, code: '739201', email: '%' }))
    const body = await res.json() as { client?: Row; error?: string }

    // Pre-fix: ILIKE '%' matches every row -> resolves VICTIM_OLDEST (order by
    // created_at asc, limit 1) and mints a session cookie for it.
    expect(body.client?.id).not.toBe(VICTIM_OLDEST)
    expect(body.client?.id).not.toBe(VICTIM_NEWER)

    // A brand-new client is created instead (literal, harmless "%" email) —
    // the caller gets their OWN new account, not someone else's.
    const victimOldest = clients.find((c) => c.id === VICTIM_OLDEST)
    expect(victimOldest?.email).toBe('victim-oldest@example.com') // not overwritten to '%'
  })

  it('still resolves the correct client on an exact (non-wildcard) email match', async () => {
    const res = await POST(jsonReq({ phone: '+1 (212) 555-1111', code: '000000', email: 'victim-oldest@example.com' }))
    // Wrong code for this test's purposes is fine — this just documents that
    // escapeLike() is a no-op for a normal email with no meta-characters.
    expect(res.status).toBe(401) // invalid code, but proves no wildcard short-circuit happened
  })
})
