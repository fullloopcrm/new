/**
 * POST /api/team-portal/jobs/claim — booking_team_members lead-sync error
 * handling. Same fix/rationale as
 * ../reassign/route.lead-sync-retry.test.ts: the upsert's error was
 * previously never checked, so a concurrent writer to this booking's team
 * that hits the new booking_team_members_one_lead_per_booking unique index
 * (2026_07_18_booking_team_members_one_lead_per_booking.sql) would silently
 * leave the booking with no is_lead row at all. Now captured + retried once.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const failNextUpserts = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'booking_team_members') return chain
      const origUpsert = chain.upsert as (payload: unknown, opts?: unknown) => unknown
      chain.upsert = (payload: unknown, opts?: unknown) => {
        if (failNextUpserts.count > 0) {
          failNextUpserts.count -= 1
          return {
            then: (res: (v: unknown) => unknown) =>
              Promise.resolve(res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "booking_team_members_one_lead_per_booking"' } })),
          }
        }
        return origUpsert(payload, opts)
      }
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { POST } from './route'
import { createToken } from '../../auth/token'

const TENANT_A = 'tenant-A'
const MEMBER = 'member-1'

function req(bookingId: string): Request {
  const token = createToken(MEMBER, TENANT_A, 25, 'worker')
  return new Request('http://localhost/api/team-portal/jobs/claim', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId }),
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-1', tenant_id: TENANT_A, team_member_id: null, status: 'scheduled', start_time: '2026-07-20T14:00:00' },
    ],
    team_members: [{ id: MEMBER, tenant_id: TENANT_A, status: 'active', pay_rate: 25 }],
    booking_team_members: [],
  }
  failNextUpserts.count = 0
})

describe('POST /api/team-portal/jobs/claim — lead-sync error handling', () => {
  it('retries once and succeeds when the first upsert hits a transient unique-index conflict', async () => {
    failNextUpserts.count = 1
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(req('book-1'))
    expect(res.status).toBe(200)

    const leadRows = h.store.booking_team_members.filter((r) => r.booking_id === 'book-1' && r.is_lead)
    expect(leadRows).toHaveLength(1)
    expect(leadRows[0].team_member_id).toBe(MEMBER)
    expect(errSpy).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('logs loudly (does not silently swallow) if the retry ALSO fails, without failing the claim', async () => {
    failNextUpserts.count = 2
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(req('book-1'))

    expect(res.status).toBe(200)
    expect(h.store.bookings[0].team_member_id).toBe(MEMBER)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
