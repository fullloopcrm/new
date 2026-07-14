import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * WITNESS — cross-assignment video overwrite on POST /api/team-portal/video-upload.
 *
 * The signed-URL confirmation branch (JSON body) only checked
 * `.eq('tenant_id', auth.tid)` on the booking lookup — unlike the sibling
 * legacy FormData branch in the same file, which also checks
 * `booking.team_member_id === auth.id`. Any authenticated team-portal member
 * (any role) could set walkthrough_video_url/final_video_url on a booking
 * assigned to a DIFFERENT team member in the same tenant, just by knowing its
 * booking_id — no upload or assignment required. Fixed by applying the same
 * team_member_id ownership check to the JSON branch.
 */

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const MEMBER_A1 = 'member-a1'
const MEMBER_A2 = 'member-a2'
const BOOKING_ASSIGNED_TO_A2 = 'booking-a2-job'

function seed() {
  fake._store.clear()
  fake._seed('team_members', [
    { id: MEMBER_A1, tenant_id: TENANT_A, name: 'Alice' },
    { id: MEMBER_A2, tenant_id: TENANT_A, name: 'Bob' },
  ])
  fake._seed('bookings', [
    {
      id: BOOKING_ASSIGNED_TO_A2,
      tenant_id: TENANT_A,
      team_member_id: MEMBER_A2,
      start_time: new Date().toISOString(),
      service_type: 'Deep Clean',
      walkthrough_video_url: null,
      final_video_url: null,
    },
  ])
}

function postReq(payload: unknown, token: string) {
  return new Request('http://x/api/team-portal/video-upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }) as unknown as Parameters<typeof POST>[0]
}

beforeEach(() => {
  seed()
})

describe('POST /api/team-portal/video-upload (JSON/signed-URL branch) — booking ownership', () => {
  it("CROSS-ASSIGNMENT PROBE: a team member cannot attach a video to another member's booking", async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await POST(
      postReq({ booking_id: BOOKING_ASSIGNED_TO_A2, type: 'final', url: 'https://evil.example/hijacked.mp4' }, token)
    )
    expect(res.status).toBe(404)
    const bookings = fake._store.get('bookings') || []
    const row = bookings.find((b) => b.id === BOOKING_ASSIGNED_TO_A2)
    expect(row?.final_video_url).toBeNull()
  })

  it('positive control: the assigned team member CAN attach a video to their own booking', async () => {
    const token = createToken(MEMBER_A2, TENANT_A)
    const res = await POST(
      postReq({ booking_id: BOOKING_ASSIGNED_TO_A2, type: 'final', url: 'https://storage.example/real-video.mp4' }, token)
    )
    expect(res.status).toBe(200)
    const bookings = fake._store.get('bookings') || []
    const row = bookings.find((b) => b.id === BOOKING_ASSIGNED_TO_A2)
    expect(row?.final_video_url).toBe('https://storage.example/real-video.mp4')
  })
})
