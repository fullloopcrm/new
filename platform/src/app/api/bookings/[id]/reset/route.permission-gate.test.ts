import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings/[id]/reset previously called getTenantForRequest() with
 * no requirePermission check -- any authenticated tenant member (incl.
 * 'staff', which lacks bookings.edit) could undo another team member's
 * check-in/check-out, e.g. to erase attendance evidence. Now gated on
 * 'bookings.edit' to match the sibling PATCH /api/bookings/[id] path.
 * Ported from sibling-branch commit 120dd9ff.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const BOOKING_ID = 'booking-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let op: 'select' | 'insert' | 'update' = 'select'
  let payload: Row = {}
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row) => { op = 'insert'; payload = p; return c },
    update: (p: Row) => { op = 'update'; payload = p; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => {
      if (op === 'insert') { const row = { ...payload }; DB[table] = [...rowsOf(), row]; return { data: row, error: null } }
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      if (!row) return { data: null, error: { message: 'not found' } }
      if (op === 'update') Object.assign(row, payload)
      return { data: row, error: null }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.bookings = [{ id: BOOKING_ID, tenant_id: TENANT_A, status: 'in_progress', check_out_time: '2026-07-15T10:00:00Z', payment_status: 'unpaid' }]
  DB.notifications = []
})

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/bookings/[id]/reset — permission gate', () => {
  it('403s a staff member (no bookings.edit), booking untouched', async () => {
    const res = await POST(req({ stage: 'check-out' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(403)
    expect(DB.bookings[0].check_out_time).toBe('2026-07-15T10:00:00Z')
  })

  it('allows an admin (has bookings.edit) to undo a check-out', async () => {
    currentRole.value = 'admin'
    const res = await POST(req({ stage: 'check-out' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(DB.bookings[0].check_out_time).toBe(null)
  })
})
