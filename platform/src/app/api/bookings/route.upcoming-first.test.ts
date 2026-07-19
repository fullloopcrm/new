import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/bookings — default (unpaginated, no date filter) list surfaces
 * today/upcoming bookings even when far-future bookings outnumber the page
 * limit (nycmaid ref 6495a1b2, "sort admin bookings list with today/upcoming
 * first, past bookings after").
 *
 * BUG this closes: this route pages with `ORDER BY start_time DESC LIMIT N`
 * for the plain "give me the bookings list" shape every caller uses
 * (BookingsAdmin, client/team detail pages, analytics — none pass a date
 * range or page param). DESC-first means the FURTHEST-future booking sorts
 * first. That was harmless while recurring schedules only kept a ~4-week
 * buffer, but P1/W2's own generate-recurring fix (widened horizon to
 * end-of-next-year) means a real tenant can now have hundreds of far-future
 * recurring bookings — enough to fill an entire DESC-ordered page with
 * next-December rows and never reach today's jobs.
 *
 * A real-sort mock is used here (not the shared tenant-isolation-harness,
 * whose `.order()` is an intentional no-op for filter-isolation testing) —
 * this suite specifically needs `.order()`/`.range()` to behave like real
 * Postgres to prove the bucketing fix.
 */

type Row = Record<string, unknown>

function makeSortedTable(rows: Row[]) {
  return () => {
    const filters: Array<(r: Row) => boolean> = []
    let orderCol = ''
    let ascending = true
    let rangeFrom = 0
    let rangeTo = Infinity
    let withCount = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: (_cols: unknown, opts?: { count?: string }) => { withCount = !!opts?.count; return chain },
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return chain },
      lt: (col: string, val: unknown) => { filters.push((r) => String(r[col]) < String(val)); return chain },
      lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return chain },
      order: (col: string, opts?: { ascending?: boolean }) => { orderCol = col; ascending = opts?.ascending !== false; return chain },
      range: (from: number, to: number) => { rangeFrom = from; rangeTo = to; return chain },
      then: (resolve: (v: unknown) => unknown) => {
        let hit = rows.filter((r) => filters.every((f) => f(r)))
        if (orderCol) {
          hit = [...hit].sort((a, b) => {
            const av = String(a[orderCol]), bv = String(b[orderCol])
            return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
          })
        }
        const paged = hit.slice(rangeFrom, rangeTo + 1)
        return Promise.resolve({ data: paged, count: withCount ? hit.length : null, error: null }).then(resolve)
      },
    }
    return chain
  }
}

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ bookingsRows: [] as Row[] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => (t === 'bookings' ? makeSortedTable(holder.bookingsRows)() : { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }) },
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {},
  getTenantForRequest: async () => ({ tenantId: CTX_TENANT }),
}))
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))
vi.mock('@/lib/schedule/duration-class', () => ({ deriveDurationClass: () => null }))

import { GET } from './route'

function reqUrl(qs: string): NextRequestLike {
  const url = new URL(`http://t/api/bookings${qs}`)
  return { nextUrl: url } as unknown as NextRequestLike
}
type NextRequestLike = { nextUrl: URL }

function iso(daysFromToday: number): string {
  return new Date(Date.now() + daysFromToday * 86400000).toISOString()
}

beforeEach(() => {
  holder.bookingsRows = []
})

describe('GET /api/bookings — default list buckets upcoming-then-past instead of pure DESC', () => {
  it('a today booking is NOT crowded out by 5 far-future bookings under a small limit', async () => {
    holder.bookingsRows = [
      // Far-future recurring bookings, seeded first (insertion order should
      // not matter either way — the bug is about DATE order, not insertion).
      { id: 'far-1', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(400) },
      { id: 'far-2', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(390) },
      { id: 'far-3', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(380) },
      { id: 'far-4', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(370) },
      { id: 'far-5', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(360) },
      { id: 'today-1', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(0.1) },
    ]

    const res = await GET(reqUrl('?limit=3') as unknown as import('next/server').NextRequest)
    const body = await res.json()

    expect(res.status).toBe(200)
    const ids = (body.bookings as Row[]).map((b) => b.id)
    expect(ids).toContain('today-1')
  })

  it('upcoming bookings are ordered soonest-first, not furthest-first', async () => {
    holder.bookingsRows = [
      { id: 'later', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(20) },
      { id: 'soonest', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(1) },
      { id: 'middle', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(10) },
    ]

    const res = await GET(reqUrl('?limit=10') as unknown as import('next/server').NextRequest)
    const body = await res.json()
    const ids = (body.bookings as Row[]).map((b) => b.id)

    expect(ids).toEqual(['soonest', 'middle', 'later'])
  })

  it('backfills with past bookings (most-recent-first) once upcoming is exhausted', async () => {
    holder.bookingsRows = [
      { id: 'upcoming-1', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(1) },
      { id: 'past-recent', tenant_id: CTX_TENANT, status: 'completed', start_time: iso(-1) },
      { id: 'past-older', tenant_id: CTX_TENANT, status: 'completed', start_time: iso(-10) },
    ]

    const res = await GET(reqUrl('?limit=10') as unknown as import('next/server').NextRequest)
    const body = await res.json()
    const ids = (body.bookings as Row[]).map((b) => b.id)

    expect(ids).toEqual(['upcoming-1', 'past-recent', 'past-older'])
  })

  it('date-range requests (?from=/&to=) are unaffected — plain DESC, not bucketed', async () => {
    holder.bookingsRows = [
      { id: 'a', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(5) },
      { id: 'b', tenant_id: CTX_TENANT, status: 'scheduled', start_time: iso(6) },
    ]
    const res = await GET(reqUrl(`?from=${encodeURIComponent(iso(0))}&to=${encodeURIComponent(iso(30))}`) as unknown as import('next/server').NextRequest)
    const body = await res.json()
    const ids = (body.bookings as Row[]).map((b) => b.id)

    expect(ids).toEqual(['b', 'a']) // still furthest-first for an explicit range query
  })
})
