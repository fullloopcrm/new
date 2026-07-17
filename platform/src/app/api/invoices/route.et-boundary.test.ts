/**
 * GET/POST /api/invoices — ET vs server-UTC calendar-day bugs.
 *
 * due_date is a DATE column meant in the business's ET terms.
 *   1. GET ?overdue=1 compared it against `new Date().toISOString().slice(0,10)`
 *      (server/UTC "today"). In the evening ET window (UTC already reads
 *      tomorrow), an invoice due today would read as overdue up to ~4-5h
 *      early.
 *   2. POST's due_days ("net 30") fallback added milliseconds to Date.now()
 *      and read back the UTC calendar date -- pushing the computed due_date
 *      a day late whenever created in that same evening ET window.
 *
 * Both fixed via nowNaiveET()/etToday()+addCalendarDays(), the session's
 * established ET-calendar helpers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  store: { invoices: [] as Array<Record<string, unknown>> },
  requirePermission: vi.fn(),
  ltCalls: [] as Array<[string, unknown]>,
}))

vi.mock('@/lib/supabase', () => {
  const fake = {
    from(table: string) {
      let payload: Record<string, unknown> | undefined
      const chain = {
        insert(p: Record<string, unknown>) {
          payload = p
          return chain
        },
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        not: () => chain,
        lt(field: string, value: unknown) {
          h.ltCalls.push([field, value])
          return chain
        },
        single: async () => {
          if (table !== 'invoices') return { data: null, error: null }
          const row = { id: `invoice-${h.store.invoices.length + 1}`, ...payload }
          h.store.invoices.push(row)
          return { data: row, error: null }
        },
        maybeSingle: async () => ({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/entity', () => ({
  getDefaultEntityId: vi.fn(async () => null),
  entityIdFromUrl: () => null,
  verifyEntityId: vi.fn(async () => null),
}))
vi.mock('@/lib/invoice', () => ({
  normalizeLineItems: (items: unknown) => items,
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  generateInvoicePublicToken: () => `tok_${Math.random()}`,
  generateInvoiceNumber: vi.fn(async () => 'INV-0001'),
  logInvoiceEvent: vi.fn(async () => {}),
}))

import { GET, POST } from './route'

const TENANT_A = 'tenant-A'
const getReq = (qs: string) => new Request(`http://x/api/invoices${qs}`)
const postReq = (body: unknown = {}) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store.invoices = []
  h.ltCalls = []
})

describe('GET /api/invoices?overdue=1 — ET calendar day', () => {
  it('compares against ET "today", not UTC, in the evening ET window', async () => {
    // 2026-07-17 23:30 ET (EDT, UTC-4) == 2026-07-18 03:30 UTC.
    vi.useFakeTimers().setSystemTime(new Date('2026-07-18T03:30:00Z'))

    const res = await GET(getReq('?overdue=1'))
    expect(res.status).toBe(200)
    expect(h.ltCalls).toHaveLength(1)
    const [field, value] = h.ltCalls[0]
    expect(field).toBe('due_date')
    expect(value).toBe('2026-07-17') // ET calendar day, not '2026-07-18'

    vi.useRealTimers()
  })
})

describe('POST /api/invoices — due_days ET calendar arithmetic', () => {
  it('anchors on ET "today" + due_days, not a UTC-shifted date, in the evening ET window', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-07-18T03:30:00Z')) // 2026-07-17 23:30 ET

    const res = await POST(postReq({ due_days: 30 }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.invoice.due_date).toBe('2026-08-16') // 2026-07-17 + 30 days, ET calendar
    expect(body.invoice.due_date).not.toBe('2026-08-17')

    vi.useRealTimers()
  })

  it('leaves an explicit due_date untouched', async () => {
    const res = await POST(postReq({ due_date: '2026-09-01', due_days: 30 }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.invoice.due_date).toBe('2026-09-01')
  })
})
