import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/recurring-schedules/[id]/regenerate POST — terminated-crew guard (P1/W2
 * fresh-ground, gap #12 class). Same bug as the sibling recurring-schedule
 * routes (../route.ts PUT, ../exception/route.ts): team_member_id/cleaner_id
 * was only checked for tenant ownership, never HR termination. Worse here —
 * this is the atomic "pattern changed" path (BookingsAdmin.tsx saveBooking),
 * so an unguarded assignment lands on the schedule rule AND every regenerated
 * booking in the series, not just one row.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { POST } from './route'

function seed() {
  return {
    recurring_schedules: [{ id: 'sch-a', tenant_id: CTX_TENANT, client_id: 'cli-a', property_id: null, pay_rate: 100, hourly_rate: 50 }],
    team_members: [
      { id: 'tm-terminated', tenant_id: CTX_TENANT },
      { id: 'tm-active', tenant_id: CTX_TENANT },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: CTX_TENANT, team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: CTX_TENANT, team_member_id: 'tm-active', hr_status: 'active' },
    ],
    bookings: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })
function regen(id: string, extra: Record<string, unknown> = {}) {
  return POST(
    new Request('http://t/x', { method: 'POST', body: JSON.stringify({ dates: ['2020-01-01'], preferred_time: '09:00', service_type: 'Standard', ...extra }) }),
    params(id),
  )
}

describe('admin/recurring-schedules/[id]/regenerate POST — terminated-crew guard', () => {
  it('BLOCKED: regenerating with a terminated team_member_id 400s, no rule update, no bookings created', async () => {
    const res = await regen('sch-a', { team_member_id: 'tm-terminated' })
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
    expect(h.capture.updates.find((u) => u.table === 'recurring_schedules')).toBeUndefined()
  })

  it('BLOCKED: same guard applies to the cleaner_id (nycmaid) alias', async () => {
    const res = await regen('sch-a', { cleaner_id: 'tm-terminated' })
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('CONTROL: regenerating with an active team_member_id still succeeds and stamps every regenerated booking', async () => {
    const res = await regen('sch-a', { team_member_id: 'tm-active', dates: ['2020-01-01', '2020-01-08'] })
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(ins?.rows.every((r) => r.team_member_id === 'tm-active')).toBe(true)
    const ruleUpdate = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(ruleUpdate?.values?.team_member_id).toBe('tm-active')
  })
})
