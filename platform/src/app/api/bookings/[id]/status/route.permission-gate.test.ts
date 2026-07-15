import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/bookings/[id]/status called getTenantForRequest() with zero
 * permission check, despite bookings.edit being a defined RBAC permission and
 * the sibling PUT /api/bookings/[id] (full edit) already gating on it. staff
 * has bookings.view + bookings.create by default but NOT bookings.edit -- so
 * any authenticated tenant member, including staff, could transition any
 * booking's status (which also flips the mirrored deal's stage). Gated on
 * bookings.edit, matching the sibling PUT handler.
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

import { PATCH } from './route'

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function req(body: unknown) {
  return new Request('http://test', { method: 'PATCH', body: JSON.stringify(body) })
}

beforeEach(() => {
  currentRole.value = 'staff'
  DB.bookings = [{ id: 'bk-1', tenant_id: TENANT_A, status: 'scheduled' }]
  DB.deals = []
  DB.audit_logs = []
})

describe('PATCH /api/bookings/[id]/status — permission gate', () => {
  it('403s staff (has bookings.view/create but not bookings.edit by default)', async () => {
    currentRole.value = 'staff'
    const res = await PATCH(req({ status: 'confirmed' }), params('bk-1'))
    expect(res.status).toBe(403)
  })

  it('allows manager (has bookings.edit by default) to change status', async () => {
    currentRole.value = 'manager'
    const res = await PATCH(req({ status: 'confirmed' }), params('bk-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking.status).toBe('confirmed')
  })
})
