import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — waitlist/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') excludes a foreign tenant's
 * rows from BOTH sources GET unions (dedicated `waitlist` table + legacy
 * `sms_conversations` waitlist rows), and that POST inserts are stamped with
 * the tenant resolved from the signed middleware header, not any body value.
 *
 * RLS Stage 3 (docs/tenant-isolation-rls-plan.md): the sms_conversations leg
 * of GET now runs through tenantClient(tid), not tenantDb -- mocked below
 * against the same fake `store`/`builder` so this isolation proof still
 * covers it end to end.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const neqs: Record<string, unknown> = {}
  let insertedRow: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    neq: (col: string, val: unknown) => {
      neqs[col] = val
      return chain
    },
    // rateLimitDb's count query chains .gte('happened_at', ...) -- a no-op
    // filter here is fine, the window isn't exercised by these tests, only
    // whether rate_limit_events already has enough seeded rows to match eqs.
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    insert: (row: Row) => {
      const created: Row = { id: `new-${(store[table] || []).length + 1}`, ...row }
      insertedRow = created
      store[table] = [...(store[table] || []), created]
      // Chainable insert result — real Supabase's .insert() returns a query
      // builder, not an already-resolved promise, so callers can chain
      // .select('id').single() to get the new row's id back (route.ts does).
      const insertChain: Record<string, unknown> = {
        select: () => insertChain,
        single: () => Promise.resolve({ data: created, error: null }),
        then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
          resolve({ data: [created], error: null }),
      }
      return insertChain
    },
    then: (resolve: (v: { data: Row[]; error: null; count: number }) => unknown) => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      const filtered = rows.filter((r) => Object.entries(neqs).every(([k, v]) => r[k] !== v))
      return resolve({ data: filtered, error: null, count: filtered.length })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/tenant-supabase', () => ({
  tenantClient: async () => ({ from: (table: string) => builder(table) }),
}))

let currentTenant: string

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenant }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
// GET now goes through requirePermission (bookings.view) instead of calling
// getTenantForRequest directly -- see the route's own comment.
type RequirePermissionResult =
  | { tenant: { tenantId: string }; error: null }
  | { tenant: null; error: Response }
const requirePermissionMock = vi.fn<(permission: string) => Promise<RequirePermissionResult>>(
  async () => ({ tenant: { tenantId: currentTenant }, error: null })
)
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (permission: string) => requirePermissionMock(permission),
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: currentTenant, phone: null }),
}))

vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => ({}) }))

import { GET, POST } from './route'

beforeEach(() => {
  store = {
    waitlist: [
      { id: 'wl-a', tenant_id: 'tenant-A', name: 'Alice A', phone: '555-0001', status: 'open', created_at: '2026-07-01' },
      { id: 'wl-b', tenant_id: 'tenant-B', name: 'Bob B', phone: '555-0002', status: 'open', created_at: '2026-07-02' },
    ],
    sms_conversations: [
      { id: 'convo-a', tenant_id: 'tenant-A', name: 'A Convo', phone: '555-0003', outcome: 'waitlisted', expired: false, created_at: '2026-07-01', booking_checklist: {} },
      { id: 'convo-b', tenant_id: 'tenant-B', name: 'B Convo', phone: '555-0004', outcome: 'waitlisted', expired: false, created_at: '2026-07-02', booking_checklist: {} },
    ],
  }
  currentTenant = 'tenant-A'
  requirePermissionMock.mockClear()
})

describe('waitlist GET — tenantDb isolation', () => {
  it("never returns another tenant's dedicated-table or sms-conversation waitlist entry", async () => {
    const res = await GET()
    const body = await res.json()
    const ids = body.map((r: Row) => r.id)
    expect(ids).toContain('wl-a')
    expect(ids).toContain('convo-a')
    expect(ids).not.toContain('wl-b')
    expect(ids).not.toContain('convo-b')
  })
})

describe('waitlist POST — tenantDb stamping', () => {
  it('stamps the new entry with the header-resolved tenant, not a forged body tenant_id', async () => {
    const req = new Request('http://x/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ name: 'Charlie C', phone: '555-0005', tenant_id: 'tenant-B' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const newRow = store.waitlist.find((r) => r.name === 'Charlie C')!
    expect(newRow.tenant_id).toBe('tenant-A')

    currentTenant = 'tenant-B'
    const resB = await GET()
    const bodyB = await resB.json()
    expect(bodyB.map((r: Row) => r.id)).not.toContain(newRow.id)
  })
})

describe('waitlist — permission gate regression (2026-08-01)', () => {
  // GET previously called getTenantForRequest() directly with no permission
  // check -- same dormant-override-class gap as bookings.ts/clients.ts/
  // projects.ts fixed earlier this session. Proves GET now goes through
  // requirePermission('bookings.view') and honors a denial.
  it('GET is denied with 403 when the caller lacks bookings.view', async () => {
    requirePermissionMock.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('calls requirePermission with bookings.view, not some other permission', async () => {
    await GET()
    expect(requirePermissionMock).toHaveBeenCalledWith('bookings.view')
  })
})

describe('waitlist POST — persistent rate limit regression (2026-08-01)', () => {
  // The rate limiter used to be an in-memory Map, which never actually
  // bounds anything on Vercel's serverless runtime (resets every cold
  // start, and concurrent instances don't share state). Switched to the
  // DB-backed rate_limit_events table. Proves the switch actually happened:
  // once 5 events already exist for this tenant+IP bucket, the 6th request
  // is rejected with 429 and never reaches the insert.
  const req = () =>
    new Request('http://x/api/waitlist', {
      method: 'POST',
      headers: { 'x-forwarded-for': '9.9.9.9' },
      body: JSON.stringify({ name: 'Spammer', phone: '555-9999' }),
    })

  it('allows the request through when under the limit (0 prior events)', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
  })

  it('rejects with 429 once the bucket already has 5 events, and never inserts a waitlist row', async () => {
    store.rate_limit_events = Array.from({ length: 5 }, (_, i) => ({
      id: `evt-${i}`,
      bucket_key: `waitlist:${currentTenant}:9.9.9.9`,
      happened_at: new Date().toISOString(),
    }))
    const beforeCount = store.waitlist.length

    const res = await POST(req())

    expect(res.status).toBe(429)
    expect(store.waitlist.length).toBe(beforeCount)
  })
})
