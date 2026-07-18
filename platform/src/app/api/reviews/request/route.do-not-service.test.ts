import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/reviews/request sent a real client email + SMS with zero
 * sms_consent/do_not_service check -- unlike its cron sibling
 * (cron/rating-prompt), which routes through sendClientSMS() /
 * getClientContacts(), both of which already treat do_not_service as an
 * absolute, channel-agnostic kill-switch (see notify.ts). An admin with
 * reviews.request permission could trigger a review-request nudge to a
 * DNS-flagged client (often flagged for a safety/harassment reason per
 * BookingsAdmin.tsx's own warning copy) or one who'd replied STOP.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {
  reviews: [],
  clients: [],
}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        if (kind === 'insert') {
          const row = { id: `${table}-new`, ...payload }
          store[table] = [...(store[table] || []), row]
          return { data: row, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: TENANT, tenant: { name: 'Acme', google_place_id: null, telnyx_api_key: 'k', telnyx_phone: '+15550000000' } },
    error: null,
  }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(() => Promise.resolve()) }))
const { sendSMS } = vi.hoisted(() => ({ sendSMS: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/email', () => ({ sendEmail }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from '@/app/api/reviews/request/route'

function postReq(body: unknown): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/reviews/request — do_not_service / sms_consent gate', () => {
  beforeEach(() => {
    store.reviews = []
    sendEmail.mockClear()
    sendSMS.mockClear()
  })

  it('sends neither email nor SMS when the client is flagged do_not_service', async () => {
    store.clients = [{ id: 'c1', tenant_id: TENANT, name: 'Vic Tim', email: 'vic@example.com', phone: '+15551110000', sms_consent: true, do_not_service: true }]
    const res = await POST(postReq({ client_id: 'c1' }))
    expect(res.status).toBe(200)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('sends email but not SMS when the client opted out of SMS only', async () => {
    store.clients = [{ id: 'c2', tenant_id: TENANT, name: 'Sam Stop', email: 'sam@example.com', phone: '+15551110001', sms_consent: false, do_not_service: false }]
    const res = await POST(postReq({ client_id: 'c2' }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('sends both email and SMS for a normal, opted-in client', async () => {
    store.clients = [{ id: 'c3', tenant_id: TENANT, name: 'Normal Norm', email: 'norm@example.com', phone: '+15551110002', sms_consent: true, do_not_service: false }]
    const res = await POST(postReq({ client_id: 'c3' }))
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
