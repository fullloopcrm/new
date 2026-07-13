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
let memberRows: Record<string, { id: string; role: string }>
let rateLimitInserts: string[]
let tenantMembersQueried: boolean
let updatedMemberIds: string[]
let mockHeaders: Map<string, string>

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
  const eqs: Eqs = {}
  return {
    select: () => ({
      eq: (col: string, val: unknown) => {
        eqs[col] = val
        return {
          eq: (col2: string, val2: unknown) => {
            eqs[col2] = val2
            tenantMembersQueried = true
            return {
              maybeSingle: async () => {
                const key = `${eqs.tenant_id}|${eqs.pin_hash}`
                return { data: memberRows[key] ?? null, error: null }
              },
            }
          },
        }
      },
    }),
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
