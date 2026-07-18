import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/batch-update accepted `status` in its writable-field
 * allow-list with no guard against cancelling an already completed/paid
 * booking -- the exact protection PUT /bookings/[id] enforces (no downstream
 * reconciliation for payroll team_pay / referral commission clawback once a
 * job has settled). A bookings.edit-authenticated caller could hit this
 * batch door directly to cancel a settled booking even though the only UI
 * caller (the "edit recurring series" flow) never sends `status` at all.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const COMPLETED_BOOKING = 'booking-completed'
const PAID_BOOKING = 'booking-paid'
const SCHEDULED_BOOKING = 'booking-scheduled'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let inCol: { col: string; vals: unknown[] } | null = null
    let notInCol: { col: string; vals: unknown[] } | null = null
    let kind: 'read' | 'update' | 'insert' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => {
      if (!Object.entries(eqs).every(([k, v]) => r[k] === v)) return false
      if (inCol && !inCol.vals.includes(r[inCol.col])) return false
      if (notInCol && notInCol.vals.includes(r[notInCol.col])) return false
      return true
    }
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return rows
    }
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      store[table] = [...(store[table] || []), ...rows]
      return rows
    }
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: (col: string, vals: unknown[]) => { inCol = { col, vals }; return c },
      // Mimics `.not('status', 'in', '(completed,paid)')` — the only shape this route uses.
      not: (col: string, _op: string, val: string) => {
        const vals = val.replace(/[()]/g, '').split(',')
        notInCol = { col, vals }
        return c
      },
      single: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      maybeSingle: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { const rows = doInsert(); return res({ data: rows, error: null }) }
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))

import { PUT as BATCH_UPDATE } from '@/app/api/bookings/batch-update/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/bookings/batch-update', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/bookings/batch-update — completed/paid cancel guard', () => {
  beforeEach(() => {
    store.bookings = [
      { id: COMPLETED_BOOKING, tenant_id: TENANT, client_id: null, team_member_id: null, start_time: '2026-08-01T10:00:00Z', status: 'completed' },
      { id: PAID_BOOKING, tenant_id: TENANT, client_id: null, team_member_id: null, start_time: '2026-08-02T10:00:00Z', status: 'paid' },
      { id: SCHEDULED_BOOKING, tenant_id: TENANT, client_id: null, team_member_id: null, start_time: '2026-08-03T10:00:00Z', status: 'scheduled' },
    ]
    store.notifications = []
    store.clients = []
    store.team_members = []
  })

  it('blocks cancelling a completed booking through the batch door', async () => {
    const res = await BATCH_UPDATE(jsonReq({ updates: [{ id: COMPLETED_BOOKING, data: { status: 'cancelled' } }] }))
    expect(res.status).toBe(400)
    expect(store.bookings.find(b => b.id === COMPLETED_BOOKING)!.status).toBe('completed')
  })

  it('blocks cancelling a paid booking through the batch door', async () => {
    const res = await BATCH_UPDATE(jsonReq({ updates: [{ id: PAID_BOOKING, data: { status: 'cancelled' } }] }))
    expect(res.status).toBe(400)
    expect(store.bookings.find(b => b.id === PAID_BOOKING)!.status).toBe('paid')
  })

  it('blocks the whole batch if any one row in it is settled (fail closed, not partial)', async () => {
    const res = await BATCH_UPDATE(jsonReq({
      updates: [
        { id: SCHEDULED_BOOKING, data: { status: 'cancelled' } },
        { id: COMPLETED_BOOKING, data: { status: 'cancelled' } },
      ],
    }))
    expect(res.status).toBe(400)
    expect(store.bookings.find(b => b.id === SCHEDULED_BOOKING)!.status).toBe('scheduled')
  })

  it('allows cancelling a still-open (scheduled) booking', async () => {
    const res = await BATCH_UPDATE(jsonReq({ updates: [{ id: SCHEDULED_BOOKING, data: { status: 'cancelled' } }] }))
    expect(res.status).toBe(200)
    expect(store.bookings.find(b => b.id === SCHEDULED_BOOKING)!.status).toBe('cancelled')
  })

  it('allows a non-status edit on a completed booking (e.g. note update)', async () => {
    const res = await BATCH_UPDATE(jsonReq({ updates: [{ id: COMPLETED_BOOKING, data: { notes: 'follow-up note' } }] }))
    expect(res.status).toBe(200)
    expect(store.bookings.find(b => b.id === COMPLETED_BOOKING)!.notes).toBe('follow-up note')
    expect(store.bookings.find(b => b.id === COMPLETED_BOOKING)!.status).toBe('completed')
  })
})
