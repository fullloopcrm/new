import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — waitlist/route.ts (docs/adr/0004).
 * Proves the wrapper's injected .eq('tenant_id') excludes a foreign tenant's
 * rows from BOTH sources GET unions (dedicated `waitlist` table + legacy
 * `sms_conversations` waitlist rows), and that POST inserts are stamped with
 * the tenant resolved from the signed middleware header, not any body value.
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
    order: () => chain,
    limit: () => chain,
    insert: (row: Row) => {
      insertedRow = { id: `new-${(store[table] || []).length + 1}`, ...row }
      store[table] = [...(store[table] || []), insertedRow]
      return Promise.resolve({ data: [insertedRow], error: null })
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      const filtered = rows.filter((r) => Object.entries(neqs).every(([k, v]) => r[k] !== v))
      return resolve({ data: filtered, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenant }, error: null }),
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
