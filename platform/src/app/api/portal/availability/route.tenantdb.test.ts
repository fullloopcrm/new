import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/portal/availability.
 * The bookings lookup used to carry a manual .eq('tenant_id', auth.tid) filter --
 * proves a foreign tenant's booking on the same date never marks a slot as
 * booked for the caller.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const CLIENT_ID = 'client-a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) <= (val as string)); return c },
    not: () => c,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { GET } from './route'

beforeEach(() => {
  DB.bookings = [
    // Tenant B has a booking covering the entire day on the requested date --
    // must not block tenant A's slots.
    { tenant_id: TENANT_B, start_time: '2026-08-05T08:00:00', end_time: '2026-08-05T20:00:00', status: 'confirmed' },
  ]
})

describe('GET /api/portal/availability — tenantDb scoping', () => {
  it('never counts a foreign tenant\'s booking as blocking the caller\'s slots', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/availability?date=2026-08-05&duration=2', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    const body = await res.json()
    expect(body.slots.every((s: { available: boolean }) => s.available)).toBe(true)
  })
})
