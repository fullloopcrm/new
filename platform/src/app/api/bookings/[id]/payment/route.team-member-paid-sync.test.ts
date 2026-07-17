import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The "Mark Team Paid" button on the booking detail page
 * (dashboard/bookings/[id]/page.tsx) PATCHes team_paid/team_pay — a legacy
 * field pair from migration 009. GET /api/finance/payroll's "already settled
 * out-of-band" exclusion, and /api/admin/bookings/[id]/cleaner-payout's
 * claim, both key off a DIFFERENT field entirely: team_member_paid
 * (migration 011). The two were never wired together, so clicking "Mark
 * Team Paid" — which the UI displays as "Fully closed out" — left the
 * booking fully eligible to be claimed and paid again by a real payroll run
 * or a manual cleaner-payout, an unintentional double-pay door parallel to
 * the one the team_member_paid field was originally built to close. Fixed
 * by mirroring team_paid:true onto team_member_paid/team_member_paid_at.
 *
 * The boolean mirror above left the AMOUNT unmirrored: every finance/payroll
 * report (payroll-prep, payroll, pnl, cleaner-income, tax-export, summary)
 * sums team_member_pay, never team_pay — this route only ever wrote team_pay.
 * A job whose pay was entered/edited only through this page showed $0/null
 * everywhere payroll actually looks, even after "Mark Team Paid". Fixed by
 * mirroring team_pay onto team_member_pay too, alongside the existing
 * boolean mirror.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const BOOKING_ID = 'booking-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { auditFn } = vi.hoisted(() => ({ auditFn: vi.fn(async () => {}) }))

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
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'admin', tenant: {} }),
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { NextRequest } from 'next/server'
import { PATCH } from './route'

beforeEach(() => {
  auditFn.mockClear()
  DB.bookings = [{
    id: BOOKING_ID, tenant_id: TENANT_A, status: 'completed',
    team_pay: null, team_paid: false, team_paid_at: null,
    team_member_paid: false, team_member_paid_at: null,
  }]
})

function req(body: Record<string, unknown>) {
  return new NextRequest('https://x/api/bookings/booking-1/payment', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/bookings/[id]/payment — team_paid mirrors onto team_member_paid', () => {
  it('marking team_paid true also flips team_member_paid true (closes the double-pay gap)', async () => {
    const res = await PATCH(req({ team_paid: true, team_pay: 15000 }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(DB.bookings[0].team_paid).toBe(true)
    expect(DB.bookings[0].team_member_paid).toBe(true)
    expect(DB.bookings[0].team_member_paid_at).toBeTruthy()
    expect(DB.bookings[0].team_member_paid_at).toBe(DB.bookings[0].team_paid_at)
  })

  it('does not touch team_member_paid when team_paid is not in the request', async () => {
    DB.bookings[0].team_member_paid = true // e.g. already settled via cleaner-payout
    const res = await PATCH(req({ payment_status: 'paid' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(DB.bookings[0].team_member_paid).toBe(true) // untouched
  })

  it('unmarking team_paid false does not clear a real team_member_paid settlement', async () => {
    DB.bookings[0].team_member_paid = true
    DB.bookings[0].team_member_paid_at = '2026-01-01T00:00:00.000Z'
    const res = await PATCH(req({ team_paid: false }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(DB.bookings[0].team_paid).toBe(false)
    expect(DB.bookings[0].team_member_paid).toBe(true) // not clobbered
  })
})

describe('PATCH /api/bookings/[id]/payment — team_pay mirrors onto team_member_pay', () => {
  it('setting team_pay also writes team_member_pay (the field payroll actually sums)', async () => {
    const res = await PATCH(req({ team_pay: 15000 }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(DB.bookings[0].team_pay).toBe(15000)
    expect(DB.bookings[0].team_member_pay).toBe(15000)
  })

  it('does not touch team_member_pay when team_pay is not in the request', async () => {
    DB.bookings[0].team_member_pay = 9000 // e.g. already computed via another path
    const res = await PATCH(req({ payment_status: 'paid' }), { params: Promise.resolve({ id: BOOKING_ID }) })
    expect(res.status).toBe(200)
    expect(DB.bookings[0].team_member_pay).toBe(9000) // untouched
  })
})
