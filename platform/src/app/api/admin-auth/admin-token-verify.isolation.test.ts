import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import crypto from 'crypto'

/**
 * `verifyAdminToken` is the platform SUPER-ADMIN gate. It (or the token it
 * validates) stands in front of `/api/admin-auth/me`, `requireAdmin`,
 * `/api/admin/impersonate`, `system-check`, and `getTenantForRequest`. A false
 * "true" here is god-mode across every tenant, so its failure modes matter more
 * than the happy path.
 *
 * `verifyTenantAdminToken` is the per-tenant admin gate: a member PIN token is
 * minted bound to ONE tenant id, and the verifier must reject that token on any
 * other tenant (the cross-tenant isolation guard) AND must never let a
 * tenant-admin token satisfy the platform-super-admin gate, or vice-versa.
 *
 * Both functions read `ADMIN_TOKEN_SECRET` into a module-level const at import
 * time, so the "no secret configured => fail closed" case requires reloading the
 * module with the env var unset. Every collaborator the route file imports is
 * neutralized — the functions under test are pure crypto and touch none of them.
 *
 * These implementations were previously ONLY mocked (tenant-query.test.ts stubs
 * them); this is their first direct, non-vacuous coverage. Each rejection is
 * proven against a correctly-signed control so none of the tests pass vacuously.
 */

vi.mock('next/headers', () => ({ headers: async () => ({ get: () => null }) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))
vi.mock('@/lib/tenant-header-sig', () => ({ verifyTenantHeaderSig: () => false }))
vi.mock('@/lib/admin-pin', () => ({ hashAdminPin: (p: string) => p }))
vi.mock('@/lib/login-alert', () => ({ sendLoginAlert: async () => {} }))

const SECRET = 'admin-token-secret-under-test'
const FOREIGN_SECRET = 'a-different-secret-entirely'

const ORIG_SECRET = process.env.ADMIN_TOKEN_SECRET

type RouteModule = typeof import('./route')

/**
 * Reload the route module with `ADMIN_TOKEN_SECRET` set to `secret` (or unset
 * when `secret` is undefined). The module captures the secret at load time, so
 * each secret-sensitive case must import a fresh copy.
 */
async function loadRoute(secret: string | undefined): Promise<RouteModule> {
  vi.resetModules()
  if (secret === undefined) delete process.env.ADMIN_TOKEN_SECRET
  else process.env.ADMIN_TOKEN_SECRET = secret
  return import('./route')
}

/** Forge a `payload.hmac` token signed with an arbitrary secret. */
function mintToken(payload: object, secret: string): string {
  const raw = JSON.stringify(payload)
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return Buffer.from(raw).toString('base64') + '.' + sig
}

const future = () => Date.now() + 60 * 60 * 1000
const past = () => Date.now() - 60 * 1000

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = SECRET
})

afterAll(() => {
  if (ORIG_SECRET === undefined) delete process.env.ADMIN_TOKEN_SECRET
  else process.env.ADMIN_TOKEN_SECRET = ORIG_SECRET
})

describe('verifyAdminToken — super-admin gate', () => {
  it('accepts a freshly-minted super-admin token (non-vacuous: the gate can say yes)', async () => {
    const { createAdminToken, verifyAdminToken } = await loadRoute(SECRET)
    expect(verifyAdminToken(createAdminToken())).toBe(true)
  })

  it('fails closed when ADMIN_TOKEN_SECRET is not configured', async () => {
    // A perfectly well-formed super-admin token signed with SECRET...
    const wellFormed = mintToken({ role: 'super_admin', exp: future() }, SECRET)
    // ...is still rejected once the module loads with no secret at all.
    const { verifyAdminToken } = await loadRoute(undefined)
    expect(verifyAdminToken(wellFormed)).toBe(false)
  })

  it('rejects a token signed with a foreign secret', async () => {
    const forged = mintToken({ role: 'super_admin', exp: future() }, FOREIGN_SECRET)
    const { verifyAdminToken } = await loadRoute(SECRET)
    expect(verifyAdminToken(forged)).toBe(false)
  })

  it('rejects a tampered signature', async () => {
    const { createAdminToken, verifyAdminToken } = await loadRoute(SECRET)
    const token = createAdminToken()
    const [payloadB64, sig] = token.split('.')
    const flipped = sig.slice(0, -2) + (sig.endsWith('0') ? '11' : '00')
    expect(verifyAdminToken(`${payloadB64}.${flipped}`)).toBe(false)
  })

  it('rejects a wrong-length signature (length guard before timing-safe compare)', async () => {
    const { verifyAdminToken } = await loadRoute(SECRET)
    const payloadB64 = Buffer.from(JSON.stringify({ role: 'super_admin', exp: future() })).toString('base64')
    expect(verifyAdminToken(`${payloadB64}.abc`)).toBe(false)
  })

  it('rejects a malformed token with no signature segment', async () => {
    const { verifyAdminToken } = await loadRoute(SECRET)
    expect(verifyAdminToken('not-a-token')).toBe(false)
  })

  it('rejects a validly-signed but expired super-admin token', async () => {
    const expired = mintToken({ role: 'super_admin', exp: past() }, SECRET)
    const { verifyAdminToken } = await loadRoute(SECRET)
    expect(verifyAdminToken(expired)).toBe(false)
  })

  it('rejects a tenant-admin token at the super-admin gate (privilege isolation)', async () => {
    // A correctly-signed tenant_admin token must NEVER satisfy the platform
    // super-admin check — role is enforced, not just the signature.
    const { createTenantAdminToken, verifyAdminToken } = await loadRoute(SECRET)
    const tenantToken = createTenantAdminToken('tenant-A', 'member-1', 'manager')
    expect(verifyAdminToken(tenantToken)).toBe(false)
  })
})

describe('verifyTenantAdminToken — per-tenant admin gate', () => {
  it('accepts a tenant token on its OWN tenant and returns member id + role (non-vacuous)', async () => {
    const { createTenantAdminToken, verifyTenantAdminToken } = await loadRoute(SECRET)
    const token = createTenantAdminToken('tenant-A', 'member-1', 'manager')
    expect(verifyTenantAdminToken(token, 'tenant-A')).toEqual({ memberId: 'member-1', role: 'manager' })
  })

  it('rejects a tenant-A token when served for tenant B (cross-tenant isolation guard)', async () => {
    const { createTenantAdminToken, verifyTenantAdminToken } = await loadRoute(SECRET)
    const token = createTenantAdminToken('tenant-A', 'member-1', 'manager')
    expect(verifyTenantAdminToken(token, 'tenant-B')).toBeNull()
  })

  it('fails closed when ADMIN_TOKEN_SECRET is not configured', async () => {
    const wellFormed = mintToken(
      { role: 'tenant_admin', tenantId: 'tenant-A', memberId: 'm1', memberRole: 'staff', exp: future() },
      SECRET,
    )
    const { verifyTenantAdminToken } = await loadRoute(undefined)
    expect(verifyTenantAdminToken(wellFormed, 'tenant-A')).toBeNull()
  })

  it('rejects a tenant token signed with a foreign secret', async () => {
    const forged = mintToken(
      { role: 'tenant_admin', tenantId: 'tenant-A', memberId: 'm1', memberRole: 'staff', exp: future() },
      FOREIGN_SECRET,
    )
    const { verifyTenantAdminToken } = await loadRoute(SECRET)
    expect(verifyTenantAdminToken(forged, 'tenant-A')).toBeNull()
  })

  it('rejects a tampered signature', async () => {
    const { createTenantAdminToken, verifyTenantAdminToken } = await loadRoute(SECRET)
    const token = createTenantAdminToken('tenant-A', 'member-1', 'manager')
    const [payloadB64, sig] = token.split('.')
    const flipped = sig.slice(0, -2) + (sig.endsWith('0') ? '11' : '00')
    expect(verifyTenantAdminToken(`${payloadB64}.${flipped}`, 'tenant-A')).toBeNull()
  })

  it('rejects a wrong-length signature (length guard before timing-safe compare)', async () => {
    const { verifyTenantAdminToken } = await loadRoute(SECRET)
    const payloadB64 = Buffer.from(
      JSON.stringify({ role: 'tenant_admin', tenantId: 'tenant-A', memberId: 'm1', memberRole: 'staff', exp: future() }),
    ).toString('base64')
    expect(verifyTenantAdminToken(`${payloadB64}.abc`, 'tenant-A')).toBeNull()
  })

  it('rejects a super-admin token at the tenant gate (role isolation, reverse direction)', async () => {
    const { createAdminToken, verifyTenantAdminToken } = await loadRoute(SECRET)
    const superToken = createAdminToken()
    expect(verifyTenantAdminToken(superToken, 'tenant-A')).toBeNull()
  })

  it('rejects a validly-signed but expired tenant token', async () => {
    const expired = mintToken(
      { role: 'tenant_admin', tenantId: 'tenant-A', memberId: 'm1', memberRole: 'staff', exp: past() },
      SECRET,
    )
    const { verifyTenantAdminToken } = await loadRoute(SECRET)
    expect(verifyTenantAdminToken(expired, 'tenant-A')).toBeNull()
  })

  it('rejects a malformed token with no signature segment', async () => {
    const { verifyTenantAdminToken } = await loadRoute(SECRET)
    expect(verifyTenantAdminToken('not-a-token', 'tenant-A')).toBeNull()
  })

  it('defaults a token missing memberRole to least-privilege staff', async () => {
    // Legacy/edge tokens with no memberRole must resolve to 'staff', not undefined.
    const token = mintToken(
      { role: 'tenant_admin', tenantId: 'tenant-A', memberId: 'm1', exp: future() },
      SECRET,
    )
    const { verifyTenantAdminToken } = await loadRoute(SECRET)
    expect(verifyTenantAdminToken(token, 'tenant-A')).toEqual({ memberId: 'm1', role: 'staff' })
  })
})
