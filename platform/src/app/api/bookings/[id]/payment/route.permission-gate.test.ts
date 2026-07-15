import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/bookings/[id]/payment previously called getTenantForRequest()
 * with no requirePermission check at all -- any authenticated tenant member
 * (incl. 'staff', the default role, which lacks bookings.edit) could mark
 * any booking 'paid' without an actual payment, set an arbitrary tip_amount,
 * or set team_pay/team_paid to falsify payroll. The sibling PUT
 * /api/bookings/[id] already gates every booking field edit (incl. the same
 * team_pay/team_paid fields) on 'bookings.edit'; this route bypassed that
 * gate entirely for the payment-status fields. Now gated to match.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const BOOKING_ID = 'booking-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { auditFn } = vi.hoisted(() => ({ auditFn: vi.fn(async () => {}) }))
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    select: () => uc,
    single: async () => {
      const row = rows.find((r) => filters.every((f) => f(r)))
      if (!row) return { data: null, error: { message: 'not found' } }
      Object.assign(row, values)
      return { data: row, error: null }
    },
  }
  return uc
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const c: Record<string, unknown> = {
    update: (values: Row) => updateChain(rowsOf(), values),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: auditFn }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error {},
}))

import { NextRequest } from 'next/server'
import { PATCH } from './route'

beforeEach(() => {
  auditFn.mockClear()
  currentRole.value = 'staff'
  DB.bookings = [{ id: BOOKING_ID, tenant_id: TENANT_A, payment_status: 'unpaid', team_pay: null, team_paid: false }]
})

function req(body: Record<string, unknown>) {
  return new NextRequest('https://x/api/bookings/booking-1/payment', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/bookings/[id]/payment — permission gate', () => {
  it('403s a staff member (default role, no bookings.edit) and leaves the booking untouched', async () => {
    currentRole.value = 'staff'
    const res = await PATCH(req({ payment_status: 'paid', tip_amount: 5000 }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(403)
    expect(DB.bookings[0].payment_status).toBe('unpaid')
  })

  it('403s a staff member trying to falsify team_paid/team_pay for payroll', async () => {
    currentRole.value = 'staff'
    const res = await PATCH(req({ team_paid: true, team_pay: 99999 }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(403)
    expect(DB.bookings[0].team_paid).toBe(false)
  })

  it('allows an admin (has bookings.edit) to mark the booking paid', async () => {
    currentRole.value = 'admin'
    const res = await PATCH(req({ payment_status: 'paid', tip_amount: 500 }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(DB.bookings[0].payment_status).toBe('paid')
  })
})
