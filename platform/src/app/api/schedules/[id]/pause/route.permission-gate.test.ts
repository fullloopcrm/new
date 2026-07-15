import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST (pause) / DELETE (resume) /api/schedules/[id]/pause called
 * getTenantForRequest() with zero permission check -- despite schedules.edit
 * being a defined RBAC permission -- so any authenticated tenant member,
 * incl. a role with schedules.edit revoked via the tenant's own RBAC
 * override, could pause a schedule (cancelling upcoming bookings + texting
 * the client) or resume one early. Gated on schedules.edit.
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
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))

import { POST, DELETE } from './route'

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  currentRole.value = 'staff'
  DB.recurring_schedules = [
    { id: 'sched-1', tenant_id: TENANT_A, recurring_type: 'weekly', status: 'active' },
  ]
  DB.bookings = []
  DB.notifications = []
  DB.audit_logs = []
})

describe('POST /api/schedules/[id]/pause — permission gate', () => {
  function req(body: unknown) {
    return new Request('http://test', { method: 'POST', body: JSON.stringify(body) })
  }

  it('403s staff (has schedules.view but not schedules.edit by default)', async () => {
    currentRole.value = 'staff'
    const res = await POST(req({ paused_until: '2026-08-01' }), params('sched-1'))
    expect(res.status).toBe(403)
  })

  it('allows manager (has schedules.edit by default) to pause the schedule', async () => {
    currentRole.value = 'manager'
    const res = await POST(req({ paused_until: '2026-08-01' }), params('sched-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe('DELETE /api/schedules/[id]/pause — permission gate', () => {
  it('403s staff (has schedules.view but not schedules.edit by default)', async () => {
    currentRole.value = 'staff'
    const res = await DELETE(new Request('http://test'), params('sched-1'))
    expect(res.status).toBe(403)
  })

  it('allows manager (has schedules.edit by default) to resume the schedule', async () => {
    currentRole.value = 'manager'
    const res = await DELETE(new Request('http://test'), params('sched-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
