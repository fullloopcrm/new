import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Fresh-ground finding (follow-up to item 113's Noticed list): this route's
 * admin notify() call for a new time-off request borrowed `type: 'check_in'`
 * — no dedicated type existed. `notify.ts` has no template case for
 * `check_in` so the email body itself isn't mismatched (unlike 113's
 * booking_reminder collision), but 3 tenant AdminSidebar/DashboardHeader
 * components map `check_in` to a "▶️ Job Started" icon and route clicks to
 * `/admin/bookings` — so every time-off request landed in the admin feed
 * mislabeled as a job-start event with a dead-end link, same shape as the
 * already-fixed `video_uploaded` borrow (item 65). `type: 'time_off_request'`
 * (new dedicated NotificationType) stops the collision; it falls through to
 * each dashboard's neutral default (🔔, no link) instead of the misleading
 * job-started treatment.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => (token === 'valid-token' ? { id: 'tm-a', tid: 'tenant-A', role: 'worker' } : null),
}))

const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (_arg: { type: string; title: string; message: string }) => ({ success: true })),
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function putReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://x', {
    method: 'PUT',
    headers: { authorization: 'Bearer valid-token' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  vi.clearAllMocks()
  fake._seed('team_members', [
    { id: 'tm-a', tenant_id: TID, name: 'A Worker', notes: null },
  ])
})

describe('team-portal/availability — admin notify() type', () => {
  it('uses the dedicated time_off_request type, not the borrowed check_in', async () => {
    const res = await PUT(
      putReq({ availability: { working_days: [1, 2, 3, 4, 5], blocked_dates: ['2026-08-01'] } }),
    )
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'time_off_request' }))
    expect(notifyMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'check_in' }))
  })
})
