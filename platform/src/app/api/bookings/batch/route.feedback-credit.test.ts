import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * A client who replied to a feedback-request campaign can have an unclaimed
 * $ credit (client_feedback.credit_cents) queued for their next booking.
 * BookingsAdmin.tsx pre-fills the flat-dollar discount from it and sends the
 * credit's id back as `applied_feedback_credit_id` on the first row so this
 * route marks it used exactly once, tied to the booking it actually
 * discounted -- price itself is computed client-side, this route never
 * re-derives or re-applies the discount.
 */

const TENANT = 'tenant-fb-credit'
const OWN_CLIENT = 'client-fb-credit'

type Row = Record<string, any>
const store: Record<string, Row[]> = {}
let idSeq = 0
const genId = (table: string) => `${table}-${++idSeq}`

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let inCol: { col: string; vals: unknown[] } | null = null
    let kind: 'read' | 'insert' | 'update' = 'read'
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
    function doUpdate(): Row[] {
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return rows
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: (col: string, vals: unknown[]) => { inCol = { col, vals }; return c },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { const rows = doInsert(); return res({ data: rows, error: null }) }
        if (kind === 'update') { const rows = doUpdate(); return res({ data: rows, error: null }) }
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

describe('POST /api/bookings/batch — feedback credit auto-apply', () => {
  beforeEach(() => {
    store.bookings = []
    store.tenants = [{ id: TENANT, name: 'Own Biz' }]
    store.clients = [{ id: OWN_CLIENT, tenant_id: TENANT, name: 'Own Client' }]
    store.team_members = []
    store.client_feedback = [
      { id: 'fb-1', tenant_id: TENANT, client_id: OWN_CLIENT, credit_cents: 1000, credit_applied: false },
    ]
    idSeq = 0
  })

  it('marks the credit applied, tied to the created booking, when applied_feedback_credit_id is sent', async () => {
    const res = await BATCH_CREATE(jsonReq({
      bookings: [{ client_id: OWN_CLIENT, start_time: '2026-08-01T10:00:00Z', status: 'pending', applied_feedback_credit_id: 'fb-1' }],
    }))
    expect(res.status).toBe(200)
    const bookingId = store.bookings[0].id
    expect(store.client_feedback[0].credit_applied).toBe(true)
    expect(store.client_feedback[0].credit_applied_booking_id).toBe(bookingId)
  })

  it('leaves the credit pending when the admin did not keep the auto-filled discount (no applied_feedback_credit_id sent)', async () => {
    const res = await BATCH_CREATE(jsonReq({
      bookings: [{ client_id: OWN_CLIENT, start_time: '2026-08-01T10:00:00Z', status: 'pending' }],
    }))
    expect(res.status).toBe(200)
    expect(store.client_feedback[0].credit_applied).toBe(false)
    expect(store.client_feedback[0].credit_applied_booking_id).toBeUndefined()
  })

  it('only applies the credit to the first row when multiple bookings are sent in one batch', async () => {
    const res = await BATCH_CREATE(jsonReq({
      bookings: [
        { client_id: OWN_CLIENT, start_time: '2026-08-01T10:00:00Z', status: 'pending', applied_feedback_credit_id: 'fb-1' },
        { client_id: OWN_CLIENT, start_time: '2026-08-08T10:00:00Z', status: 'pending' },
      ],
    }))
    expect(res.status).toBe(200)
    expect(store.bookings.length).toBe(2)
    expect(store.client_feedback[0].credit_applied).toBe(true)
    expect(store.client_feedback[0].credit_applied_booking_id).toBe(store.bookings[0].id)
  })
})
