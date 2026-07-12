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
    bookings: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })
function regen(id: string) {
  return POST(
    new Request('http://t/x', { method: 'POST', body: JSON.stringify({ dates: ['2020-01-01'], preferred_time: '09:00', service_type: 'Standard' }) }),
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
