import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/batch-update previously spread raw `u.data` straight
 * into `.update()` with no field allow-list and no ownership check on
 * client_id/team_member_id -- full mass assignment (incl. tenant_id
 * donation) via supabaseAdmin directly (not tenantDb(), so the earlier
 * tenant_id-stripping fix from 9aed7786 doesn't cover this route). The
 * response joins clients(name, phone, email)/team_members(name, phone,
 * email), so a foreign id would leak another tenant's PII in bulk.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const FOREIGN_MEMBER = 'ffffffff-0002-0002-0002-000000000002'
const BOOKING_ID = 'booking-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let inCol: { col: string; vals: unknown[] } | null = null
    let kind: 'read' | 'update' | 'insert' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => {
      if (!Object.entries(eqs).every(([k, v]) => r[k] === v)) return false
      if (inCol && !inCol.vals.includes(r[inCol.col])) return false
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
      single: async () => {
        if (kind === 'update') { const [row] = doUpdate(); return { data: row ?? null, error: row ? null : { message: 'not found' } } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
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

describe('PUT /api/bookings/batch-update — field allow-list + tenant scoping', () => {
  beforeEach(() => {
    store.bookings = [{ id: BOOKING_ID, tenant_id: TENANT, client_id: OWN_CLIENT, team_member_id: null, start_time: '2026-08-01T10:00:00Z', status: 'pending' }]
    store.notifications = []
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client' },
    ]
    store.team_members = [
      { id: OWN_MEMBER, tenant_id: TENANT, name: 'Own Member' },
      { id: FOREIGN_MEMBER, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
    ]
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await BATCH_UPDATE(jsonReq({ updates: [{ id: BOOKING_ID, data: { client_id: FOREIGN_CLIENT } }] }))
    expect(res.status).toBe(404)
    expect(store.bookings[0].client_id).toBe(OWN_CLIENT)
  })

  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await BATCH_UPDATE(jsonReq({ updates: [{ id: BOOKING_ID, data: { team_member_id: FOREIGN_MEMBER } }] }))
    expect(res.status).toBe(404)
    expect(store.bookings[0].team_member_id).toBe(null)
  })

  it('strips a non-allow-listed field (e.g. tenant_id donation) from the update payload', async () => {
    const res = await BATCH_UPDATE(jsonReq({ updates: [{ id: BOOKING_ID, data: { tenant_id: OTHER_TENANT, notes: 'legit note' } }] }))
    expect(res.status).toBe(200)
    expect(store.bookings[0].tenant_id).toBe(TENANT)
    expect(store.bookings[0].notes).toBe('legit note')
  })

  it('accepts an update with only allow-listed, own-tenant fields', async () => {
    const res = await BATCH_UPDATE(jsonReq({ updates: [{ id: BOOKING_ID, data: { team_member_id: OWN_MEMBER, notes: 'ok' } }] }))
    expect(res.status).toBe(200)
    expect(store.bookings[0].team_member_id).toBe(OWN_MEMBER)
  })
})
