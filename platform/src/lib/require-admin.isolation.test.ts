import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import crypto from 'crypto'

/**
 * `requireAdmin()` (src/lib/require-admin.ts) is the shared platform-super-admin
 * gate mounted at the top of ~40 `/api/admin/*` route handlers (clients,
 * businesses, sms, comhub/*, settings, sales, …). It is the ONLY thing between a
 * request and god-mode, cross-tenant admin data, so its contract must fail
 * CLOSED:
 *
 *   - no `admin_token` cookie                         -> 401
 *   - a cookie whose HMAC/role/exp does not verify    -> 401
 *   - ONLY a genuine super-admin token                -> pass (returns null)
 *
 * This gate was previously uncovered — no test imports require-admin.ts. It
 * delegates to the REAL `verifyAdminToken` (@/app/api/admin-auth/route), and
 * this file uses that real HMAC verifier (only the route's heavy server-only
 * collaborators are stubbed), so the signature/role/exp check is genuinely part
 * of the system under test rather than a mock returning a constant.
 *
 * Every rejection is paired against a positive control that DOES authorize, so
 * none of the 401 assertions pass vacuously ("always blocks" would fail the
 * control).
 */

const SECRET = 'require-admin-secret-under-test'
const FOREIGN_SECRET = 'a-totally-different-secret'
const ORIG_SECRET = process.env.ADMIN_TOKEN_SECRET

// Neutralize the route module's server-only collaborators so importing it in a
// unit test is cheap. The HMAC verify inside verifyAdminToken stays real.
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))
vi.mock('@/lib/tenant-header-sig', () => ({ verifyTenantHeaderSig: () => false }))
vi.mock('@/lib/admin-pin', () => ({ hashAdminPin: (p: string) => p }))
vi.mock('@/lib/login-alert', () => ({ sendLoginAlert: async () => {} }))

// Controllable admin_token cookie (reset per test).
let adminTokenCookie: string | undefined
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'admin_token' && adminTokenCookie !== undefined ? { value: adminTokenCookie } : undefined,
  }),
  headers: async () => ({ get: () => null }),
}))

type RouteModule = typeof import('@/app/api/admin-auth/route')

/**
 * Reload require-admin (and the route module it pulls verifyAdminToken from)
 * with `ADMIN_TOKEN_SECRET` set to `secret` (or unset when undefined). The route
 * captures the secret in a module-level const at load time, so each
 * secret-sensitive case must import a fresh copy.
 */
async function load(
  secret: string | undefined,
): Promise<{ requireAdmin: () => Promise<import('next/server').NextResponse | null> } & RouteModule> {
  vi.resetModules()
  if (secret === undefined) delete process.env.ADMIN_TOKEN_SECRET
  else process.env.ADMIN_TOKEN_SECRET = secret
  const route = await import('@/app/api/admin-auth/route')
  const { requireAdmin } = await import('./require-admin')
  return { requireAdmin, ...route }
}

/** Forge a `payload.hmac` token signed with an arbitrary secret. */
function mintToken(payload: object, secret: string): string {
  const raw = JSON.stringify(payload)
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return Buffer.from(raw).toString('base64') + '.' + sig
}

const past = () => Date.now() - 60 * 1000

beforeEach(() => {
  adminTokenCookie = undefined
  process.env.ADMIN_TOKEN_SECRET = SECRET
})

afterAll(() => {
  if (ORIG_SECRET === undefined) delete process.env.ADMIN_TOKEN_SECRET
  else process.env.ADMIN_TOKEN_SECRET = ORIG_SECRET
})

describe('requireAdmin — positive control (gate opens)', () => {
  it('returns null for a genuine super-admin token (proves the gate can authorize)', async () => {
    const { requireAdmin, createAdminToken } = await load(SECRET)
    adminTokenCookie = createAdminToken()
    expect(await requireAdmin()).toBeNull()
  })
})

describe('requireAdmin — fail closed on missing / bad credentials', () => {
  it('401 when no admin_token cookie is present', async () => {
    const { requireAdmin } = await load(SECRET)
    adminTokenCookie = undefined
    const res = await requireAdmin()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('401 for an empty-string admin_token cookie', async () => {
    const { requireAdmin } = await load(SECRET)
    adminTokenCookie = ''
    const res = await requireAdmin()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('401 for a token with a tampered signature', async () => {
    const { requireAdmin, createAdminToken } = await load(SECRET)
    const token = createAdminToken()
    const [payloadB64, sig] = token.split('.')
    const flipped = sig.slice(0, -1) + (sig.endsWith('a') ? 'b' : 'a')
    adminTokenCookie = `${payloadB64}.${flipped}`
    const res = await requireAdmin()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('401 for a token signed with a foreign secret', async () => {
    const { requireAdmin } = await load(SECRET)
    // Correct shape + correct role/exp, but the HMAC was made with the wrong key.
    adminTokenCookie = mintToken({ role: 'super_admin', exp: Date.now() + 3600_000 }, FOREIGN_SECRET)
    const res = await requireAdmin()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('401 for a validly-signed but EXPIRED super-admin token', async () => {
    const { requireAdmin } = await load(SECRET)
    // Signed with the real secret, so the HMAC verifies — but exp is in the past.
    adminTokenCookie = mintToken({ role: 'super_admin', exp: past() }, SECRET)
    const res = await requireAdmin()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('401 for a malformed token with no signature segment', async () => {
    const { requireAdmin } = await load(SECRET)
    adminTokenCookie = 'not-a-real-token'
    const res = await requireAdmin()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })
})

describe('requireAdmin — privilege isolation', () => {
  it('401 for a genuine TENANT-admin token — a tenant admin can never pass the platform super-admin gate', async () => {
    const { requireAdmin, createTenantAdminToken } = await load(SECRET)
    // A correctly-signed, non-expired tenant-admin token: it authenticates a real
    // tenant member, but requireAdmin gates on super_admin only.
    adminTokenCookie = createTenantAdminToken('tenant-A', 'member-1', 'manager')
    const res = await requireAdmin()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })
})

describe('requireAdmin — fail closed on misconfiguration', () => {
  it('401 when ADMIN_TOKEN_SECRET is unset, even for an otherwise well-formed token', async () => {
    // Mint a token under a real secret, THEN load the gate with no secret. With
    // no secret, verifyAdminToken returns false, so the gate must block rather
    // than fall open.
    const wellFormed = mintToken({ role: 'super_admin', exp: Date.now() + 3600_000 }, SECRET)
    const { requireAdmin } = await load(undefined)
    adminTokenCookie = wellFormed
    const res = await requireAdmin()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })
})
