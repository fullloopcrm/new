import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'

/**
 * `getCurrentTenant()` (src/lib/tenant.ts) is the server-component tenant
 * resolver. One of its branches — `getAdminImpersonatedTenant` — lets a
 * platform operator act AS an arbitrary tenant when two things hold together:
 *
 *   1. a genuinely-signed `fl_impersonate` cookie naming the target tenant, AND
 *   2. a valid `admin_token`.
 *
 * That is a cross-tenant god-mode branch, so its FAIL-CLOSED behavior matters
 * more than the happy path. The escalation to guard against: a leaked or forged
 * impersonation cookie ALONE (without the admin_token gate) must never resolve
 * the target tenant, and a cookie whose HMAC does not verify must be rejected
 * BEFORE any tenant row is read.
 *
 * This gate was previously uncovered — no test imports tenant.ts. The adjacent
 * `tenant-query.test.ts` covers the *API-route* resolver (`getTenantForRequest`)
 * but STUBS `verifyImpersonationCookie` to a constant, so the cookie-signature
 * half of the gate is never actually exercised there. This file uses the REAL
 * `./impersonation` HMAC (only cookies / admin-token / supabase / header-sig are
 * mocked), so the signature check is genuinely part of the system under test.
 *
 * Every rejection is paired against an otherwise-identical control that DOES
 * resolve the tenant, so none of the fail-closed assertions pass vacuously.
 */

const SECRET = 'impersonation-gate-secret-under-test'
const ORIG_SECRET = process.env.ADMIN_TOKEN_SECRET
const ORIG_ALLOW_UNSIGNED = process.env.IMPERSONATION_ALLOW_UNSIGNED

// Controllable collaborator state (reset per test).
let cookieMap: Record<string, string>
let ownerUserId: string | null
let adminTokenValid: boolean
let headerSigValid: boolean

// Records exactly which tenant id the DB was asked for, so we can assert the
// gate resolves EXACTLY the cookie's tenant — and that a rejected request never
// touches the DB at all.
let queriedTenantId: string | null
let tenantsFromCalled: boolean

function sbBuilder(table: string) {
  const eqs: Record<string, unknown> = {}
  if (table === 'tenants') tenantsFromCalled = true
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      if (table === 'tenants' && col === 'id') queriedTenantId = String(val)
      return chain
    },
    single: async () => {
      if (table === 'tenants' && typeof eqs.id === 'string') {
        return { data: { id: eqs.id, name: `Tenant ${eqs.id}`, slug: eqs.id, status: 'active' }, error: null }
      }
      return { data: null, error: null }
    },
  }
  return chain
}

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (cookieMap[n] !== undefined ? { value: cookieMap[n] } : undefined),
  }),
  headers: async () => ({ get: () => null }),
}))
vi.mock('@/lib/owner-session', () => ({ getOwnerUserId: async () => ownerUserId }))
vi.mock('./supabase', () => ({ supabaseAdmin: { from: (t: string) => sbBuilder(t) } }))
vi.mock('@/app/api/admin-auth/route', () => ({ verifyAdminToken: () => adminTokenValid }))
vi.mock('./tenant-header-sig', () => ({ verifyTenantHeaderSig: () => headerSigValid }))
// NOTE: ./impersonation is intentionally NOT mocked — the real HMAC signer/verifier
// is part of the system under test.

import { getCurrentTenant, isImpersonating } from './tenant'
import { signImpersonation } from './impersonation'

const VICTIM = 't-victim-9f2a'

beforeEach(() => {
  process.env.ADMIN_TOKEN_SECRET = SECRET
  delete process.env.IMPERSONATION_ALLOW_UNSIGNED
  cookieMap = {}
  ownerUserId = null
  adminTokenValid = false
  headerSigValid = false
  queriedTenantId = null
  tenantsFromCalled = false
})

afterAll(() => {
  if (ORIG_SECRET === undefined) delete process.env.ADMIN_TOKEN_SECRET
  else process.env.ADMIN_TOKEN_SECRET = ORIG_SECRET
  if (ORIG_ALLOW_UNSIGNED === undefined) delete process.env.IMPERSONATION_ALLOW_UNSIGNED
  else process.env.IMPERSONATION_ALLOW_UNSIGNED = ORIG_ALLOW_UNSIGNED
})

describe('getCurrentTenant — admin impersonation gate (fail-closed)', () => {
  // ---- POSITIVE CONTROL: proves the gate CAN resolve, so the rejections below
  // are meaningful and not vacuous. ----
  it('resolves the impersonated tenant with a genuine signed cookie AND a valid admin_token', async () => {
    cookieMap['fl_impersonate'] = signImpersonation(VICTIM)
    cookieMap['admin_token'] = 'a-valid-admin-token'
    adminTokenValid = true

    const t = await getCurrentTenant()
    expect(t?.id).toBe(VICTIM)
    // isolation: the DB was queried for EXACTLY the cookie's tenant, nothing else.
    expect(queriedTenantId).toBe(VICTIM)
  })

  it('FAILS CLOSED: a genuine signed cookie WITHOUT an admin_token does not resolve the tenant', async () => {
    // Identical to the control except the admin_token cookie is absent. A leaked
    // impersonation cookie alone must not grant cross-tenant access.
    cookieMap['fl_impersonate'] = signImpersonation(VICTIM)
    // no admin_token
    adminTokenValid = true // even if the verifier WOULD say yes, there is no token to check

    const t = await getCurrentTenant()
    expect(t).toBeNull()
    expect(tenantsFromCalled).toBe(false)
  })

  it('FAILS CLOSED: a genuine signed cookie with an admin_token that does NOT verify is rejected', async () => {
    cookieMap['fl_impersonate'] = signImpersonation(VICTIM)
    cookieMap['admin_token'] = 'stolen-or-junk-token'
    adminTokenValid = false // verifyAdminToken rejects it

    const t = await getCurrentTenant()
    expect(t).toBeNull()
    expect(tenantsFromCalled).toBe(false)
  })

  it('FAILS CLOSED: a forged/tampered impersonation cookie is rejected BEFORE any tenant row is read', async () => {
    // Take a genuine signature and flip its last hex char so the HMAC no longer
    // verifies for VICTIM. A valid admin_token is present, isolating the failure
    // to the cookie signature.
    const genuine = signImpersonation(VICTIM)
    const tampered = genuine.slice(0, -1) + (genuine.endsWith('a') ? 'b' : 'a')
    cookieMap['fl_impersonate'] = tampered
    cookieMap['admin_token'] = 'a-valid-admin-token'
    adminTokenValid = true

    const t = await getCurrentTenant()
    expect(t).toBeNull()
    // The real HMAC gate must reject before touching the tenants table.
    expect(tenantsFromCalled).toBe(false)
    expect(queriedTenantId).toBeNull()
  })

  it('FAILS CLOSED: an attacker-supplied unsigned tenant id (raw uuid) is rejected when unsigned mode is off', async () => {
    // The forgeable path the security page warns about: a raw tenant id with no
    // signature must not be honored unless IMPERSONATION_ALLOW_UNSIGNED=1.
    cookieMap['fl_impersonate'] = VICTIM // no ".<hmac>" suffix
    cookieMap['admin_token'] = 'a-valid-admin-token'
    adminTokenValid = true

    const t = await getCurrentTenant()
    expect(t).toBeNull()
    expect(tenantsFromCalled).toBe(false)
  })

  it('CROSS-COOKIE ISOLATION: a cookie validly signed for tenant A cannot be replayed to resolve tenant B', async () => {
    // A genuine cookie minted for A carries A's HMAC. Rewriting only the tenant
    // portion to B (keeping A's signature) must fail — the signature is bound to
    // the tenant id it was minted for.
    const forA = signImpersonation('t-A-owned')
    const sigForA = forA.slice(forA.indexOf('.') + 1)
    const replayedToB = `${VICTIM}.${sigForA}`
    cookieMap['fl_impersonate'] = replayedToB
    cookieMap['admin_token'] = 'a-valid-admin-token'
    adminTokenValid = true

    const t = await getCurrentTenant()
    expect(t).toBeNull()
    expect(queriedTenantId).toBeNull()
  })
})

describe('isImpersonating — same gate, reported truthfully', () => {
  it('returns true for a genuine signed cookie + valid admin_token (positive control)', async () => {
    cookieMap['fl_impersonate'] = signImpersonation(VICTIM)
    cookieMap['admin_token'] = 'a-valid-admin-token'
    adminTokenValid = true
    expect(await isImpersonating()).toBe(true)
  })

  it('FAILS CLOSED: returns false for a genuine signed cookie when the admin_token does not verify and the user is not super-admin', async () => {
    cookieMap['fl_impersonate'] = signImpersonation(VICTIM)
    cookieMap['admin_token'] = 'junk'
    adminTokenValid = false
    ownerUserId = 'non-super-admin-clerk-user'
    expect(await isImpersonating()).toBe(false)
  })

  it('FAILS CLOSED: returns false for a forged cookie even with a valid admin_token', async () => {
    const genuine = signImpersonation(VICTIM)
    cookieMap['fl_impersonate'] = genuine.slice(0, -1) + (genuine.endsWith('a') ? 'b' : 'a')
    cookieMap['admin_token'] = 'a-valid-admin-token'
    adminTokenValid = true
    expect(await isImpersonating()).toBe(false)
  })
})
