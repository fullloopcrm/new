import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PUT /api/bookings/batch-update — item (117)'s own flagged-but-deferred
 * follow-up: the "Series Updated" admin in-app notification reconstructed a
 * Date from `start_time`'s raw numeric Y/M/D/H/M components (taken straight
 * from the UTC ISO string, since `start_time` is stored with a 'Z' suffix)
 * and rendered it with no `timeZone` option — silently displaying the UTC
 * calendar date instead of the tenant's own configured zone, same bug class
 * as items (70)/(115)/(117), just in a file that sweep explicitly deferred
 * ("needs its own investigation before touching, left alone here"). Proves
 * the fix: the notification message now shows the tenant's own Pacific
 * calendar date, not the UTC one.
 */

const TENANT_ID = 'tenant-batch-tz'
// 2026-08-10T05:00:00Z = Aug 10, 1:00 AM Eastern but still Aug 9, 10:00 PM
// in America/Los_Angeles — a timestamp only a real Pacific-zone render gets
// right; the old raw-UTC-components path would show Aug 10.
const START_TIME = '2026-08-10T05:00:00.000Z'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: TENANT_ID, tenant: { timezone: 'America/Los_Angeles' } },
    error: null,
  }),
}))
vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({})) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('bookings', [
    { id: 'bk-1', tenant_id: TENANT_ID, start_time: START_TIME, notes: 'old', clients: { name: 'Jane Doe' } },
  ])
})

describe('PUT /api/bookings/batch-update — "Series Updated" notification renders in the tenant\'s own timezone', () => {
  it('shows the Pacific calendar date, not the UTC one', async () => {
    const res = await PUT(new Request('http://x', {
      method: 'PUT',
      body: JSON.stringify({ updates: [{ id: 'bk-1', data: { notes: 'new' } }] }),
    }))
    expect(res.status).toBe(200)

    const notifications = fake._store.get('notifications') as Array<{ message: string }> | undefined
    expect(notifications?.length).toBe(1)
    expect(notifications![0].message).toContain('Aug 9')
    expect(notifications![0].message).not.toContain('Aug 10')
  })
})
