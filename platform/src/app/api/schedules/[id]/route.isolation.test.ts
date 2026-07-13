import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — schedules/[id]/route.ts.
 * Converts the recurring_schedules/bookings GET, PUT, and DELETE queries (all
 * genuinely tenant-owned) to tenantDb(tenantId). Proves tenant A can't read,
 * update, or cancel tenant B's schedule by guessing/reusing its id.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let updatePayload: Row | null = null

  const rows = (): Row[] => (store[table] || []).filter((row) => matchesEq(row, eqs))

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    gte: () => chain,
    in: () => chain,
    order: () => chain,
    update: (payload: Row) => {
      updatePayload = payload
      return chain
    },
    single: () => {
      const matched = rows()
      if (updatePayload) {
        store[table] = (store[table] || []).map((r) =>
          matchesEq(r, eqs) ? { ...r, ...updatePayload } : r,
        )
      }
      return Promise.resolve({ data: matched[0] ? { ...matched[0], ...(updatePayload || {}) } : null, error: null })
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      if (updatePayload) {
        store[table] = (store[table] || []).map((r) =>
          matchesEq(r, eqs) ? { ...r, ...updatePayload } : r,
        )
      }
      return resolve({ data: rows(), error: null })
    },
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

import { GET, PUT, DELETE } from './route'

beforeEach(() => {
  store = {
    recurring_schedules: [
      { id: 'sched-B1', tenant_id: 'tenant-B', status: 'active', recurring_type: 'weekly' },
    ],
    bookings: [
      { id: 'booking-B1', tenant_id: 'tenant-B', schedule_id: 'sched-B1', status: 'scheduled', start_time: '2099-01-01T00:00:00Z' },
    ],
  }
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('schedules/[id] — tenantDb isolation', () => {
  it('GET: tenant A requesting tenant B\'s schedule id gets 404, not tenant B\'s data', async () => {
    currentTenant = 'tenant-A'
    const res = await GET(new Request('http://x'), params('sched-B1'))
    expect(res.status).toBe(404)
  })

  it('GET: tenant B requesting its own schedule id succeeds', async () => {
    currentTenant = 'tenant-B'
    const res = await GET(new Request('http://x'), params('sched-B1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.schedule.id).toBe('sched-B1')
  })

  it('PUT: tenant A can\'t rewrite tenant B\'s schedule by id', async () => {
    currentTenant = 'tenant-A'
    await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ recurring_type: 'daily' }) }),
      params('sched-B1'),
    )
    const stillB = store.recurring_schedules.find((r) => r.id === 'sched-B1')
    expect(stillB?.recurring_type).toBe('weekly')
  })

  it('DELETE: tenant A can\'t cancel tenant B\'s schedule or its bookings by id', async () => {
    currentTenant = 'tenant-A'
    await DELETE(new Request('http://x'), params('sched-B1'))
    const schedule = store.recurring_schedules.find((r) => r.id === 'sched-B1')
    const booking = store.bookings.find((b) => b.id === 'booking-B1')
    expect(schedule?.status).toBe('active')
    expect(booking?.status).toBe('scheduled')
  })
})
