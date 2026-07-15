import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/admin/recurring-schedules/[id]/regenerate (tenantDb).
 *
 * The schedule is confirmed through tenantDb (`.eq('tenant_id', ctx)`), so a
 * schedule owned by another tenant 404s BEFORE the destructive regenerate
 * (rule update + future-booking delete + re-insert) runs — no foreign series is
 * ever mutated. Probe: regenerating a foreign schedule 404s and inserts nothing.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))

import { POST } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'sch-a', tenant_id: A, client_id: 'cli-a', property_id: null, pay_rate: 100, hourly_rate: 50 },
      { id: 'sch-b', tenant_id: B, client_id: 'cli-b', property_id: null, pay_rate: 100, hourly_rate: 50 },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: A },
      { id: 'tm-b1', tenant_id: B },
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

describe('admin/recurring-schedules/[id]/regenerate POST — tenant isolation', () => {
  it("positive control: regenerating the caller's own schedule stamps the new bookings", async () => {
    const res = await regen('sch-a')
    expect(res.status).toBe(200)
    expect((await res.json()).bookings_created).toBe(1)
    const ins = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(ins).toBeDefined()
    expect(ins!.rows.every((r) => r.tenant_id === A && r.schedule_id === 'sch-a')).toBe(true)
  })

  it('wrong-tenant probe: a foreign schedule 404s and mutates nothing', async () => {
    const res = await regen('sch-b')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Schedule not found')
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })
})

/**
 * WITNESS — cross-tenant team_member_id/cleaner_id FK injection.
 *
 * BUG (fixed here): a caller-supplied team_member_id (or its cleaner_id
 * alias) was written verbatim into BOTH the schedule rule update AND every
 * regenerated booking row, with no check that it belonged to the acting
 * tenant. GET /api/bookings and GET /api/schedules embed team_members(name,
 * phone) unscoped by tenant off these FKs, so a foreign id would leak
 * another tenant's employee PII on the next read.
 */
describe('admin/recurring-schedules/[id]/regenerate POST — cross-tenant team_member_id guard', () => {
  it('cross-tenant team_member_id probe: rejects a foreign tenant\'s team member with 400', async () => {
    const res = await regen('sch-a', { team_member_id: 'tm-b1' })
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
    const ruleUpdate = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(ruleUpdate).toBeUndefined()
  })

  it('cross-tenant cleaner_id (nycmaid alias) probe: rejects a foreign tenant\'s team member with 400', async () => {
    const res = await regen('sch-a', { cleaner_id: 'tm-b1' })
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('same-tenant team_member_id succeeds and is stamped on the schedule + generated bookings', async () => {
    const res = await regen('sch-a', { team_member_id: 'tm-a1' })
    expect(res.status).toBe(200)
    const bookingInsert = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(bookingInsert?.rows[0]?.team_member_id).toBe('tm-a1')
    const ruleUpdate = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(ruleUpdate?.values?.team_member_id).toBe('tm-a1')
  })
})
