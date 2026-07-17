import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/admin/recurring-schedules/:id/regenerate inserts the new series
 * (step 3) then retires the OLD future scheduled/pending bookings by id
 * (step 4) in a single multi-row DELETE. Postgres runs that DELETE
 * atomically: if even one old booking has since picked up a payment
 * (payments.booking_id has no ON DELETE action — status is never checked by
 * /api/payments/link or /api/payments/checkout, so a deposit can land on a
 * still-"scheduled" booking), the whole statement is rejected and every old
 * row survives. The route used to destructure only `data` from that delete
 * and ignore `error`, so it reported `success: true, bookings_removed: 0`
 * with the NEW rows already committed — duplicate old+new bookings left on
 * the calendar with no signal anything went wrong. Fixed to check the
 * delete's error and return a 409 that still reports bookings_created (since
 * that already committed) instead of a false success.
 */

const { TENANT } = vi.hoisted(() => ({ TENANT: 'tenant-1' }))

const scheduleRow = { id: 'sch-1', tenant_id: TENANT, client_id: 'client-1', property_id: null, pay_rate: 20, hourly_rate: 40, updated_at: null as string | null }
const oldBookingRows = [{ id: 'old-1' }, { id: 'old-2' }]

let deleteError: { message: string } | null = null

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/supabase', () => {
  function chainOf(handlers: Record<string, unknown>) {
    const chain: Record<string, unknown> = { ...handlers }
    for (const k of ['select', 'eq', 'in', 'gte', 'is', 'order']) {
      if (!(k in chain)) chain[k] = () => chain
    }
    return chain
  }

  function from(table: string) {
    if (table === 'recurring_schedules') {
      let isUpdate = false
      const chain = chainOf({
        update: () => { isUpdate = true; return chain },
        single: async () => ({ data: scheduleRow, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(
            isUpdate ? { data: [{ id: scheduleRow.id }], error: null } : { data: scheduleRow, error: null },
          ).then(res, rej),
      })
      return chain
    }
    if (table === 'bookings') {
      let op: 'select' | 'insert' | 'delete' = 'select'
      let insertedRows: Record<string, unknown>[] = []
      const chain = chainOf({
        insert: (rows: Record<string, unknown>[]) => {
          op = 'insert'
          insertedRows = rows.map((r, i) => ({ ...r, id: `new-${i}` }))
          return chain
        },
        delete: () => { op = 'delete'; return chain },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (op === 'insert') return Promise.resolve({ data: insertedRows, error: null }).then(res, rej)
          if (op === 'delete') {
            return Promise.resolve(
              deleteError ? { data: null, error: deleteError } : { data: oldBookingRows, error: null },
            ).then(res, rej)
          }
          return Promise.resolve({ data: oldBookingRows, error: null }).then(res, rej)
        },
      })
      return chain
    }
    return chainOf({
      single: async () => ({ data: null, error: null }),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(res, rej),
    })
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

const params = { params: Promise.resolve({ id: 'sch-1' }) }
const postReq = () =>
  new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ dates: ['2026-08-01'], preferred_time: '09:00', from_date: '2026-07-01' }),
  })

describe('POST /api/admin/recurring-schedules/:id/regenerate — delete-error swallow', () => {
  it('reports success and removed count when the old-booking delete succeeds', async () => {
    deleteError = null
    const res = await POST(postReq(), params)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.bookings_created).toBe(1)
    expect(json.bookings_removed).toBe(2)
  })

  it('does NOT report success when the old-booking delete fails (FK RESTRICT from a payment)', async () => {
    deleteError = { message: 'update or delete on table "bookings" violates foreign key constraint' }
    const res = await POST(postReq(), params)
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toMatch(/could not be removed/i)
    expect(json.bookings_created).toBe(1)
    expect(json.success).not.toBe(true)
  })
})
