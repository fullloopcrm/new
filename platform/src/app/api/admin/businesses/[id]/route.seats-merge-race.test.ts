import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/businesses/[id] — admin_seats/team_seats merge race.
 *
 * BUG (fixed here, same TOCTOU class as the setup_progress/selena_config
 * fix in route.jsonb-merge-race.test.ts): the route read current
 * admin_seats/team_seats, merged the caller's partial patch (only one of
 * the two may be present) in JS, recomputed monthly_rate from that merged
 * pair, then wrote all three back as part of the SAME blind `updates`
 * UPDATE as every other field on this route. One admin bumping
 * admin_seats in one tab while another bumps team_seats in a second tab
 * both read the same stale pair -- whichever write lands second silently
 * reverts the first admin's seat change AND recomputes monthly_rate off
 * the wrong pair (undercharging or overcharging the tenant). The
 * Stripe subscription sync that follows then pushes the now-wrong local
 * seat count to Stripe too.
 *
 * FIX: merge_tenant_seats (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql)
 * merges both counts + recomputes monthly_rate in one atomic Postgres
 * UPDATE -- no JS-side read, so there's nothing to race. admin_seats/
 * team_seats/monthly_rate are stripped from `updates` so the later blind
 * tenants UPDATE can never stomp what the RPC just set.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  rpc: null as null | ((fn: string, args: Record<string, unknown>) => { single: () => Promise<{ data: unknown; error: unknown }> }),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: (fn: string, args: Record<string, unknown>) => holder.rpc!(fn, args),
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { PUT } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, slug: 'acme', name: 'Acme', admin_seats: 1, team_seats: 0, monthly_rate: 2500 },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
let rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>

beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  rpcCalls = []
  // Faithful stand-in for merge_tenant_seats: merges against whatever is
  // CURRENTLY on the row (not a stale JS snapshot) and recomputes
  // monthly_rate from the merged pair, exactly like the real atomic UPDATE.
  holder.rpc = (fn, args) => ({
    single: async () => {
      rpcCalls.push({ fn, args })
      if (fn !== 'merge_tenant_seats') return { data: null, error: { message: `unexpected rpc ${fn}` } }
      const row = (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === args.p_tenant_id)
      if (!row) return { data: null, error: { message: 'not found' } }
      const admins = Math.max(1, (args.p_admin_seats as number | null) ?? (row.admin_seats as number))
      const team = Math.max(0, (args.p_team_seats as number | null) ?? (row.team_seats as number))
      const rate = admins * (args.p_admin_monthly_cents as number) + team * (args.p_team_member_monthly_cents as number)
      row.admin_seats = admins
      row.team_seats = team
      row.monthly_rate = rate
      return { data: { admin_seats: admins, team_seats: team, monthly_rate: rate }, error: null }
    },
  })
})

function put(body: unknown) {
  return PUT(
    new Request('http://t/api/admin/businesses/' + TENANT_A, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: TENANT_A }) },
  )
}

function stored(field: string): unknown {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)?.[field]
}

describe('PUT /api/admin/businesses/[id] — admin_seats/team_seats merge race', () => {
  it('merges admin_seats alone via the atomic RPC, preserving a concurrently-set team_seats', async () => {
    // Simulate a concurrent team_seats bump that already landed on the row.
    ;(h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)!.team_seats = 3

    const res = await put({ admin_seats: 2 })
    expect(res.status).toBe(200)

    expect(stored('admin_seats')).toBe(2)
    expect(stored('team_seats')).toBe(3) // survives -- not clobbered back to 0
    expect(stored('monthly_rate')).toBe(2 * 2500 + 3 * 250)

    expect(rpcCalls).toEqual([
      {
        fn: 'merge_tenant_seats',
        args: { p_tenant_id: TENANT_A, p_admin_seats: 2, p_team_seats: null, p_admin_monthly_cents: 2500, p_team_member_monthly_cents: 250 },
      },
    ])
  })

  it('never puts admin_seats/team_seats/monthly_rate in the main blind tenants UPDATE (cannot be clobbered by it)', async () => {
    await put({ admin_seats: 2, admin_notes: 'seat bump' })
    const tenantsUpdates = h.capture.updates.filter((u) => u.table === 'tenants')
    expect(tenantsUpdates.length).toBeGreaterThan(0)
    for (const u of tenantsUpdates) {
      expect(u.values).not.toHaveProperty('admin_seats')
      expect(u.values).not.toHaveProperty('team_seats')
      expect(u.values).not.toHaveProperty('monthly_rate')
    }
  })

  it('a save with neither seat field never calls the seats RPC (only jsonb-merge or plain field saves stay on their own path)', async () => {
    await put({ admin_notes: 'no seat change' })
    expect(rpcCalls).toEqual([])
  })
})
