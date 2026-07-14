import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings/batch previously inserted `b.client_id`/`b.team_member_id`
 * per row verbatim with no check that they belonged to the authenticated
 * tenant. The response joins clients(*)/team_members(*) (full rows, incl.
 * pin/pay_rate), so a foreign id let a staff member of tenant A bulk-pull
 * another tenant's client/staff PII into bookings stored under tenant A
 * (same class already fixed on single-booking create 534a5834).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const OWN_CLIENT = 'dddddddd-0001-0001-0001-000000000001'
const FOREIGN_CLIENT = 'dddddddd-0002-0002-0002-000000000002'
const OWN_MEMBER = 'ffffffff-0001-0001-0001-000000000001'
const FOREIGN_MEMBER = 'ffffffff-0002-0002-0002-000000000002'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let inCol: { col: string; vals: unknown[] } | null = null
    let kind: 'read' | 'insert' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) => {
      if (!Object.entries(eqs).every(([k, v]) => r[k] === v)) return false
      if (inCol && !inCol.vals.includes(r[inCol.col])) return false
      return true
    }
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: (col: string, vals: unknown[]) => { inCol = { col, vals }; return c },
      single: async () => {
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
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/escape-html', () => ({ escapeHtml: (s: string) => s }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => '' }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '' }) }))

import { POST as BATCH_CREATE } from '@/app/api/bookings/batch/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/bookings/batch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/bookings/batch — client_id/team_member_id tenant scoping', () => {
  beforeEach(() => {
    store.bookings = []
    store.tenants = [{ id: TENANT, name: 'Own Biz' }]
    store.clients = [
      { id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' },
      { id: FOREIGN_CLIENT, tenant_id: OTHER_TENANT, name: 'Foreign Client' },
    ]
    store.team_members = [
      { id: OWN_MEMBER, tenant_id: TENANT, name: 'Own Member' },
      { id: FOREIGN_MEMBER, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
    ]
    idSeq = 0
  })

  it('rejects a client_id belonging to another tenant', async () => {
    const res = await BATCH_CREATE(jsonReq({ bookings: [{ client_id: FOREIGN_CLIENT, start_time: '2026-08-01T10:00:00Z' }] }))
    expect(res.status).toBe(404)
    expect(store.bookings.length).toBe(0)
  })

  it('rejects a team_member_id belonging to another tenant', async () => {
    const res = await BATCH_CREATE(jsonReq({ bookings: [{ client_id: OWN_CLIENT, team_member_id: FOREIGN_MEMBER, start_time: '2026-08-01T10:00:00Z' }] }))
    expect(res.status).toBe(404)
    expect(store.bookings.length).toBe(0)
  })

  it('accepts client_id/team_member_id all belonging to the authenticated tenant', async () => {
    const res = await BATCH_CREATE(jsonReq({ bookings: [{ client_id: OWN_CLIENT, team_member_id: OWN_MEMBER, start_time: '2026-08-01T10:00:00Z', status: 'pending' }] }))
    expect(res.status).toBe(200)
    expect(store.bookings.length).toBe(1)
  })
})
