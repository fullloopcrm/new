import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — schedules/route.ts.
 * Converts recurring_schedules select/insert and the service_types name
 * lookup (all genuinely tenant-owned) to tenantDb(tenantId). The service_types
 * lookup previously had NO tenant filter at all — any tenant supplying another
 * tenant's service_type_id would get that tenant's service name stamped onto
 * its own generated bookings. Proves both: (1) GET only returns the caller's
 * own schedules, and (2) POST can no longer pull another tenant's service
 * type name across the tenant boundary.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let insertedRows: Row[] | null = null

  const rows = (): Row[] => {
    if (insertedRows) return insertedRows
    return (store[table] || []).filter((row) => matchesEq(row, eqs))
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    insert: (payload: Row | Row[]) => {
      const arr = Array.isArray(payload) ? payload : [payload]
      const withIds = arr.map((r, i) => ({ id: (r.id as string) || `${table}-${(store[table]?.length || 0) + i + 1}`, ...r }))
      store[table] = [...(store[table] || []), ...withIds]
      insertedRows = withIds
      return chain
    },
    single: () => Promise.resolve({ data: rows()[0] || null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: rows(), error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

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

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { GET, POST } from './route'

const CLIENT_A = '11111111-1111-1111-1111-111111111111'
const SERVICE_TYPE_B = '22222222-2222-2222-2222-222222222222'

beforeEach(() => {
  store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', client_id: CLIENT_A, recurring_type: 'weekly' },
      { id: 'sched-B1', tenant_id: 'tenant-B', client_id: CLIENT_A, recurring_type: 'weekly' },
    ],
    service_types: [
      { id: SERVICE_TYPE_B, tenant_id: 'tenant-B', name: "Ray's Towing Premium Package" },
    ],
    bookings: [],
  }
})

describe('schedules GET — tenantDb isolation', () => {
  it('tenant A sees only its own recurring schedule, never tenant B\'s', async () => {
    currentTenant = 'tenant-A'
    const res = await GET()
    const body = await res.json()
    expect(body.schedules).toHaveLength(1)
    expect(body.schedules[0].id).toBe('sched-A1')
  })
})

describe('schedules POST — tenantDb isolation (service_type cross-tenant name leak)', () => {
  it('tenant A supplying tenant B\'s service_type_id gets no service type name back (was previously unscoped)', async () => {
    currentTenant = 'tenant-A'
    const res = await POST(
      new Request('http://x/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          client_id: CLIENT_A,
          service_type_id: SERVICE_TYPE_B,
          recurring_type: 'weekly',
          day_of_week: 1,
        }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.bookingsCreated).toBeGreaterThan(0)

    const created = store.bookings as Row[]
    expect(created.length).toBeGreaterThan(0)
    for (const b of created) {
      expect(b.service_type).toBeNull()
      expect(b.service_type).not.toBe("Ray's Towing Premium Package")
    }
  })
})
