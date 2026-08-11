import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/admin-auth had zero test coverage despite being the platform
 * super-admin AND per-tenant-admin PIN login — the highest-value auth target
 * in the app. Two guarantees were never proven:
 *
 *   1. Fail-closed rate limiting: rateLimitDb() is called with
 *      { failClosed: true }, but nothing proved a rate-limiter DB outage
 *      actually denies the request (429) BEFORE any PIN comparison or
 *      tenant_members query runs, instead of silently letting brute force
 *      through while the limiter is blind.
 *   2. Tenant-scoped PIN lookup: the tenant-admin path scopes the PIN lookup
 *      by the signed x-tenant-id header. Nothing proved a PIN that is valid
 *      for tenant B is rejected when the (correctly-signed) request resolves
 *      to tenant A, nor that a forged/unsigned x-tenant-id can't be used to
 *      bypass that scoping entirely.
 *
 * We mock '@supabase/supabase-js' at the root so both admin-auth's own
 * supabaseAdmin and rate-limit-db's supabaseAdmin (same singleton export)
 * resolve through one controllable fake client.
 */

type Eqs = Record<string, unknown>

let countResult: { count: number | null; error: unknown }
// Keyed by `${tenantId}|${pinHash}` — value is the member row, absent/undefined
// means "no such member," and `is_active: false` means "deactivated" (still a
// real row, but the login lookup filters it out, same as PostgREST would).
let memberRows: Record<string, { id: string; role: string; is_active?: boolean }>
let rateLimitInserts: string[]
let tenantMembersQueried: boolean
let updatedMemberIds: string[]
let mockHeaders: Map<string, string>
let auditInserts: Record<string, unknown>[]

function auditLogsTable() {
  return {
    insert: async (row: Record<string, unknown>) => {
      auditInserts.push(row)
      return { error: null }
    },
  }
}

function rateLimitEventsTable() {
  return {
    select: () => ({
      eq: () => ({
        gte: async () => countResult,
      }),
    }),
    insert: async (row: { bucket_key: string }) => {
      rateLimitInserts.push(row.bucket_key)
      return { error: null }
    },
  }
}

function tenantMembersTable() {
  // Generic N-deep .eq() chain (route.ts currently chains tenant_id, pin_hash,
  // is_active) terminated by .maybeSingle() — accumulates every filter so the
  // mock doesn't break if the route adds/reorders .eq() calls.
  const eqs: Eqs = {}
  const chain = {
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      tenantMembersQueried = true
      return chain
    },
    maybeSingle: async () => {
      const key = `${eqs.tenant_id}|${eqs.pin_hash}`
      const row = memberRows[key]
      if (!row) return { data: null, error: null }
      // Rows in this fake default to active (matches the real column's
      // DEFAULT true) unless a test explicitly marks one is_active: false.
      const rowActive = row.is_active !== false
      if (eqs.is_active !== undefined && rowActive !== eqs.is_active) return { data: null, error: null }
      return { data: row, error: null }
    },
  }
  return {
    select: () => chain,
    update: () => ({
      eq: (_col: string, val: unknown) => {
        updatedMemberIds.push(String(val))
        return Promise.resolve({ error: null })
      },
    }),
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'rate_limit_events') return rateLimitEventsTable()
      if (table === 'tenant_members') return tenantMembersTable()
      if (table === 'audit_logs') return auditLogsTable()
      throw new Error(`unexpected table in admin-auth fails-closed test: ${table}`)
    },
  }),
}))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => mockHeaders.get(name) ?? null,
  }),
}))

vi.mock('@/lib/login-alert', () => ({
  sendLoginAlert: vi.fn(async () => {}),
}))

function req(body: unknown): Request {
  return {
    headers: {
      get: (name: string) => {
        if (name === 'x-forwarded-for') return '203.0.113.9'
        if (name === 'user-agent') return 'vitest'
        return null
      },
    },
    json: async () => body,
  } as unknown as Request
}

const TENANT_A = 'tenant-a-uuid'
const TENANT_B = 'tenant-b-uuid'

beforeEach(() => {
  vi.resetModules()
  countResult = { count: 0, error: null }
  memberRows = {}
  rateLimitInserts = []
  tenantMembersQueried = false
  updatedMemberIds = []
  mockHeaders = new Map()
  auditInserts = []
  process.env.ADMIN_PIN = 'super-secret-pin'
  process.env.ADMIN_TOKEN_SECRET = 'admin-auth-fails-closed-test-secret'
  delete process.env.TENANT_HEADER_SIG_SECRET
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('admin-auth — rate limit fails closed on DB outage', () => {
  it('denies (429) before ever comparing the PIN when the rate-limit count query errors', async () => {
    countResult = { count: null, error: { message: 'db outage' } }

    const { POST } = await import('./route')
    const res = await POST(req({ pin: 'super-secret-pin' }))

    expect(res.status).toBe(429)
    // Never reached the tenant_members lookup and never recorded the attempt —
    // proves the route returned before doing any further work.
    expect(tenantMembersQueried).toBe(false)
    expect(rateLimitInserts).toHaveLength(0)
  })

  it('denies (429) even with a correct tenant-admin PIN when the limiter is blind', async () => {
    countResult = { count: null, error: { message: 'db outage' } }
    memberRows[`${TENANT_B}|will-not-be-reached`] = { id: 'member-1', role: 'owner' }
    const { signTenantHeader } = await import('@/lib/tenant-header-sig')
    mockHeaders.set('x-tenant-id', TENANT_B)
    mockHeaders.set('x-tenant-sig', signTenantHeader(TENANT_B))

    const { POST } = await import('./route')
    const res = await POST(req({ pin: '123456' }))

    expect(res.status).toBe(429)
    expect(tenantMembersQueried).toBe(false)
  })

  it('allows through to the PIN check once the rate limiter is healthy again', async () => {
    countResult = { count: 0, error: null }

    const { POST } = await import('./route')
    const res = await POST(req({ pin: 'super-secret-pin' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.role).toBe('super_admin')
  })
})

describe('admin-auth — super-admin PIN comparison', () => {
  // The global ADMIN_PIN gates god-mode access to every tenant, so it must use
  // the same constant-time-compare convention as CRON_SECRET (de510a4e) rather
  // than a naive === that leaks the PIN byte-by-byte via timing.
  it('rejects a same-length wrong PIN', async () => {
    countResult = { count: 0, error: null }

    const { POST } = await import('./route')
    const res = await POST(req({ pin: 'super-secret-piX' })) // same length as 'super-secret-pin'

    expect(res.status).toBe(401)
  })

  it('rejects a wrong-length PIN without throwing', async () => {
    countResult = { count: 0, error: null }

    const { POST } = await import('./route')
    const res = await POST(req({ pin: 'x' }))

    expect(res.status).toBe(401)
  })
})

describe('admin-auth — tenant-admin PIN is scoped to the signed tenant, not global', () => {
  it('wrong-tenant probe: a PIN valid for tenant B is rejected when the signed request resolves to tenant A', async () => {
    const { hashAdminPin } = await import('@/lib/admin-pin')
    memberRows[`${TENANT_B}|${hashAdminPin('654321')}`] = { id: 'member-b', role: 'owner' }

    const { signTenantHeader } = await import('@/lib/tenant-header-sig')
    mockHeaders.set('x-tenant-id', TENANT_A)
    mockHeaders.set('x-tenant-sig', signTenantHeader(TENANT_A))

    const { POST } = await import('./route')
    const res = await POST(req({ pin: '654321' }))

    expect(res.status).toBe(401)
    expect(updatedMemberIds).toHaveLength(0)
  })

  it('positive control: the same PIN correctly authenticates when the signed request resolves to tenant B', async () => {
    const { hashAdminPin } = await import('@/lib/admin-pin')
    memberRows[`${TENANT_B}|${hashAdminPin('654321')}`] = { id: 'member-b', role: 'owner' }

    const { signTenantHeader } = await import('@/lib/tenant-header-sig')
    mockHeaders.set('x-tenant-id', TENANT_B)
    mockHeaders.set('x-tenant-sig', signTenantHeader(TENANT_B))

    const { POST } = await import('./route')
    const res = await POST(req({ pin: '654321' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.role).toBe('tenant_admin')
    expect(updatedMemberIds).toEqual(['member-b'])

    // A successful dashboard login is now a durable, queryable audit_logs
    // row — not just a fire-and-forget alert (see sendLoginAlert above).
    expect(auditInserts).toHaveLength(1)
    expect(auditInserts[0]).toMatchObject({
      tenant_id: TENANT_B,
      action: 'admin.dashboard_login',
      entity_type: 'team_member',
      entity_id: 'member-b',
      user_id: 'member-b',
    })
  })

  it('rejects a correct PIN belonging to a deactivated member', async () => {
    const { hashAdminPin } = await import('@/lib/admin-pin')
    memberRows[`${TENANT_B}|${hashAdminPin('654321')}`] = { id: 'member-b', role: 'owner', is_active: false }

    const { signTenantHeader } = await import('@/lib/tenant-header-sig')
    mockHeaders.set('x-tenant-id', TENANT_B)
    mockHeaders.set('x-tenant-sig', signTenantHeader(TENANT_B))

    const { POST } = await import('./route')
    const res = await POST(req({ pin: '654321' }))

    expect(res.status).toBe(401)
    expect(updatedMemberIds).toHaveLength(0)
    expect(auditInserts).toHaveLength(0)
  })

  it('does NOT write an admin.dashboard_login audit row on a failed/wrong-tenant login attempt', async () => {
    const { hashAdminPin } = await import('@/lib/admin-pin')
    memberRows[`${TENANT_B}|${hashAdminPin('654321')}`] = { id: 'member-b', role: 'owner' }

    const { signTenantHeader } = await import('@/lib/tenant-header-sig')
    mockHeaders.set('x-tenant-id', TENANT_A)
    mockHeaders.set('x-tenant-sig', signTenantHeader(TENANT_A))

    const { POST } = await import('./route')
    const res = await POST(req({ pin: '654321' }))

    expect(res.status).toBe(401)
    expect(auditInserts).toHaveLength(0)
  })

  it('a forged/unsigned x-tenant-id cannot be used to bypass tenant scoping', async () => {
    const { hashAdminPin } = await import('@/lib/admin-pin')
    memberRows[`${TENANT_B}|${hashAdminPin('654321')}`] = { id: 'member-b', role: 'owner' }

    mockHeaders.set('x-tenant-id', TENANT_B)
    mockHeaders.set('x-tenant-sig', 'not-a-real-signature')

    const { POST } = await import('./route')
    const res = await POST(req({ pin: '654321' }))

    expect(res.status).toBe(401)
    expect(tenantMembersQueried).toBe(false)
  })
})
