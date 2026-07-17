/**
 * POST /api/quotes/[id]/convert — the final link-back update (marking the
 * quote `converted` + stamping `converted_booking_id`) had its error
 * completely unchecked. If that single write failed after the booking was
 * already created, the quote's `converted_at` claim (set atomically earlier)
 * stayed set while `converted_booking_id` stayed null -- a retry's claim
 * check requires `converted_at IS NULL`, so the quote got permanently stuck
 * at "conversion already in progress" with a real, invisible orphaned
 * booking. Same failure shape already handled correctly in lib/jobs.ts's job
 * conversion (best-effort re-link in the catch instead of releasing the
 * claim, so a retry resolves to the existing resource instead of duplicating
 * or losing it).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}
let failNextLinkBack = false

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    const nulls: string[] = []
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row | Row[] = {}
    const match = (r: Row) =>
      Object.entries(eqs).every(([k, v]) => r[k] === v) && nulls.every((k) => r[k] === null || r[k] === undefined)
    function doInsert(): Row[] {
      const rows = Array.isArray(payload) ? payload : [payload]
      const inserted = rows.map((r) => ({ id: r.id ?? `id-${Math.random()}`, ...r }))
      store[table] = [...(store[table] || []), ...inserted]
      return inserted
    }
    function doUpdate(): { rows: Row[]; isLinkBack: boolean } {
      const isLinkBack = table === 'quotes' && (payload as Row).status === 'converted'
      if (isLinkBack && failNextLinkBack) {
        failNextLinkBack = false
        return { rows: [], isLinkBack }
      }
      const rows = (store[table] || []).filter(match)
      rows.forEach((r) => Object.assign(r, payload))
      return { rows, isLinkBack }
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      is: (col: string) => { nulls.push(col); return c },
      order: () => c,
      range: () => c,
      limit: () => c,
      maybeSingle: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        if (kind === 'update') {
          const { rows, isLinkBack } = doUpdate()
          if (isLinkBack && rows.length === 0) return { data: null, error: { message: 'simulated link-back failure' } }
          return { data: rows[0] ?? null, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      single: async () => {
        if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'insert') { const rows = doInsert(); return res({ data: rows, error: null }) }
        if (kind === 'update') {
          const { rows, isLinkBack } = doUpdate()
          if (isLinkBack && rows.length === 0) return res({ data: null, error: { message: 'simulated link-back failure' } })
          return res({ data: rows, error: null })
        }
        const rows = (store[table] || []).filter(match)
        return res({ data: rows, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_ID, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/quote', () => ({ logQuoteEvent: async () => {} }))

import { POST } from './route'

const TENANT_ID = 'tenant-1'
const QUOTE_ID = 'quote-1'

function convertRequest() {
  return new Request(`http://x/api/quotes/${QUOTE_ID}/convert`, { method: 'POST', body: JSON.stringify({}) })
}

beforeEach(() => {
  store.quotes = [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      status: 'accepted',
      converted_booking_id: null,
      converted_at: null,
      total_cents: 10_000,
      client_id: 'client-1',
      title: 'Test Quote',
      quote_number: 'Q-1',
      contact_email: null,
      contact_name: null,
      contact_phone: null,
      service_address: null,
      notes: null,
    },
  ]
  store.bookings = []
  store.clients = [{ id: 'client-1', tenant_id: TENANT_ID }]
  failNextLinkBack = false
})

describe('POST /api/quotes/[id]/convert — link-back update failure', () => {
  it('does not permanently strand the quote when the link-back write fails', async () => {
    failNextLinkBack = true
    const res = await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(500)

    // The booking was already created — must not be orphaned/duplicated.
    expect(store.bookings.length).toBe(1)

    // Best-effort re-link must have set the quote to point at the real
    // booking rather than leaving converted_at stuck with a null link.
    const quoteRow = store.quotes.find((q) => q.id === QUOTE_ID)!
    expect(quoteRow.converted_booking_id).toBe(store.bookings[0].id)
    expect(quoteRow.status).toBe('converted')

    // A subsequent call is idempotent against the real booking, not a
    // 409 "conversion already in progress" dead end, and not a duplicate.
    const retried = await (await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })).json()
    expect(retried.already_converted).toBe(true)
    expect(retried.booking_id).toBe(store.bookings[0].id)
    expect(store.bookings.length).toBe(1)
  })
})
