import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/admin/recurring-schedules — next_booking_date used a booking-status
 * allowlist (['scheduled','pending']) inconsistent with every sibling schedule
 * action route (reassign/exception/pause/cancel/regenerate all treat 'confirmed'
 * as a live upcoming booking too). A confirmed next occurrence was silently
 * skipped, so the list could show a stale/later date or none at all even
 * though a real upcoming visit existed.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    recurring_schedules: [
      { id: 'sched-A1', tenant_id: 'tenant-A', client_id: 'client-A1' },
    ],
    clients: [{ id: 'client-A1', tenant_id: 'tenant-A', name: 'Jane Doe', phone: null, address: null }],
    team_members: [],
    bookings: [
      { id: 'book-confirmed', tenant_id: 'tenant-A', schedule_id: 'sched-A1', status: 'confirmed', start_time: '2099-01-01T09:00:00' },
    ],
  }
})

describe('GET /api/admin/recurring-schedules — next_booking_date', () => {
  it('surfaces a confirmed future booking as the next occurrence, not just scheduled/pending', async () => {
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
    const json = await res.json()
    const sched = json.find((s: { id: string }) => s.id === 'sched-A1')
    expect(sched.next_booking_date).toBe('2099-01-01T09:00:00')
  })
})
