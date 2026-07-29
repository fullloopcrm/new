/**
 * Characterization tests for GET /api/finance/payroll-prep — zero coverage
 * before this file. Backs the payroll / 1099 prep view: per-team-member
 * gross pay, hours, payouts, balance owed, and the $600 1099 threshold flag.
 *
 * Locks in the current math so a refactor doesn't silently change what a
 * tenant owner is told they owe a contractor:
 *   - gross_pay_cents sums bookings.team_member_pay (already cents, no *100)
 *     across every 'completed' booking in [from, to] for that team member
 *   - paid_out_cents only counts payouts with status paid|succeeded|completed
 *     — a 'pending' or 'failed' payout row does not reduce balance owed
 *   - balance_owed_cents floors at 0 (never negative, even if overpaid)
 *   - hits_1099_threshold flips at exactly $600 (60000 cents), inclusive
 *   - rows are sorted by gross_pay_cents descending
 *   - an inactive (active:false) team member is excluded entirely
 *   - `?year=YYYY` overrides from/to to the full calendar year
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { GET } from './route'

function req(qs = ''): Request {
  return new Request(`http://t/api/finance/payroll-prep${qs}`)
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ team_members: [], bookings: [], team_member_payouts: [] })
  holder.from = h.from
})

describe('GET /api/finance/payroll-prep — gross pay + hours aggregation', () => {
  it('sums team_member_pay (already cents) across completed bookings in range', async () => {
    h.seed.team_members.push({ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Alex', active: true })
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', team_member_pay: 5000, actual_hours: 4, start_time: '2026-07-10T00:00:00Z' },
      { id: 'bk-2', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', team_member_pay: 3000, actual_hours: 2, start_time: '2026-07-15T00:00:00Z' },
    )
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0]).toMatchObject({ team_member_id: 'tm-1', hours: 6, jobs: 2, gross_pay_cents: 8000 })
  })

  it('a non-completed booking never contributes to gross pay or hours', async () => {
    h.seed.team_members.push({ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Alex', active: true })
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'scheduled', team_member_pay: 9999, actual_hours: 10, start_time: '2026-07-10T00:00:00Z' },
    )
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    expect(body.rows[0]).toMatchObject({ hours: 0, jobs: 0, gross_pay_cents: 0 })
  })

  it('excludes an inactive team member entirely from the roster', async () => {
    h.seed.team_members.push(
      { id: 'tm-1', tenant_id: CTX_TENANT, name: 'Alex', active: true },
      { id: 'tm-2', tenant_id: CTX_TENANT, name: 'Sam', active: false },
    )
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    expect(body.rows.map((r: { team_member_id: string }) => r.team_member_id)).toEqual(['tm-1'])
  })
})

describe('GET /api/finance/payroll-prep — payouts + balance owed', () => {
  it('only paid|succeeded|completed payouts reduce paid_out_cents; pending does not', async () => {
    h.seed.team_members.push({ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Alex', active: true })
    h.seed.bookings.push({ id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', team_member_pay: 10000, actual_hours: 5, start_time: '2026-07-10T00:00:00Z' })
    h.seed.team_member_payouts.push(
      { team_member_id: 'tm-1', tenant_id: CTX_TENANT, amount_cents: 4000, status: 'paid', created_at: '2026-07-11T00:00:00Z' },
      { team_member_id: 'tm-1', tenant_id: CTX_TENANT, amount_cents: 3000, status: 'pending', created_at: '2026-07-12T00:00:00Z' },
    )
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    expect(body.rows[0]).toMatchObject({ gross_pay_cents: 10000, paid_out_cents: 4000, balance_owed_cents: 6000 })
  })

  it('balance_owed_cents floors at 0 even if paid_out exceeds gross (never negative)', async () => {
    h.seed.team_members.push({ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Alex', active: true })
    h.seed.bookings.push({ id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', team_member_pay: 1000, actual_hours: 1, start_time: '2026-07-10T00:00:00Z' })
    h.seed.team_member_payouts.push(
      { team_member_id: 'tm-1', tenant_id: CTX_TENANT, amount_cents: 5000, status: 'succeeded', created_at: '2026-07-11T00:00:00Z' },
    )
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    expect(body.rows[0].balance_owed_cents).toBe(0)
  })
})

describe('GET /api/finance/payroll-prep — 1099 threshold', () => {
  it.each([
    [59999, false],
    [60000, true],
    [60001, true],
  ])('gross_pay_cents=%i => hits_1099_threshold=%s', async (grossCents, expected) => {
    h = createTenantDbHarness({
      team_members: [{ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Alex', active: true }],
      bookings: [{ id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', team_member_pay: grossCents, actual_hours: 1, start_time: '2026-07-10T00:00:00Z' }],
      team_member_payouts: [],
    })
    holder.from = h.from
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    expect(body.rows[0].hits_1099_threshold).toBe(expected)
  })
})

describe('GET /api/finance/payroll-prep — sorting, totals, and ?year=', () => {
  it('sorts rows by gross_pay_cents descending', async () => {
    h.seed.team_members.push(
      { id: 'tm-lo', tenant_id: CTX_TENANT, name: 'Low', active: true },
      { id: 'tm-hi', tenant_id: CTX_TENANT, name: 'High', active: true },
    )
    h.seed.bookings.push(
      { id: 'bk-lo', tenant_id: CTX_TENANT, team_member_id: 'tm-lo', status: 'completed', team_member_pay: 1000, actual_hours: 1, start_time: '2026-07-10T00:00:00Z' },
      { id: 'bk-hi', tenant_id: CTX_TENANT, team_member_id: 'tm-hi', status: 'completed', team_member_pay: 9000, actual_hours: 1, start_time: '2026-07-10T00:00:00Z' },
    )
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    expect(body.rows.map((r: { team_member_id: string }) => r.team_member_id)).toEqual(['tm-hi', 'tm-lo'])
  })

  it('totals are the sum across all rows', async () => {
    h.seed.team_members.push(
      { id: 'tm-1', tenant_id: CTX_TENANT, name: 'A', active: true },
      { id: 'tm-2', tenant_id: CTX_TENANT, name: 'B', active: true },
    )
    h.seed.bookings.push(
      { id: 'bk-1', tenant_id: CTX_TENANT, team_member_id: 'tm-1', status: 'completed', team_member_pay: 5000, actual_hours: 3, start_time: '2026-07-10T00:00:00Z' },
      { id: 'bk-2', tenant_id: CTX_TENANT, team_member_id: 'tm-2', status: 'completed', team_member_pay: 7000, actual_hours: 4, start_time: '2026-07-10T00:00:00Z' },
    )
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    const body = await res.json()
    expect(body.totals).toMatchObject({ total_hours: 7, total_jobs: 2, total_gross_cents: 12000, total_paid_out_cents: 0, total_balance_cents: 12000, contractors_above_1099_threshold: 0 })
  })

  it('?year=2026 overrides from/to to the full calendar year', async () => {
    h.seed.team_members.push({ id: 'tm-1', tenant_id: CTX_TENANT, name: 'Alex', active: true })
    const res = await GET(req('?year=2026'))
    const body = await res.json()
    expect(body.period).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
})

describe('GET /api/finance/payroll-prep — auth', () => {
  it('propagates the requirePermission error response (e.g. 403) without touching data', async () => {
    const { requirePermission } = await import('@/lib/require-permission')
    vi.mocked(requirePermission).mockResolvedValueOnce({
      tenant: null,
      error: new (await import('next/server')).NextResponse(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403 }),
    } as never)
    const res = await GET(req('?from=2026-07-01&to=2026-07-31'))
    expect(res.status).toBe(403)
  })
})
