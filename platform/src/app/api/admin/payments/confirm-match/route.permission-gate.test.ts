import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/admin/payments/confirm-match called getTenantForRequest() with
 * zero permission check on a financial write: it marks a booking paid,
 * inserts a payments row, and computes/records a team-member tip -- the same
 * class of mutation as /api/finance/mark-paid, which already gates on
 * finance.payroll. staff/manager lack finance.payroll by default; now matched.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let updatePayload: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    update: (payload: Row) => { updatePayload = payload; return c },
    insert: (payload: Row) => { rowsOf().push(payload); return Promise.resolve({ data: payload, error: null }) },
    single: () => {
      const matched = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (updatePayload) matched.forEach((r) => Object.assign(r, updatePayload))
      return Promise.resolve({ data: matched[0] || null, error: null })
    },
    maybeSingle: () => {
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
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))

const { tenantState } = vi.hoisted(() => ({
  tenantState: { role: 'staff' as string, overrides: null as Record<string, unknown> | null },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT_A,
    role: tenantState.role,
    tenant: { selena_config: tenantState.overrides ? { role_permissions: tenantState.overrides } : {} },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

beforeEach(() => {
  DB.unmatched_payments = [{ id: 'u1', tenant_id: TENANT_A, method: 'zelle', amount_cents: 10000, sender_name: 'Jane', status: 'pending' }]
  DB.bookings = [{ id: 'b1', tenant_id: TENANT_A, client_id: 'c1', team_member_id: 't1', hourly_rate: 50, actual_hours: 2, price: 10000, clients: { name: 'Jane', phone: null }, team_members: { name: 'Cleaner', phone: null, preferred_language: 'en' } }]
  DB.payments = []
  DB.tenants = [{ id: TENANT_A, name: 'Acme', telnyx_api_key: null, telnyx_phone: null }]
  DB.notifications = []
})

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/payments/confirm-match', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/payments/confirm-match — permission gate', () => {
  it('403s staff (no finance.payroll by default), booking left untouched', async () => {
    tenantState.role = 'staff'
    tenantState.overrides = null
    const res = await POST(req({ unmatchedPaymentId: 'u1', bookingId: 'b1' }))
    expect(res.status).toBe(403)
    expect(DB.bookings[0].payment_status).toBeUndefined()
    expect(DB.unmatched_payments[0].status).toBe('pending')
  })

  it('403s manager (no finance.payroll by default)', async () => {
    tenantState.role = 'manager'
    tenantState.overrides = null
    const res = await POST(req({ unmatchedPaymentId: 'u1', bookingId: 'b1' }))
    expect(res.status).toBe(403)
  })

  it('allows admin, which has finance.payroll by default', async () => {
    tenantState.role = 'admin'
    tenantState.overrides = null
    const res = await POST(req({ unmatchedPaymentId: 'u1', bookingId: 'b1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(DB.bookings[0].payment_status).toBe('paid')
  })
})
