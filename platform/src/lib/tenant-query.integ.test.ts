import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getTenantForRequest is the authorization gate in front of EVERY API route
 * (payments/checkout, booking mutations, settings, …). A flaw here is a
 * cross-tenant breach on the whole platform, so the adversarial cases matter
 * more than the happy paths:
 *
 *   - a per-tenant member token minted for tenant A must NOT authorize tenant B
 *     (verifyTenantAdminToken is scoped to the header tenant id)
 *   - a forged/unsigned x-tenant-id must be ignored even if a valid admin_token
 *     is attached (the signature is the only thing that binds a domain request
 *     to a tenant)
 *   - no valid credential of any kind → AuthError, never a silent tenant
 *
 * Every collaborator is mocked with a per-test toggle; the Supabase client is a
 * tiny builder whose .single() defers to a resolver keyed on (table, eq-filters).
 */

type Eqs = Record<string, unknown>
let dbResolver: (table: string, eqs: Eqs) => { data: unknown; error: unknown }

let cookieMap: Record<string, string>
let headerMap: Record<string, string>
let ownerUserId: string | null
let impersonateId: string | null
let adminTokenValid: boolean
let tenantAdminResult: { memberId: string; role: string } | null
let headerSigValid: boolean

function sbBuilder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => dbResolver(table, eqs),
    insert: async () => ({ error: null }), // impersonation_events audit (best-effort)
  }
  return chain
}

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (cookieMap[n] !== undefined ? { value: cookieMap[n] } : undefined),
  }),
  headers: async () => ({ get: (n: string) => headerMap[n] ?? null }),
}))
vi.mock('@/lib/owner-session', () => ({ getOwnerUserId: async () => ownerUserId }))
vi.mock('./supabase', () => ({ supabaseAdmin: { from: (t: string) => sbBuilder(t) } }))
vi.mock('@/app/api/admin-auth/route', () => ({
  verifyAdminToken: () => adminTokenValid,
  verifyTenantAdminToken: () => tenantAdminResult,
}))
vi.mock('./impersonation', () => ({
  IMPERSONATE_COOKIE: 'fl_impersonate',
  verifyImpersonationCookie: () => impersonateId,
}))
vi.mock('./tenant-header-sig', () => ({ verifyTenantHeaderSig: () => headerSigValid }))

import { getTenantForRequest, AuthError } from './tenant-query'

const tenantRow = (id: string) => ({ id, name: `Tenant ${id}`, slug: id, status: 'active' })

beforeEach(() => {
  cookieMap = {}
  headerMap = {}
  ownerUserId = null
  impersonateId = null
  adminTokenValid = false
  tenantAdminResult = null
  headerSigValid = false
  dbResolver = () => ({ data: null, error: null })
})

describe('getTenantForRequest — adversarial cross-tenant guards', () => {
  it('REJECTS a per-tenant member token minted for tenant A when used on tenant B', async () => {
    // Domain request for tenant B, validly signed header, admin_token attached —
    // but the token is NOT a global super-admin token and was NOT minted for B,
    // so verifyTenantAdminToken(token, 'B') returns null.
    headerMap['x-tenant-id'] = 't-B'
    headerMap['x-tenant-sig'] = 'sig'
    headerSigValid = true
    cookieMap['admin_token'] = 'member-token-for-A'
    adminTokenValid = false
    tenantAdminResult = null
    // With no other credential, the request must be rejected, not scoped to B.
    await expect(getTenantForRequest()).rejects.toBeInstanceOf(AuthError)
  })

  it('IGNORES a forged/unsigned x-tenant-id even with a valid admin_token', async () => {
    headerMap['x-tenant-id'] = 't-B'
    headerMap['x-tenant-sig'] = 'forged'
    headerSigValid = false // signature does not verify → whole header block skipped
    cookieMap['admin_token'] = 'valid-global-admin'
    adminTokenValid = true
    // Falls through to Clerk; no Clerk user → Unauthorized. A forged header must
    // never bind the request to t-B.
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })

  it('throws Unauthorized (401) when no credential of any kind is present', async () => {
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })

  it('throws 404 (No tenant found) for a valid Clerk user with no membership', async () => {
    ownerUserId = 'clerk-user-1'
    dbResolver = (table) => (table === 'tenant_members' ? { data: null, error: null } : { data: null, error: null })
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 404 })
  })
})

describe('getTenantForRequest — happy paths', () => {
  it('resolves a normal Clerk member to their tenant + role', async () => {
    ownerUserId = 'clerk-user-1'
    dbResolver = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'clerk-user-1')
        return { data: { tenant_id: 't-1', role: 'staff' }, error: null }
      if (table === 'tenants' && eqs.id === 't-1') return { data: tenantRow('t-1'), error: null }
      return { data: null, error: null }
    }
    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-1')
    expect(ctx.userId).toBe('clerk-user-1')
    expect(ctx.role).toBe('staff')
  })

  it('authorizes a per-tenant member token that WAS minted for this domain tenant', async () => {
    headerMap['x-tenant-id'] = 't-B'
    headerMap['x-tenant-sig'] = 'sig'
    headerSigValid = true
    cookieMap['admin_token'] = 'member-token-for-B'
    adminTokenValid = false
    tenantAdminResult = { memberId: 'm-9', role: 'manager' } // token verified against t-B
    dbResolver = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-B' ? { data: tenantRow('t-B'), error: null } : { data: null, error: null }
    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-B')
    expect(ctx.userId).toBe('m-9')
    expect(ctx.role).toBe('manager')
  })

  it('authorizes a global super-admin token on a tenant domain as owner', async () => {
    headerMap['x-tenant-id'] = 't-B'
    headerMap['x-tenant-sig'] = 'sig'
    headerSigValid = true
    cookieMap['admin_token'] = 'global-admin'
    adminTokenValid = true
    dbResolver = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-B' ? { data: tenantRow('t-B'), error: null } : { data: null, error: null }
    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-B')
    expect(ctx.userId).toBe('admin')
    expect(ctx.role).toBe('owner')
  })

  it('resolves a PIN-admin impersonation cookie to the impersonated tenant as owner', async () => {
    impersonateId = 't-imp'
    cookieMap['fl_impersonate'] = 'signed-cookie'
    cookieMap['admin_token'] = 'global-admin'
    adminTokenValid = true
    dbResolver = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-imp' ? { data: tenantRow('t-imp'), error: null } : { data: null, error: null }
    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-imp')
    expect(ctx.userId).toBe('admin')
    expect(ctx.role).toBe('owner')
  })
})
