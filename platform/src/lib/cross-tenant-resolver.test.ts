/**
 * CROSS-TENANT SELF-ATTACK — request resolver + portal DB gates (integration).
 *
 * This drives the ACTUAL request-scoping entry points end-to-end, with only the
 * network boundary faked (next/headers cookies+headers, and supabase):
 *
 *   getTenantForRequest()   — every dashboard API route's tenant gate
 *   protectClientAPI()      — client-portal session → tenant binding
 *   requirePortalPermission — team-portal token → tenant-scoped member lookup
 *
 * Goal: with tenant A's credentials on tenant B's domain/context, resolution
 * must FAIL (or resolve to A only), never hand back tenant B.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const env = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  headers: new Map<string, string>(),
}))

vi.hoisted(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-admin-token-secret'
  process.env.TENANT_HEADER_SIG_SECRET = 'test-tenant-header-secret'
  process.env.PORTAL_SECRET = 'test-portal-secret'
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const v = env.cookies.get(name)
      return v === undefined ? undefined : { name, value: v }
    },
  }),
  headers: async () => ({
    get: (name: string) => env.headers.get(name) ?? null,
  }),
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from './tenant-query'
import { signTenantHeader } from './tenant-header-sig'
import { createTenantAdminToken, createAdminToken } from '@/app/api/admin-auth/route'
import { protectClientAPI, createClientSession } from './client-auth'
import { requirePortalPermission } from './team-portal-auth'
import { createToken as createTeamToken } from '@/app/api/team-portal/auth/token'

const A_ID = '11111111-1111-1111-1111-111111111111'
const B_ID = '22222222-2222-2222-2222-222222222222'
const fake = supabaseAdmin as unknown as FakeSupabase

function reseed() {
  fake._store.clear()
  env.cookies.clear()
  env.headers.clear()
  fake._seed('tenants', [
    { id: A_ID, name: 'Tenant A', slug: 'a', status: 'active', selena_config: null },
    { id: B_ID, name: 'Tenant B', slug: 'b', status: 'active', selena_config: null },
  ])
  fake._seed('clients', [
    { id: 'cl-a', tenant_id: A_ID, name: 'A Client', do_not_service: false },
  ])
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: A_ID, name: 'A Worker', status: 'active' },
    { id: 'tm-b', tenant_id: B_ID, name: 'B Worker', status: 'active' },
  ])
}
beforeEach(reseed)

describe('CROSS-TENANT ATTACK · getTenantForRequest (forged / cross-tenant headers)', () => {
  it('REJECTS a forged x-tenant-id for B with a bogus sig (no owner session) → 401', async () => {
    env.headers.set('x-tenant-id', B_ID)
    env.headers.set('x-tenant-sig', 'deadbeef')
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
    await expect(getTenantForRequest()).rejects.toBeInstanceOf(AuthError)
  })

  it("REJECTS tenant A's per-tenant admin token presented on tenant B's signed domain", async () => {
    env.headers.set('x-tenant-id', B_ID)
    env.headers.set('x-tenant-sig', signTenantHeader(B_ID))
    env.cookies.set('admin_token', createTenantAdminToken(A_ID, 'tm-a', 'owner'))
    // token is for A, domain is B → verifyTenantAdminToken(token, B) === null → falls through → 401
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })

  it("resolves to B ONLY with a per-tenant admin token minted for B (positive control)", async () => {
    env.headers.set('x-tenant-id', B_ID)
    env.headers.set('x-tenant-sig', signTenantHeader(B_ID))
    env.cookies.set('admin_token', createTenantAdminToken(B_ID, 'tm-b', 'owner'))
    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe(B_ID)
    expect(ctx.userId).toBe('tm-b')
  })

  it('super-admin token is intentionally god-mode on any signed domain (documented, not a leak)', async () => {
    env.headers.set('x-tenant-id', B_ID)
    env.headers.set('x-tenant-sig', signTenantHeader(B_ID))
    env.cookies.set('admin_token', createAdminToken())
    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe(B_ID)
    expect(ctx.role).toBe('owner')
  })

  it('REJECTS a signed header for B with NO admin token (nothing authorizes it) → 401', async () => {
    env.headers.set('x-tenant-id', B_ID)
    env.headers.set('x-tenant-sig', signTenantHeader(B_ID))
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })
})

describe('CROSS-TENANT ATTACK · protectClientAPI (client-portal session binding)', () => {
  it('accepts A session on tenant A (positive control)', async () => {
    env.cookies.set('client_session', createClientSession('cl-a', A_ID))
    const res = await protectClientAPI(A_ID)
    expect(res).toEqual({ clientId: 'cl-a' })
  })

  it("REJECTS tenant A's client session used on tenant B → 401", async () => {
    env.cookies.set('client_session', createClientSession('cl-a', A_ID))
    const res = await protectClientAPI(B_ID)
    expect('status' in (res as object)).toBe(true)
    expect((res as { status: number }).status).toBe(401)
  })

  it('REJECTS when no session cookie present → 401', async () => {
    const res = await protectClientAPI(A_ID)
    expect((res as { status: number }).status).toBe(401)
  })
})

describe('CROSS-TENANT ATTACK · requirePortalPermission (tenant-scoped member lookup)', () => {
  function req(token: string): Request {
    return new Request('http://tenant.example/api/team-portal/jobs', {
      headers: { authorization: `Bearer ${token}` },
    })
  }

  it('accepts an active A member with an A-scoped token (positive control)', async () => {
    const { auth, error } = await requirePortalPermission(req(createTeamToken('tm-a', A_ID, 0, 'worker')), 'jobs.view_own')
    expect(error).toBeNull()
    expect(auth?.tid).toBe(A_ID)
  })

  it("REJECTS an A-scoped token whose member id does not exist under tenant A → 401", async () => {
    // 'tm-b' is a real member, but under tenant B. An A-scoped token naming it
    // fails the `.eq('id', id).eq('tenant_id', A)` lookup — no cross-tenant reach.
    const { auth, error } = await requirePortalPermission(req(createTeamToken('tm-b', A_ID, 0, 'manager')), 'jobs.view_own')
    expect(auth).toBeNull()
    expect(error?.status).toBe(401)
  })

  it('REJECTS a suspended member instantly, even with a valid token (revocation)', async () => {
    fake._store.get('team_members')!.find((m) => m.id === 'tm-a')!.status = 'suspended'
    const { auth, error } = await requirePortalPermission(req(createTeamToken('tm-a', A_ID, 0, 'worker')), 'jobs.view_own')
    expect(auth).toBeNull()
    expect(error?.status).toBe(401)
  })

  it('REJECTS a request with no bearer token → 401', async () => {
    const { error } = await requirePortalPermission(new Request('http://tenant.example/x'), 'jobs.view_own')
    expect(error?.status).toBe(401)
  })
})
