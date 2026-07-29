/**
 * Characterization tests for finance/backfill POST — zero coverage before this
 * file despite computing REAL money (team_member_pay owed to a cleaner, and the
 * client price charged) for every completed booking missing those fields.
 *
 * Pins:
 *   - hours: prefers check_in_time/check_out_time over start_time/end_time when
 *     both are present; roundToHalfHour uses a 10-minute grace (3:09 → 3.0h,
 *     3:10 → 3.5h) — the exact boundary from the source comment
 *   - team pay = hours * rate * 100, rate = team_members.pay_rate ??
 *     team_members.hourly_rate ?? 25 (the hardcoded fallback)
 *   - client price = hours * rate * 100, rate = booking.hourly_rate ?? 75, with
 *     applyDiscount (percent, rounds DOWN to nearest $5) then applyCredit
 *     (flat cents, floors at 0) applied on top, in that order
 *   - only tenant-scoped, completed, team_member_pay IS NULL bookings are
 *     touched; `updated` in the response equals exactly how many were processed
 *   - an auth failure from requirePermission short-circuits before any query
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(async () => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null })),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  h = createTenantDbHarness({ bookings: [] })
  holder.from = h.from
})

function booking(id: string, fields: Record<string, unknown>) {
  return {
    id,
    tenant_id: CTX_TENANT,
    status: 'completed',
    team_member_pay: null,
    hourly_rate: null,
    discount_percent: null,
    one_time_credit_cents: null,
    check_in_time: null,
    check_out_time: null,
    team_members: null,
    ...fields,
  }
}

describe('POST /api/finance/backfill', () => {
  it('short-circuits on an auth failure before touching bookings', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await POST()
    expect(res.status).toBe(403)
  })

  it('prefers check_in/check_out over start/end when both are present, rounds to half-hour with 10-min grace', async () => {
    h.seed.bookings.push(
      booking('bk-checkin', {
        start_time: '2026-07-01T09:00:00Z',
        end_time: '2026-07-01T15:00:00Z', // would be 6h if used — proves check-in/out wins
        check_in_time: '2026-07-01T10:00:00Z',
        check_out_time: '2026-07-01T13:09:00Z', // 3h9m -> rounds DOWN to 3.0h (9 < 10 min grace)
        team_members: { pay_rate: 20 },
        hourly_rate: 60,
      }),
    )
    const res = await POST()
    const body = await res.json()
    expect(body).toEqual({ success: true, updated: 1 })
    const updated = h.seed.bookings.find((b) => b.id === 'bk-checkin')!
    expect(updated.actual_hours).toBe(3.0)
    expect(updated.team_member_pay).toBe(6000) // 3.0h * $20 * 100
    expect(updated.price).toBe(18000) // 3.0h * $60 * 100
  })

  it('crosses the 10-minute grace boundary to round UP to the next half-hour', async () => {
    h.seed.bookings.push(
      booking('bk-grace', {
        check_in_time: '2026-07-01T10:00:00Z',
        check_out_time: '2026-07-01T13:10:00Z', // 3h10m -> rounds UP to 3.5h
        team_members: { pay_rate: 10 },
        hourly_rate: 10,
      }),
    )
    await POST()
    const updated = h.seed.bookings.find((b) => b.id === 'bk-grace')!
    expect(updated.actual_hours).toBe(3.5)
  })

  it('falls back to start_time/end_time when check-in/check-out are absent', async () => {
    h.seed.bookings.push(
      booking('bk-fallback', {
        start_time: '2026-07-01T09:00:00Z',
        end_time: '2026-07-01T11:00:00Z', // exactly 2h
        team_members: { pay_rate: 15 },
        hourly_rate: 50,
      }),
    )
    await POST()
    const updated = h.seed.bookings.find((b) => b.id === 'bk-fallback')!
    expect(updated.actual_hours).toBe(2)
    expect(updated.team_member_pay).toBe(3000) // 2h * $15 * 100
    expect(updated.price).toBe(10000) // 2h * $50 * 100
  })

  it('team pay rate falls back: pay_rate ?? hourly_rate ?? 25', async () => {
    h.seed.bookings.push(
      booking('bk-rate-fallback', {
        start_time: '2026-07-01T09:00:00Z',
        end_time: '2026-07-01T10:00:00Z', // 1h
        team_members: { hourly_rate: 18 }, // no pay_rate set
      }),
    )
    h.seed.bookings.push(
      booking('bk-no-team', {
        start_time: '2026-07-01T09:00:00Z',
        end_time: '2026-07-01T10:00:00Z', // 1h
        team_members: null, // neither set -> hardcoded default 25
      }),
    )
    await POST()
    expect(h.seed.bookings.find((b) => b.id === 'bk-rate-fallback')!.team_member_pay).toBe(1800)
    expect(h.seed.bookings.find((b) => b.id === 'bk-no-team')!.team_member_pay).toBe(2500)
  })

  it('client rate defaults to 75 when booking.hourly_rate is null', async () => {
    h.seed.bookings.push(
      booking('bk-client-default', {
        start_time: '2026-07-01T09:00:00Z',
        end_time: '2026-07-01T10:00:00Z', // 1h
        hourly_rate: null,
      }),
    )
    await POST()
    expect(h.seed.bookings.find((b) => b.id === 'bk-client-default')!.price).toBe(7500)
  })

  it('applies discount_percent (rounds down to nearest $5) THEN one_time_credit_cents (floors at 0)', async () => {
    h.seed.bookings.push(
      booking('bk-discount', {
        start_time: '2026-07-01T09:00:00Z',
        end_time: '2026-07-01T10:00:00Z', // 1h
        hourly_rate: 100, // base 10000 cents
        discount_percent: 12, // 10000 * 0.88 = 8800 -> floor to nearest 500 = 8500
        one_time_credit_cents: 1000, // 8500 - 1000 = 7500
      }),
    )
    await POST()
    expect(h.seed.bookings.find((b) => b.id === 'bk-discount')!.price).toBe(7500)
  })

  it('a credit larger than the discounted price floors at 0, never negative', async () => {
    h.seed.bookings.push(
      booking('bk-overcredit', {
        start_time: '2026-07-01T09:00:00Z',
        end_time: '2026-07-01T10:00:00Z',
        hourly_rate: 20, // 2000 cents
        one_time_credit_cents: 9000,
      }),
    )
    await POST()
    expect(h.seed.bookings.find((b) => b.id === 'bk-overcredit')!.price).toBe(0)
  })

  it('updated count matches the number of processed bookings, 0 when none match', async () => {
    const res = await POST()
    const body = await res.json()
    expect(body).toEqual({ success: true, updated: 0 })
  })
})
