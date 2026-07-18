import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * getTenantForRequest() (src/lib/tenant-query.ts) is the single auth + tenant
 * resolution gate behind requirePermission() (119 call sites) and ~195 direct
 * importers — effectively every dashboard/admin API route. It arbitrates 4
 * distinct auth paths (admin-PIN impersonation, signed tenant-domain header +
 * admin/tenant-admin token, Clerk-replacement session + membership, Clerk
 * super-admin impersonation) and had zero direct test coverage before this
 * file, despite each sub-helper (verifyImpersonationCookie, verifyTenantHeaderSig,
 * verifyTenantAdminToken) being tested in isolation elsewhere.
 *
 * Mocking strategy mirrors tenant.test.ts: a tiny query-builder double for
 * supabaseAdmin keyed by (table, eq-filters), plus vi.fn() doubles for every
 * verifier so each auth path can be forced independently of its own crypto.
 */

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let singleCalls: Array<{ table: string; eqs: Eqs }>
let insertCalls: Array<{ table: string; row: unknown }>
let insertShouldThrow: boolean

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => {
      singleCalls.push({ table, eqs })
      return resolve(table, eqs)
    },
    maybeSingle: async () => {
      singleCalls.push({ table, eqs })
      return resolve(table, eqs)
    },
    insert: async (row: unknown) => {
      insertCalls.push({ table, row })
      if (insertShouldThrow) throw new Error('insert failed')
      return { data: null, error: null }
    },
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const mockCookieStore = new Map<string, string>()
const mockHeaderStore = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (mockCookieStore.has(name) ? { value: mockCookieStore.get(name) } : undefined) }),
  headers: async () => ({ get: (name: string) => mockHeaderStore.get(name) ?? null }),
}))

const verifyAdminToken = vi.fn<(token: string) => boolean>()
const verifyTenantAdminToken = vi.fn<(token: string, tenantId: string) => { memberId: string; role: string } | null>()
vi.mock('@/app/api/admin-auth/route', () => ({
  verifyAdminToken: (t: string) => verifyAdminToken(t),
  verifyTenantAdminToken: (t: string, id: string) => verifyTenantAdminToken(t, id),
}))

const verifyImpersonationCookie = vi.fn<(raw: string | undefined) => string | null>()
vi.mock('./impersonation', () => ({
  IMPERSONATE_COOKIE: 'fl_impersonate',
  verifyImpersonationCookie: (raw: string | undefined) => verifyImpersonationCookie(raw),
}))

const verifyTenantHeaderSig = vi.fn<(id: string, sig: string | null | undefined) => boolean>()
vi.mock('./tenant-header-sig', () => ({
  verifyTenantHeaderSig: (id: string, sig: string | null | undefined) => verifyTenantHeaderSig(id, sig),
}))

const getOwnerUserId = vi.fn<() => Promise<string | null>>()
vi.mock('@/lib/owner-session', () => ({
  getOwnerUserId: () => getOwnerUserId(),
}))

import { getTenantForRequest, AuthError } from './tenant-query'

const tenantRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 't-1',
  slug: 'acme',
  name: 'Acme',
  domain: 'acme.com',
  status: 'active',
  ...over,
})

beforeEach(() => {
  singleCalls = []
  insertCalls = []
  insertShouldThrow = false
  resolve = () => ({ data: null, error: null })
  mockCookieStore.clear()
  mockHeaderStore.clear()
  verifyAdminToken.mockReset().mockReturnValue(false)
  verifyTenantAdminToken.mockReset().mockReturnValue(null)
  verifyImpersonationCookie.mockReset().mockReturnValue(null)
  verifyTenantHeaderSig.mockReset().mockReturnValue(false)
  getOwnerUserId.mockReset().mockResolvedValue(null)
})

describe('getTenantForRequest — admin-PIN impersonation path', () => {
  it('returns the impersonated tenant as owner when the impersonation cookie + admin token are both valid', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue('t-1')
    verifyAdminToken.mockReturnValue(true)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1' ? { data: tenantRow(), error: null } : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx.userId).toBe('admin')
    expect(ctx.tenantId).toBe('t-1')
    expect(ctx.role).toBe('owner')
    // best-effort audit log fired
    expect(insertCalls.some((c) => c.table === 'impersonation_events')).toBe(true)
  })

  it('does not swallow the response when the impersonation audit insert throws (best-effort only)', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue('t-1')
    verifyAdminToken.mockReturnValue(true)
    insertShouldThrow = true
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1' ? { data: tenantRow(), error: null } : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-1')
  })

  it('WRONG-TENANT PROBE: an unsigned/forged impersonation cookie is rejected, not trusted as tenant id', async () => {
    mockCookieStore.set('fl_impersonate', 'forged-t-999')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue(null) // cookie fails signature check
    verifyAdminToken.mockReturnValue(true)
    getOwnerUserId.mockResolvedValue(null)

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
    expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.id === 't-999')).toBe(false)
  })

  it('falls through (does not authorize) when the impersonation cookie is valid but admin_token is missing', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    verifyImpersonationCookie.mockReturnValue('t-1')
    getOwnerUserId.mockResolvedValue(null)

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
    expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.id === 't-1')).toBe(false)
  })

  it('falls through when the admin token is invalid even if the impersonation cookie is valid', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    mockCookieStore.set('admin_token', 'bad-token')
    verifyImpersonationCookie.mockReturnValue('t-1')
    verifyAdminToken.mockReturnValue(false)
    getOwnerUserId.mockResolvedValue(null)

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })

  it('falls through when the impersonated tenant id does not resolve to a real tenant row', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue('t-ghost')
    verifyAdminToken.mockReturnValue(true)
    getOwnerUserId.mockResolvedValue(null)
    resolve = () => ({ data: null, error: null })

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })
})

describe('getTenantForRequest — signed tenant-domain header path', () => {
  it('authorizes the global super-admin token as owner of the header tenant', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    mockCookieStore.set('admin_token', 'global-token')
    verifyTenantHeaderSig.mockReturnValue(true)
    verifyAdminToken.mockReturnValue(true)
    getOwnerUserId.mockResolvedValue(null)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1' ? { data: tenantRow(), error: null } : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx.userId).toBe('admin')
    expect(ctx.tenantId).toBe('t-1')
    expect(ctx.role).toBe('owner')
  })

  it('authorizes a per-tenant admin token, using the role embedded in the token', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    mockCookieStore.set('admin_token', 'tenant-scoped-token')
    verifyTenantHeaderSig.mockReturnValue(true)
    verifyAdminToken.mockReturnValue(false) // not the global token
    verifyTenantAdminToken.mockImplementation((_t, tenantId) =>
      tenantId === 't-1' ? { memberId: 'member-5', role: 'manager' } : null,
    )
    getOwnerUserId.mockResolvedValue(null)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1' ? { data: tenantRow(), error: null } : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx.userId).toBe('member-5')
    expect(ctx.tenantId).toBe('t-1')
    expect(ctx.role).toBe('manager')
  })

  it('WRONG-TENANT PROBE: a per-tenant admin token minted for tenant A is rejected on tenant B\'s header, even with a valid header signature for B', async () => {
    mockHeaderStore.set('x-tenant-id', 't-B')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig-for-b')
    mockCookieStore.set('admin_token', 'token-minted-for-tenant-A')
    verifyTenantHeaderSig.mockReturnValue(true) // header sig for B genuinely valid
    verifyAdminToken.mockReturnValue(false)
    // verifyTenantAdminToken enforces the isolation guarantee itself: token's
    // embedded tenantId ('t-A') != expectedTenantId ('t-B') -> null.
    verifyTenantAdminToken.mockImplementation((_t, tenantId) => (tenantId === 't-A' ? { memberId: 'm', role: 'admin' } : null))
    getOwnerUserId.mockResolvedValue(null)
    resolve = () => ({ data: null, error: null })

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
    // must never have resolved tenant B's row via this rejected token
    expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.id === 't-B')).toBe(false)
  })

  it('does not trust an unsigned/invalid x-tenant-sig even when x-tenant-id is present', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'forged-sig')
    mockCookieStore.set('admin_token', 'global-token')
    verifyTenantHeaderSig.mockReturnValue(false)
    verifyAdminToken.mockReturnValue(true)
    getOwnerUserId.mockResolvedValue(null)

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
    expect(singleCalls.length).toBe(0)
  })

  it.each(['suspended', 'cancelled', 'deleted'])(
    'WRONG-STATUS PROBE: a per-tenant admin token for a %s tenant is refused (403), same rule the Clerk normal flow already enforces',
    async (status) => {
      mockHeaderStore.set('x-tenant-id', 't-1')
      mockHeaderStore.set('x-tenant-sig', 'valid-sig')
      mockCookieStore.set('admin_token', 'tenant-scoped-token')
      verifyTenantHeaderSig.mockReturnValue(true)
      verifyAdminToken.mockReturnValue(false) // not the global token
      verifyTenantAdminToken.mockImplementation((_t, tenantId) =>
        tenantId === 't-1' ? { memberId: 'member-5', role: 'manager' } : null,
      )
      getOwnerUserId.mockResolvedValue(null)
      resolve = (table, eqs) =>
        table === 'tenants' && eqs.id === 't-1' ? { data: tenantRow({ status }), error: null } : { data: null, error: null }

      await expect(getTenantForRequest()).rejects.toMatchObject({ status: 403, message: 'Tenant account is not active' })
    },
  )

  it('a pending tenant\'s per-tenant admin token is still authorized (only suspended/cancelled/deleted are dark)', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    mockCookieStore.set('admin_token', 'tenant-scoped-token')
    verifyTenantHeaderSig.mockReturnValue(true)
    verifyAdminToken.mockReturnValue(false)
    verifyTenantAdminToken.mockImplementation((_t, tenantId) =>
      tenantId === 't-1' ? { memberId: 'member-5', role: 'manager' } : null,
    )
    getOwnerUserId.mockResolvedValue(null)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1' ? { data: tenantRow({ status: 'pending' }), error: null } : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-1')
  })

  it('ESCAPE HATCH: the global super-admin token reaching a suspended tenant via its own domain header is still authorized (support must still reach dark accounts)', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    mockCookieStore.set('admin_token', 'global-token')
    verifyTenantHeaderSig.mockReturnValue(true)
    verifyAdminToken.mockReturnValue(true)
    getOwnerUserId.mockResolvedValue(null)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1' ? { data: tenantRow({ status: 'suspended' }), error: null } : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx.userId).toBe('admin')
    expect(ctx.tenantId).toBe('t-1')
  })

  it('falls through to Clerk when the header tenant row itself does not resolve', async () => {
    mockHeaderStore.set('x-tenant-id', 't-ghost')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    mockCookieStore.set('admin_token', 'global-token')
    verifyTenantHeaderSig.mockReturnValue(true)
    verifyAdminToken.mockReturnValue(true)
    getOwnerUserId.mockResolvedValue(null)
    resolve = () => ({ data: null, error: null })

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401 })
  })
})

describe('getTenantForRequest — Clerk-replacement session + membership path', () => {
  it('resolves the caller\'s own tenant + role via membership lookup', async () => {
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'user-42')
        return { data: { tenant_id: 't-7', role: 'staff' }, error: null }
      if (table === 'tenants' && eqs.id === 't-7') return { data: tenantRow({ id: 't-7' }), error: null }
      return { data: null, error: null }
    }

    const ctx = await getTenantForRequest()
    expect(ctx.userId).toBe('user-42')
    expect(ctx.tenantId).toBe('t-7')
    expect(ctx.role).toBe('staff')
  })

  it('throws Unauthorized (401) when no session/cookie/header path resolves at all', async () => {
    getOwnerUserId.mockResolvedValue(null)
    await expect(getTenantForRequest()).rejects.toBeInstanceOf(AuthError)
    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 401, message: 'Unauthorized' })
  })

  it('throws 404 "No tenant found" when the session is valid but has no membership row', async () => {
    getOwnerUserId.mockResolvedValue('user-orphan')
    resolve = () => ({ data: null, error: null })

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 404, message: 'No tenant found' })
  })

  it('throws 404 "Tenant not found" when membership exists but the tenant row is gone', async () => {
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'user-42')
        return { data: { tenant_id: 't-deleted', role: 'staff' }, error: null }
      return { data: null, error: null }
    }

    await expect(getTenantForRequest()).rejects.toMatchObject({ status: 404, message: 'Tenant not found' })
  })

  it('WRONG-TENANT PROBE: membership for tenant A never leaks tenant B\'s row even if both ids are requested in the same test run', async () => {
    getOwnerUserId.mockResolvedValue('user-A')
    resolve = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'user-A')
        return { data: { tenant_id: 't-A', role: 'owner' }, error: null }
      if (table === 'tenants' && eqs.id === 't-A') return { data: tenantRow({ id: 't-A', slug: 'tenant-a' }), error: null }
      if (table === 'tenants' && eqs.id === 't-B') return { data: tenantRow({ id: 't-B', slug: 'tenant-b' }), error: null }
      return { data: null, error: null }
    }

    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-A')
    expect(ctx.tenant.slug).toBe('tenant-a')
    expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.id === 't-B')).toBe(false)
  })

  it('a pending tenant\'s real owner is still authorized (only suspended/cancelled/deleted are dark)', async () => {
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'user-42')
        return { data: { tenant_id: 't-7', role: 'staff' }, error: null }
      if (table === 'tenants' && eqs.id === 't-7') return { data: tenantRow({ id: 't-7', status: 'pending' }), error: null }
      return { data: null, error: null }
    }

    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-7')
  })

  it.each(['suspended', 'cancelled', 'deleted'])(
    'WRONG-STATUS PROBE: a %s tenant\'s real owner is refused (403), same rule the ingest routes and middleware already enforce',
    async (status) => {
      getOwnerUserId.mockResolvedValue('user-42')
      resolve = (table, eqs) => {
        if (table === 'tenant_members' && eqs.clerk_user_id === 'user-42')
          return { data: { tenant_id: 't-dark', role: 'owner' }, error: null }
        if (table === 'tenants' && eqs.id === 't-dark') return { data: tenantRow({ id: 't-dark', status }), error: null }
        return { data: null, error: null }
      }

      await expect(getTenantForRequest()).rejects.toMatchObject({ status: 403, message: 'Tenant account is not active' })
    },
  )

  it('ESCAPE HATCH: admin-PIN impersonation of a suspended tenant is still authorized (support must still reach dark accounts)', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue('t-dark')
    verifyAdminToken.mockReturnValue(true)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-dark'
        ? { data: tenantRow({ id: 't-dark', status: 'suspended' }), error: null }
        : { data: null, error: null }

    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-dark')
  })
})

describe('getTenantForRequest — Clerk super-admin impersonation', () => {
  it('authorizes SUPER_ADMIN_CLERK_ID as owner of the impersonated tenant', async () => {
    vi.resetModules()
    vi.stubEnv('SUPER_ADMIN_CLERK_ID', 'super-1')
    try {
      const mod = await import('./tenant-query')
      mockCookieStore.set('fl_impersonate', 'signed-cookie')
      verifyImpersonationCookie.mockReturnValue('t-imp')
      verifyAdminToken.mockReturnValue(false) // no PIN admin token present
      getOwnerUserId.mockResolvedValue('super-1')
      resolve = (table, eqs) =>
        table === 'tenants' && eqs.id === 't-imp' ? { data: tenantRow({ id: 't-imp' }), error: null } : { data: null, error: null }

      const ctx = await mod.getTenantForRequest()
      expect(ctx.userId).toBe('super-1')
      expect(ctx.tenantId).toBe('t-imp')
      expect(ctx.role).toBe('owner')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('WRONG-TENANT PROBE: a non-super-admin user cannot use the impersonation cookie to become another tenant\'s owner via the Clerk path', async () => {
    vi.resetModules()
    vi.stubEnv('SUPER_ADMIN_CLERK_ID', 'super-1')
    try {
      const mod = await import('./tenant-query')
      mockCookieStore.set('fl_impersonate', 'signed-cookie')
      verifyImpersonationCookie.mockReturnValue('t-imp')
      verifyAdminToken.mockReturnValue(false)
      getOwnerUserId.mockResolvedValue('regular-user') // NOT the super admin id
      resolve = (table, eqs) => {
        if (table === 'tenant_members' && eqs.clerk_user_id === 'regular-user') return { data: null, error: null }
        return { data: null, error: null }
      }

      await expect(mod.getTenantForRequest()).rejects.toMatchObject({ status: 404, message: 'No tenant found' })
      expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.id === 't-imp')).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('getTenantForRequest — masked-error hardening (maybeSingle + explicit error check)', () => {
  // Every tenant-by-id / membership lookup in this file used to discard its
  // `error` and only destructure `data`, so a genuine DB failure looked
  // identical to "not found" and silently downgraded to a 401/403/404 instead
  // of surfacing loud. These probes force the mock builder to return a real
  // error (not just data:null) and assert the function throws instead of
  // quietly treating it as "no tenant".

  it('throws (does not silently 401) when the header-path tenant lookup hits a genuine DB error', async () => {
    mockHeaderStore.set('x-tenant-id', 't-1')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig')
    mockCookieStore.set('admin_token', 'global-token')
    verifyTenantHeaderSig.mockReturnValue(true)
    verifyAdminToken.mockReturnValue(true)
    getOwnerUserId.mockResolvedValue(null)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1'
        ? { data: null, error: { message: 'connection reset' } }
        : { data: null, error: null }

    await expect(getTenantForRequest()).rejects.toThrow(/TENANT_HEADER_GLOBAL_ADMIN_LOOKUP_ERROR/)
  })

  it('throws when the PIN-impersonation tenant lookup hits a genuine DB error', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    mockCookieStore.set('admin_token', 'good-token')
    verifyImpersonationCookie.mockReturnValue('t-1')
    verifyAdminToken.mockReturnValue(true)
    resolve = (table, eqs) =>
      table === 'tenants' && eqs.id === 't-1'
        ? { data: null, error: { message: 'timeout' } }
        : { data: null, error: null }

    await expect(getTenantForRequest()).rejects.toThrow(/TENANT_PIN_IMPERSONATION_LOOKUP_ERROR/)
  })

  it('throws when the Clerk super-admin impersonation tenant lookup hits a genuine DB error', async () => {
    vi.resetModules()
    vi.stubEnv('SUPER_ADMIN_CLERK_ID', 'super-1')
    try {
      const mod = await import('./tenant-query')
      mockCookieStore.set('fl_impersonate', 'signed-cookie')
      verifyImpersonationCookie.mockReturnValue('t-imp')
      verifyAdminToken.mockReturnValue(false)
      getOwnerUserId.mockResolvedValue('super-1')
      resolve = (table, eqs) =>
        table === 'tenants' && eqs.id === 't-imp'
          ? { data: null, error: { message: 'connection reset' } }
          : { data: null, error: null }

      await expect(mod.getTenantForRequest()).rejects.toThrow(/TENANT_CLERK_IMPERSONATION_LOOKUP_ERROR/)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('throws (does not silently 404) when the membership lookup hits a genuine DB error', async () => {
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) =>
      table === 'tenant_members' && eqs.clerk_user_id === 'user-42'
        ? { data: null, error: { message: 'connection reset' } }
        : { data: null, error: null }

    await expect(getTenantForRequest()).rejects.toThrow(/TENANT_MEMBERSHIP_LOOKUP_ERROR/)
  })

  it('AMBIGUOUS-MEMBERSHIP PROBE: throws loud (not a silent 404 lockout) when a clerk_user_id resolves to 2+ tenant_members rows', async () => {
    // clerk_user_id has no standalone unique constraint (only
    // UNIQUE(tenant_id, clerk_user_id)) — a user who legitimately belongs to
    // 2 tenants surfaces here as a PostgREST "multiple rows" error, same
    // shape as a transient failure. Before this fix that error was discarded
    // and the user was told "No tenant found" (404) instead of the real cause.
    getOwnerUserId.mockResolvedValue('user-multi')
    resolve = (table, eqs) =>
      table === 'tenant_members' && eqs.clerk_user_id === 'user-multi'
        ? { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }
        : { data: null, error: null }

    await expect(getTenantForRequest()).rejects.toThrow(/TENANT_MEMBERSHIP_LOOKUP_ERROR/)
  })

  it('throws when the final tenant-by-id lookup (after a resolved membership) hits a genuine DB error', async () => {
    getOwnerUserId.mockResolvedValue('user-42')
    resolve = (table, eqs) => {
      if (table === 'tenant_members' && eqs.clerk_user_id === 'user-42')
        return { data: { tenant_id: 't-7', role: 'staff' }, error: null }
      if (table === 'tenants' && eqs.id === 't-7') return { data: null, error: { message: 'connection reset' } }
      return { data: null, error: null }
    }

    await expect(getTenantForRequest()).rejects.toThrow(/TENANT_MEMBERSHIP_TENANT_LOOKUP_ERROR/)
  })
})

describe('getTenantForRequest — signed header vs. impersonation-cookie priority', () => {
  // A super-admin PIN login works on ANY host (see admin-auth/route.ts), and
  // neither admin_token nor fl_impersonate carry a cookie `domain`, so both
  // are host-only. That means a stale fl_impersonate=<tenant A> cookie left
  // over from an earlier session can still be present when the same admin
  // later authenticates directly on tenant B's own domain. tenant.ts's
  // getCurrentTenant() (used by DashboardLayout to gate + render this exact
  // header path) always resolves the header tenant first. This function must
  // agree, or a page rendered as tenant B would silently mutate tenant A's
  // data underneath it.
  it('WRONG-TENANT PROBE: a valid signed header for tenant B wins over a stale impersonation cookie for tenant A', async () => {
    mockHeaderStore.set('x-tenant-id', 't-B')
    mockHeaderStore.set('x-tenant-sig', 'valid-sig-for-b')
    mockCookieStore.set('admin_token', 'global-token')
    mockCookieStore.set('fl_impersonate', 'stale-cookie-for-a')
    verifyTenantHeaderSig.mockReturnValue(true)
    verifyAdminToken.mockReturnValue(true)
    verifyImpersonationCookie.mockReturnValue('t-A')
    getOwnerUserId.mockResolvedValue(null)
    resolve = (table, eqs) => {
      if (table === 'tenants' && eqs.id === 't-B') return { data: tenantRow({ id: 't-B', name: 'Tenant B' }), error: null }
      if (table === 'tenants' && eqs.id === 't-A') return { data: tenantRow({ id: 't-A', name: 'Tenant A' }), error: null }
      return { data: null, error: null }
    }

    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-B')
    // must never have resolved (or written an audit row for) the impersonated tenant
    expect(singleCalls.some((c) => c.table === 'tenants' && c.eqs.id === 't-A')).toBe(false)
    expect(insertCalls.some((c) => c.table === 'impersonation_events')).toBe(false)
  })
})
