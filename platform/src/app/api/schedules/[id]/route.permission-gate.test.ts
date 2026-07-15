import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/PUT/DELETE /api/schedules/[id] called getTenantForRequest() with zero
 * permission check -- despite schedules.view/schedules.edit being defined
 * RBAC permissions -- so any authenticated tenant member, incl. a role with
 * those revoked via the tenant's own RBAC override, could read a single
 * schedule's client PII (name/phone/address), edit it, or cancel it and its
 * future bookings. Gated on schedules.view (GET) / schedules.edit (PUT, DELETE).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let updatePayload: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    gte: () => c,
    lte: () => c,
    in: () => c,
    insert: (payload: Row) => {
      const row = { id: `${table}-${rowsOf().length + 1}`, ...payload }
      rowsOf().push(row)
      return c
    },
    update: (payload: Row) => { updatePayload = payload; return c },
    single: () => {
      const matched = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (updatePayload) matched.forEach((r) => Object.assign(r, updatePayload))
      return Promise.resolve({ data: matched[0] || null, error: null })
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      const matched = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (updatePayload) matched.forEach((r) => Object.assign(r, updatePayload))
      return Promise.resolve(res({ data: matched, error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, PUT, DELETE } from './route'

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  currentRole.value = 'staff'
  DB.recurring_schedules = [
    { id: 'sched-1', tenant_id: TENANT_A, recurring_type: 'weekly', status: 'active' },
  ]
  DB.bookings = []
  DB.audit_logs = []
})

describe('GET /api/schedules/[id] — permission gate', () => {
  it('403s a role without schedules.view (custom override revoking it)', async () => {
    currentRole.value = 'nonexistent-role-with-no-perms'
    const res = await GET(new Request('http://test'), params('sched-1'))
    expect(res.status).toBe(403)
  })

  it('allows staff (has schedules.view by default) and returns the schedule', async () => {
    const res = await GET(new Request('http://test'), params('sched-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.schedule.id).toBe('sched-1')
  })
})

describe('PUT /api/schedules/[id] — permission gate', () => {
  function req(body: unknown) {
    return new Request('http://test', { method: 'PUT', body: JSON.stringify(body) })
  }

  it('403s staff (has schedules.view but not schedules.edit by default)', async () => {
    currentRole.value = 'staff'
    const res = await PUT(req({ notes: 'updated' }), params('sched-1'))
    expect(res.status).toBe(403)
  })

  it('allows manager (has schedules.edit by default) to update the schedule', async () => {
    currentRole.value = 'manager'
    const res = await PUT(req({ notes: 'updated' }), params('sched-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.schedule.notes).toBe('updated')
  })
})

describe('DELETE /api/schedules/[id] — permission gate', () => {
  it('403s staff (has schedules.view but not schedules.edit by default)', async () => {
    currentRole.value = 'staff'
    const res = await DELETE(new Request('http://test'), params('sched-1'))
    expect(res.status).toBe(403)
  })

  it('allows manager (has schedules.edit by default) to cancel the schedule', async () => {
    currentRole.value = 'manager'
    const res = await DELETE(new Request('http://test'), params('sched-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
