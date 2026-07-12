import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getTenantForRequest is the auth + tenant gate that EVERY API route runs
 * through. It decides which tenant a request is scoped to, so a wrong branch =
 * cross-tenant access or a broken login. It was previously untested. These
 * tests exercise each resolution branch and, critically, prove the negative
 * cases: a forged/invalid signed header cannot grant tenant context, and an
 * unauthenticated caller is rejected rather than silently defaulted.
 *
 * Every external dependency is mocked so the branch logic is what's under test:
 *   - ./supabase           supabaseAdmin query builder (single() + insert())
 *   - next/headers         cookies() / headers()
 *   - @/lib/owner-session  getOwnerUserId (Clerk)
 *   - ./impersonation      verifyImpersonationCookie
 *   - ./tenant-header-sig  verifyTenantHeaderSig
 *   - admin-auth route     verifyAdminToken / verifyTenantAdminToken
 */

// SUPER_ADMIN_IDS is captured at module load from this env, so it must be set
// BEFORE ./tenant-query is imported. vi.hoisted runs before the import graph.
vi.hoisted(() => {
  process.env.SUPER_ADMIN_CLERK_ID = 'super-1'
})

// ── controllable per-test state ─────────────────────────────────────────────
type Eqs = Record<string, unknown>
let dbResolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let inserts: Array<{ table: string; payload: unknown }>
let cookieMap: Record<string, string>
let headerMap: Record<string, string>
let impersonateId: string | null
let ownerUserId: string | null
let adminTokenValid: boolean
let tenantAdminResult: { memberId: string; role: string } | null
let headerSigValid: boolean

vi.mock('./supabase', () => {
  function builder(table: string) {
    const eqs: Eqs = {}
    const chain: {
      select: () => typeof chain
      eq: (c: string, v: unknown) => typeof chain
      single: () => Promise<{ data: unknown; error: unknown }>
      insert: (payload: unknown) => Promise<{ error: null }>
    } = {
      select: () => chain,
      eq: (c: string, v: unknown) => {
        eqs[c] = v
        return chain
      },
      single: async () => dbResolve(table, eqs),
      insert: async (payload: unknown) => {
        inserts.push({ table, payload })
        return { error: null }
      },
    }
    return chain
  }
  return { supabaseAdmin: { from: (t: string) => builder(t) } }
})

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (k: string) => (k in cookieMap ? { value: cookieMap[k] } : undefined),
  }),
  headers: async () => ({ get: (k: string) => headerMap[k] ?? null }),
}))

vi.mock('@/lib/owner-session', () => ({
  getOwnerUserId: async () => ownerUserId,
}))

vi.mock('./impersonation', () => ({
  IMPERSONATE_COOKIE: 'fl_impersonate',
  // Real fn maps a signed cookie → tenant id. Mock: any present cookie yields
  // the test-configured impersonateId; absent cookie yields null.
  verifyImpersonationCookie: (raw: string | undefined) => (raw ? impersonateId : null),
}))

vi.mock('./tenant-header-sig', () => ({
  verifyTenantHeaderSig: () => headerSigValid,
}))

vi.mock('@/app/api/admin-auth/route', () => ({
  verifyAdminToken: () => adminTokenValid,
  verifyTenantAdminToken: (_token: string, _tenantId: string) => tenantAdminResult,
}))

import { getTenantForRequest, AuthError } from './tenant-query'

const tenantRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't-1',
  slug: 'acme',
  name: 'Acme',
  status: 'active',
  ...over,
})

beforeEach(() => {
  dbResolve = () => ({ data: null, error: null })
  inserts = []
  cookieMap = {}
  headerMap = {}
  impersonateId = null
  ownerUserId = null
  adminTokenValid = false
  tenantAdminResult = null
  headerSigValid = false
})

describe('getTenantForRequest — rejection / negative paths', () => {
  it('throws AuthError 401 when there is no impersonation, no signed header, and no Clerk user', async () => {
    await expect(getTenantForRequest()).rejects.toMatchObject({
      constructor: AuthError,
      status: 401,
    })
  })

  it('does NOT grant tenant context from a signed header whose signature is invalid (forgery guard)', async () => {
    // Attacker supplies x-tenant-id + admin_token but no valid signature.
    headerMap['x-tenant-id'] = 't-victim'
    headerMap['x-tenant-sig'] = 'forged'
    cookieMap['admin_token'] = 'whatever'
    headerSigValid = false // signature does not verify
    adminTokenValid = true // even a valid admin token must not rescue a bad sig
    // No Clerk user → falls through to 401, never resolves t-victim.
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })

  it('throws AuthError 404 when the Clerk user has no tenant membership', async () => {
    ownerUserId = 'u-nomember'
    dbResolve = (table) =>
      table === 'tenant_members' ? { data: null, error: null } : { data: null, error: null }
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 404 })
  })
})

describe('getTenantForRequest — impersonation', () => {
  it('resolves the impersonated tenant for a PIN admin and audits the event', async () => {
    cookieMap['fl_impersonate'] = 'signed-cookie'
    cookieMap['admin_token'] = 'admin-tok'
    impersonateId = 't-imp'
    adminTokenValid = true
    dbResolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-imp'
        ? { data: tenantRow({ id: 't-imp', slug: 'imp' }), error: null }
        : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx).toMatchObject({ userId: 'admin', tenantId: 't-imp', role: 'owner' })
    // impersonation must be recorded in the audit log
    expect(inserts.some((i) => i.table === 'impersonation_events')).toBe(true)
  })

  it('resolves the impersonated tenant for a Clerk super-admin', async () => {
    cookieMap['fl_impersonate'] = 'signed-cookie'
    impersonateId = 't-super-imp'
    ownerUserId = 'super-1' // matches SUPER_ADMIN_CLERK_ID set via vi.hoisted
    dbResolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-super-imp'
        ? { data: tenantRow({ id: 't-super-imp' }), error: null }
        : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx).toMatchObject({ userId: 'super-1', tenantId: 't-super-imp', role: 'owner' })
    expect(inserts.some((i) => i.table === 'impersonation_events')).toBe(true)
  })
})

describe('getTenantForRequest — signed tenant-domain header', () => {
  it('grants owner context to a global super-admin token on the tenant\'s own domain', async () => {
    headerMap['x-tenant-id'] = 't-dom'
    headerMap['x-tenant-sig'] = 'good-sig'
    cookieMap['admin_token'] = 'admin-tok'
    headerSigValid = true
    adminTokenValid = true
    dbResolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-dom'
        ? { data: tenantRow({ id: 't-dom', slug: 'dom' }), error: null }
        : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx).toMatchObject({ userId: 'admin', tenantId: 't-dom', role: 'owner' })
  })

  it('grants member context to a per-tenant token minted for THIS domain', async () => {
    headerMap['x-tenant-id'] = 't-dom'
    headerMap['x-tenant-sig'] = 'good-sig'
    cookieMap['admin_token'] = 'member-tok'
    headerSigValid = true
    adminTokenValid = false // not the global super-admin token
    tenantAdminResult = { memberId: 'm-7', role: 'staff' }
    dbResolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-dom'
        ? { data: tenantRow({ id: 't-dom' }), error: null }
        : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx).toMatchObject({ userId: 'm-7', tenantId: 't-dom', role: 'staff' })
  })

  it('rejects a per-tenant token NOT minted for this domain (falls through to 401)', async () => {
    headerMap['x-tenant-id'] = 't-dom'
    headerMap['x-tenant-sig'] = 'good-sig'
    cookieMap['admin_token'] = 'member-tok-for-other-tenant'
    headerSigValid = true
    adminTokenValid = false
    tenantAdminResult = null // verifyTenantAdminToken rejects (wrong tenant)
    // No Clerk user behind it → 401, never resolves t-dom.
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })
})

describe('getTenantForRequest — normal Clerk membership flow', () => {
  it('resolves the tenant the Clerk user is a member of, with the membership role', async () => {
    ownerUserId = 'u-42'
    dbResolve = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'u-42')
        return { data: { tenant_id: 't-9', role: 'manager' }, error: null }
      if (table === 'tenants' && eqs.id === 't-9')
        return { data: tenantRow({ id: 't-9', slug: 'nine' }), error: null }
      return { data: null, error: null }
    }

    const ctx = await getTenantForRequest()
    expect(ctx).toMatchObject({ userId: 'u-42', tenantId: 't-9', role: 'manager' })
    // a normal member login is NOT an impersonation — nothing audited
    expect(inserts.some((i) => i.table === 'impersonation_events')).toBe(false)
  })

  it('throws AuthError 404 when the membership points at a tenant row that no longer exists', async () => {
    ownerUserId = 'u-orphan'
    dbResolve = (table, eqs) => {
      if (table === 'tenant_members') return { data: { tenant_id: 't-gone', role: 'owner' }, error: null }
      if (table === 'tenants' && eqs.id === 't-gone') return { data: null, error: null }
      return { data: null, error: null }
    }
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 404 })
  })
})
