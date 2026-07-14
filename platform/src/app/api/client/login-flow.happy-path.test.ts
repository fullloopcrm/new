import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 client-portal LOGIN happy-path lock (gap #5 from e2e-flow-coverage.md §5:
 * the `client/send-code` → `verify-code` → session-mint POSITIVE path was
 * untested — only the OTP throttle / brute-force boundaries were covered).
 *
 * This is the GREEN companion to those negative-path tests. It proves a
 * legitimate client can actually log in, end-to-end:
 *
 *   1. POST /api/client/send-code stores a fresh code, tenant-scoped, and emails
 *      it. The exact code is captured from the upsert payload.
 *   2. POST /api/client/verify-code, presented with THAT code, resolves the
 *      client and mints a session cookie.
 *   3. The minted cookie decodes (real HMAC) to { clientId, tenantId } bound to
 *      the RESOLVING tenant — a regression that mints a wrong-scoped session, or
 *      silently fails to log a valid user in, is caught.
 *
 * It is a genuine round-trip: verify-code only succeeds because it presents the
 * exact code send-code stored (the DB mock returns the verification row ONLY on
 * an exact tenant_id+identifier+code match), so the mock cannot pass vacuously —
 * the second test proves a wrong code is rejected with no session.
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL (load-bearing): `createClientSession` / `verifyClientSessionToken` /
 * `clientSessionCookieOptions` (src/lib/client-auth.ts) — the actual HMAC
 * session mint, tenant-bound in the signature. This is the assertion that
 * matters: the session is valid AND scoped to the right tenant.
 * MOCKED: the DB (chainable supabase builder — repo convention, see
 * client-idor.test.ts; it captures the send-code upsert and echoes it back to
 * verify-code), tenant resolution, the rate limiter, and email/SMS/notify side
 * effects so nothing actually sends and imports resolve.
 */

process.env.PORTAL_SECRET = 'unit-test-portal-secret' // real client-auth signing key

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const CLIENT = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const EMAIL = 'canary@example.com'

type Row = Record<string, unknown>

// The single stored verification row (set by send-code's upsert, read by verify-code).
let storedCode: Row | null = null
const upserts: Array<{ table: string; payload: Row }> = []
const reads: Array<{ table: string; eqs: Row }> = []
const deletes: Array<{ table: string; eqs: Row }> = []

// An already-existing client the email lookup resolves to (no create-account branch).
const existingClient: Row = {
  id: CLIENT, tenant_id: TENANT, email: EMAIL, phone: '', name: 'Canary', do_not_service: false,
}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'upsert' | 'insert' | 'update' | 'delete' = 'read'
    const c: Record<string, unknown> = {
      select: () => c,
      upsert: (payload: Row) => { kind = 'upsert'; storedCode = { ...payload }; upserts.push({ table, payload }); return c },
      insert: () => { kind = 'insert'; return c },
      update: () => { kind = 'update'; return c },
      delete: () => { kind = 'delete'; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      ilike: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      limit: () => c,
      single: async () => { reads.push({ table, eqs: { ...eqs } }); return { data: null, error: null } },
      maybeSingle: async () => {
        reads.push({ table, eqs: { ...eqs } })
        if (table === 'verification_codes') {
          // Genuine round-trip: return the row ONLY on an exact, tenant-scoped match.
          if (
            storedCode &&
            eqs.tenant_id === storedCode.tenant_id &&
            eqs.identifier === storedCode.identifier &&
            eqs.code === storedCode.code
          ) {
            return { data: { ...storedCode }, error: null }
          }
          return { data: null, error: null }
        }
        return { data: null, error: null }
      },
      then: (res: (v: { data?: unknown; error: unknown; count?: number }) => unknown) => {
        if (kind === 'delete') { deletes.push({ table, eqs: { ...eqs } }); return res({ data: null, error: null }) }
        if (kind === 'upsert') return res({ error: null })
        if (table === 'clients') { reads.push({ table, eqs: { ...eqs } }); return res({ data: [existingClient], error: null }) }
        reads.push({ table, eqs: { ...eqs } })
        return res({ data: [], error: null, count: 0 })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({
    id: TENANT, name: 'Canary', slug: 'canary',
    resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null,
  }),
}))

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))

const emailSends: Array<{ to?: string; subject?: string; html?: string }> = []
vi.mock('@/lib/email', () => ({
  sendEmail: async (a: { to?: string; subject?: string; html?: string }) => { emailSends.push(a); return {} },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({ success: true }) }))

import { POST as sendCode } from '@/app/api/client/send-code/route'
import { POST as verifyCode } from '@/app/api/client/verify-code/route'
import { verifyClientSessionToken, clientSessionCookieOptions } from '@/lib/client-auth'

function jsonReq(url: string, body: Row): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.5' },
    body: JSON.stringify(body),
  })
}

describe('client portal login — send-code → verify-code → tenant-scoped session mint (gap #5)', () => {
  beforeEach(() => {
    storedCode = null
    upserts.length = 0
    reads.length = 0
    deletes.length = 0
    emailSends.length = 0
  })

  it('mints a valid session, scoped to the resolving tenant, for the exact code send-code issued', async () => {
    // STEP 1 — request a code.
    const sc = await sendCode(jsonReq('https://canary.example.com/api/client/send-code', { email: EMAIL }))
    expect(sc.status).toBe(200)
    expect(await sc.json()).toMatchObject({ success: true, method: 'email' })

    // The code was stored tenant-scoped, unused, addressed to the normalized email…
    expect(upserts).toHaveLength(1)
    expect(upserts[0].table).toBe('verification_codes')
    const stored = upserts[0].payload
    expect(stored.tenant_id).toBe(TENANT)
    expect(stored.identifier).toBe(EMAIL)
    expect(stored.used).toBe(false)
    expect(String(stored.code)).toMatch(/^\d{6}$/)

    // …and the email that went out actually carried that same code.
    expect(emailSends).toHaveLength(1)
    expect(emailSends[0].html).toContain(String(stored.code))

    const issuedCode = String(stored.code)

    // STEP 2 — verify with the exact issued code.
    const vc = await verifyCode(jsonReq('https://canary.example.com/api/client/verify-code', { email: EMAIL, code: issuedCode }))
    expect(vc.status).toBe(200)
    const vbody = (await vc.json()) as { client: Row; do_not_service: boolean }
    expect(vbody.client.id).toBe(CLIENT)
    expect(vbody.do_not_service).toBe(false)

    // STEP 3 — a session cookie was minted; decode it (REAL HMAC) → THIS client on THIS tenant.
    const opts = clientSessionCookieOptions()
    const cookie = vc.cookies.get(opts.name)
    expect(cookie).toBeTruthy()
    expect(cookie!.httpOnly).toBe(true)
    expect(cookie!.path).toBe('/')

    const decoded = verifyClientSessionToken(cookie!.value)
    expect(decoded).not.toBeNull()
    expect(decoded!.clientId).toBe(CLIENT)
    expect(decoded!.tenantId).toBe(TENANT) // ← load-bearing: session bound to the resolving tenant

    // The verification lookup that authorized the mint was itself tenant-scoped.
    const vfyRead = reads.find((r) => r.table === 'verification_codes' && r.eqs.code === issuedCode)
    expect(vfyRead?.eqs.tenant_id).toBe(TENANT)
    expect(vfyRead?.eqs.identifier).toBe(EMAIL)

    // The code was burned (single-use) — tenant-scoped delete.
    const burn = deletes.find((d) => d.table === 'verification_codes')
    expect(burn?.eqs.tenant_id).toBe(TENANT)
    expect(burn?.eqs.identifier).toBe(EMAIL)
  })

  it('rejects a wrong code with 401 and mints NO session (guards against a vacuous pass)', async () => {
    await sendCode(jsonReq('https://canary.example.com/api/client/send-code', { email: EMAIL }))
    const issued = String(upserts[0].payload.code)
    const wrong = issued === '000000' ? '111111' : '000000'

    const vc = await verifyCode(jsonReq('https://canary.example.com/api/client/verify-code', { email: EMAIL, code: wrong }))
    expect(vc.status).toBe(401)
    expect(vc.cookies.get('client_session')).toBeFalsy()
  })
})
