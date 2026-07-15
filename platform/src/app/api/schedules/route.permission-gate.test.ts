import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/schedules called getTenantForRequest() with zero permission
 * check -- despite schedules.view/schedules.create being defined RBAC
 * permissions with their own "Schedules" catalog group -- so any
 * authenticated tenant member, incl. a role with schedules.view/create
 * revoked via the tenant's own RBAC override, could list every recurring
 * schedule (with client name/phone/address via the join) and create new
 * ones + their generated bookings. Same bug shape as the already-fixed
 * /api/management-applications route. Gated on schedules.view/schedules.create.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CLIENT_A = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let insertedRow: Row | null = null
  let updatePayload: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    gte: () => c,
    lte: () => c,
    limit: () => c,
    in: () => c,
    insert: (payload: Row) => {
      const row = { id: `${table}-${rowsOf().length + 1}`, ...payload }
      rowsOf().push(row)
      insertedRow = row
      return c
    },
    update: (payload: Row) => { updatePayload = payload; return c },
    single: () => {
      if (insertedRow) return Promise.resolve({ data: insertedRow, error: null })
      const matched = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (updatePayload) matched.forEach((r) => Object.assign(r, updatePayload))
      return Promise.resolve({ data: matched[0] || null, error: null })
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null })),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.recurring_schedules = [
    { id: 'sched-1', tenant_id: TENANT_A, client_id: CLIENT_A, recurring_type: 'weekly' },
  ]
  DB.clients = [{ id: CLIENT_A, tenant_id: TENANT_A, name: 'Client A' }]
  DB.bookings = []
  DB.audit_logs = []
})

describe('GET /api/schedules — permission gate', () => {
  it('403s a role without schedules.view (custom override revoking it)', async () => {
    currentRole.value = 'nonexistent-role-with-no-perms'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows staff (has schedules.view by default) and returns schedules', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.schedules).toHaveLength(1)
  })
})

describe('POST /api/schedules — permission gate', () => {
  function req(body: unknown) {
    return new Request('http://test/api/schedules', { method: 'POST', body: JSON.stringify(body) })
  }

  it('403s staff (has schedules.view but not schedules.create by default)', async () => {
    currentRole.value = 'staff'
    const res = await POST(req({ client_id: CLIENT_A, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(403)
  })

  it('allows manager (has schedules.create by default) to create a schedule', async () => {
    currentRole.value = 'manager'
    const res = await POST(req({ client_id: CLIENT_A, recurring_type: 'weekly', day_of_week: 1 }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.schedule).toBeTruthy()
  })
})
