import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/recurring-schedules/:id/regenerate — first route-level
 * regression test (P1/W1 O13 sweep). Atomic "edit recurring pattern": update
 * the rule, insert the new pattern's bookings, then retire the old
 * future/unserviced ones by exact id — in that order specifically so a
 * failed insert leaves the existing series untouched. Zero prior coverage of
 * that ordering guarantee, the rate-fallback-to-schedule behavior, or tenant
 * scoping on a caller-supplied schedule id.
 *
 * tenant-db-fake's `.delete().select()` doesn't return the deleted rows
 * (returns `data: null`, unlike real PostgREST) — the local wrapper below
 * captures the `.in('id', ids)` set right before deletion and substitutes it
 * as the delete's returned data, so `bookings_removed` in the response can
 * be asserted the same way it would behave against the real DB.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'bookings') return chain
      let capturedIds: unknown[] | null = null
      const origIn = chain.in as (col: string, vals: unknown[]) => unknown
      chain.in = (col: string, vals: unknown[]) => {
        if (col === 'id') capturedIds = vals
        return origIn(col, vals)
      }
      const origThen = chain.then as (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => unknown
      chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
        // Snapshot the rows-about-to-be-deleted BEFORE calling origThen — origThen's
        // body runs runQuery() synchronously (mutating h.store immediately), so
        // capturing "pre" state has to happen ahead of this call, not inside its
        // callback (which only runs after the row is already gone from the store).
        const preRows = capturedIds
          ? (h.store.bookings || []).filter((row) => (capturedIds as unknown[]).includes(row.id))
          : null
        return origThen((result: unknown) => {
          const r = result as { data: unknown; error: unknown }
          if (preRows && r.data === null && r.error === null) {
            return res({ ...r, data: preRows })
          }
          return res(result)
        }, rej)
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { POST } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', client_id: 'client-A1', property_id: 'prop-A1', pay_rate: 20, hourly_rate: 40 },
      { id: 'sched-B1', tenant_id: 'tenant-B', client_id: 'client-B1', property_id: null, pay_rate: 15, hourly_rate: 35 },
    ],
    bookings: [
      { id: 'book-old-future', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-08-10T09:00:00' },
      { id: 'book-old-past', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'scheduled', start_time: '2026-01-01T09:00:00' },
      { id: 'book-old-completed', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'completed', start_time: '2026-08-11T09:00:00' },
      { id: 'book-other-tenant', tenant_id: 'tenant-B', schedule_id: 'sched-B1', status: 'scheduled', start_time: '2026-08-10T09:00:00' },
    ],
    team_members: [
      { id: 'tm-1', tenant_id: 'tenant-A', name: 'Tina' },
      { id: 'cleaner-9', tenant_id: 'tenant-A', name: 'Carl' },
    ],
  }
})

const baseBody = {
  dates: ['2026-08-15', '2026-08-22'],
  preferred_time: '9:00 am',
  duration_hours: 2,
  from_date: '2026-08-01T00:00:00',
}

describe('POST /api/admin/recurring-schedules/:id/regenerate — permission gate', () => {
  it('returns the permission error unchanged and never touches the DB', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await POST(postReq(baseBody), params('sched-A1'))

    expect(res.status).toBe(403)
    expect(h.store.bookings.length).toBe(4)
  })
})

describe('POST /api/admin/recurring-schedules/:id/regenerate — validation', () => {
  it('rejects an empty/missing dates[] with 400', async () => {
    const res = await POST(postReq({ ...baseBody, dates: [] }), params('sched-A1'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'dates[] required' })
  })

  it('returns 404 for a schedule id that does not exist', async () => {
    const res = await POST(postReq(baseBody), params('does-not-exist'))

    expect(res.status).toBe(404)
  })
})

describe('POST /api/admin/recurring-schedules/:id/regenerate — tenant isolation', () => {
  it("tenant A can never regenerate tenant B's schedule", async () => {
    const res = await POST(postReq(baseBody), params('sched-B1'))

    expect(res.status).toBe(404)
    expect(h.store.bookings.filter((b) => b.tenant_id === 'tenant-B').length).toBe(1)
    expect(h.store.recurring_schedules.find((s) => s.id === 'sched-B1')?.pay_rate).toBe(15)
  })
})

describe('POST /api/admin/recurring-schedules/:id/regenerate — rule update', () => {
  it('applies the caller-supplied rule fields and sets next_generate_after to the last date', async () => {
    await POST(postReq({ ...baseBody, recurring_type: 'weekly', day_of_week: 3, hourly_rate: 45, pay_rate: 22, notes: 'ring doorbell' }), params('sched-A1'))

    const sched = h.store.recurring_schedules.find((s) => s.id === 'sched-A1')!
    expect(sched.recurring_type).toBe('weekly')
    expect(sched.day_of_week).toBe(3)
    expect(sched.hourly_rate).toBe(45)
    expect(sched.pay_rate).toBe(22)
    expect(sched.notes).toBe('ring doorbell')
    expect(sched.next_generate_after).toBe('2026-08-22')
  })

  it('leaves pay_rate/hourly_rate on the schedule unchanged when the caller omits them', async () => {
    await POST(postReq(baseBody), params('sched-A1'))

    const sched = h.store.recurring_schedules.find((s) => s.id === 'sched-A1')!
    expect(sched.pay_rate).toBe(20)
    expect(sched.hourly_rate).toBe(40)
  })
})

describe('POST /api/admin/recurring-schedules/:id/regenerate — booking regeneration', () => {
  it('inserts one new booking per date, carrying the schedule’s client_id/property_id and computed start/end times', async () => {
    const res = await POST(postReq(baseBody), params('sched-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.bookings_created).toBe(2)

    const created = h.store.bookings.filter((b) => b.schedule_id === 'sched-A1' && (b.start_time as string).startsWith('2026-08-15') )
    expect(created).toHaveLength(1)
    const row = created[0]
    expect(row.tenant_id).toBe('tenant-A')
    expect(row.client_id).toBe('client-A1')
    expect(row.property_id).toBe('prop-A1')
    expect(row.start_time).toBe('2026-08-15T09:00:00')
    expect(row.end_time).toBe('2026-08-15T11:00:00')
    expect(row.status).toBe('scheduled')
  })

  it('honors an explicit status/team_member_id/service_type/price on the regenerated bookings', async () => {
    await POST(
      postReq({ ...baseBody, dates: ['2026-08-15'], status: 'pending', team_member_id: 'tm-1', service_type: 'Deep Clean', price: 15000 }),
      params('sched-A1')
    )

    const row = h.store.bookings.find((b) => b.schedule_id === 'sched-A1' && b.start_time === '2026-08-15T09:00:00')!
    expect(row.status).toBe('pending')
    expect(row.team_member_id).toBe('tm-1')
    expect(row.service_type).toBe('Deep Clean')
    expect(row.price).toBe(15000)
  })

  it('accepts the nycmaid aliases cleaner_id and cleaner_pay_rate', async () => {
    await POST(postReq({ ...baseBody, dates: ['2026-08-15'], cleaner_id: 'cleaner-9', cleaner_pay_rate: 30 }), params('sched-A1'))

    const row = h.store.bookings.find((b) => b.schedule_id === 'sched-A1' && b.start_time === '2026-08-15T09:00:00')!
    expect(row.team_member_id).toBe('cleaner-9')
    expect(row.pay_rate).toBe(30)
  })

  it('removes old scheduled/pending bookings from the cutoff forward, never touching completed history or past bookings', async () => {
    const res = await POST(postReq(baseBody), params('sched-A1'))
    const json = await res.json()

    expect(json.bookings_removed).toBe(1)
    const ids = h.store.bookings.map((b) => b.id)
    expect(ids).not.toContain('book-old-future')
    expect(ids).toContain('book-old-past')
    expect(ids).toContain('book-old-completed')
  })
})
