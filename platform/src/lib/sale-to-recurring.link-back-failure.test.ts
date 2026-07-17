/**
 * `createRecurringSeriesFromQuote` — the final link-back update (marking the
 * quote `converted` + stamping `converted_schedule_id`) had its error
 * completely unchecked. If that single write failed after the schedule (+
 * its batch of bookings) was already created, the quote's `converted_at`
 * claim (set atomically earlier) stayed set while `converted_schedule_id`
 * stayed null -- a retry's claim check requires `converted_at IS NULL`, so
 * the quote got permanently stuck at "conversion already in progress" with a
 * real, invisible orphaned series. Same failure shape already fixed in
 * createBookingFromQuote / POST /api/quotes/[id]/convert / lib/jobs.ts's job
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
    let kind: 'read' | 'insert' | 'update' | 'delete' = 'read'
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
    function doDelete(): Row[] {
      const kept: Row[] = []
      const removed: Row[] = []
      for (const r of store[table] || []) {
        if (match(r)) removed.push(r)
        else kept.push(r)
      }
      store[table] = kept
      return removed
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      delete: () => { kind = 'delete'; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      is: (col: string) => { nulls.push(col); return c },
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
        if (kind === 'delete') { const rows = doDelete(); return res({ data: rows, error: null }) }
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

vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok-fixed' }))

import { createRecurringSeriesFromQuote } from './sale-to-recurring'

const TENANT_ID = 'tenant-1'
const QUOTE_ID = 'quote-1'

beforeEach(() => {
  store.quotes = [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      status: 'accepted',
      converted_schedule_id: null,
      converted_at: null,
      recurring_type: 'weekly',
      recurring_start_date: '2026-08-01',
      recurring_preferred_time: '09:00',
      recurring_duration_hours: 2,
      total_cents: 10_000,
      client_id: 'client-1',
      title: 'Test Recurring Quote',
      quote_number: 'Q-1',
      contact_email: null,
      contact_name: null,
      contact_phone: null,
      service_address: null,
      notes: null,
    },
  ]
  store.bookings = []
  store.recurring_schedules = []
  store.clients = [{ id: 'client-1', tenant_id: TENANT_ID }]
  failNextLinkBack = false
})

describe('createRecurringSeriesFromQuote — link-back update failure', () => {
  it('does not permanently strand the quote when the link-back write fails', async () => {
    failNextLinkBack = true
    await expect(createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID)).rejects.toThrow(/link-back/)

    // The schedule (+ its batch of bookings) was already created — must not
    // be orphaned/duplicated.
    expect(store.recurring_schedules.length).toBe(1)
    const scheduleId = store.recurring_schedules[0].id
    expect(store.bookings.length).toBeGreaterThan(0)
    expect(store.bookings.every((b) => b.schedule_id === scheduleId)).toBe(true)

    // Best-effort re-link must have set the quote to point at the real
    // schedule rather than leaving converted_at stuck with a null link.
    const quoteRow = store.quotes.find((q) => q.id === QUOTE_ID)!
    expect(quoteRow.converted_schedule_id).toBe(scheduleId)
    expect(quoteRow.status).toBe('converted')

    // A subsequent call is idempotent against the real schedule, not a stuck
    // "conversion already in progress" dead end, and not a duplicate series.
    const retried = await createRecurringSeriesFromQuote(TENANT_ID, QUOTE_ID)
    expect(retried.already_converted).toBe(true)
    expect(retried.schedule_id).toBe(scheduleId)
    expect(retried.bookings_created).toBe(0)
    expect(store.recurring_schedules.length).toBe(1)
  })
})
