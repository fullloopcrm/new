import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * WITNESS — cross-assignment signed-upload-URL grant on GET /api/team-portal/video-upload.
 *
 * The signed-URL generator (GET) only checked `.eq('tenant_id', auth.tid)` on
 * the booking lookup despite its own comment claiming the booking must "belong
 * to this tenant + team member" — unlike the sibling POST handler in the same
 * file (route.ownership.test.ts), which correctly also checks
 * `team_member_id === auth.id`. Any authenticated team-portal member (any
 * role) could obtain a real signed storage-upload URL for a booking assigned
 * to a DIFFERENT team member in the same tenant, just by knowing its
 * booking_id — and write arbitrary video content into that job's storage
 * path. Fixed by applying the same team_member_id ownership filter to the GET
 * query.
 */

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const storage = {
    from: () => ({
      createSignedUploadUrl: async () => ({ data: { signedUrl: 'https://storage.example/signed', token: 'tok' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://storage.example/public' } }),
    }),
  }
  return { supabaseAdmin: Object.assign(fake, { storage }), __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { GET } from './route'

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
    },
  ])
}

function getReq(bookingId: string, token: string) {
  const url = `http://x/api/team-portal/video-upload?booking_id=${bookingId}&type=final&filename=video.mp4&content_type=video/mp4`
  return new NextRequest(url, {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` },
  })
}

beforeEach(() => {
  seed()
})

describe('GET /api/team-portal/video-upload (signed URL) — booking ownership', () => {
  it("CROSS-ASSIGNMENT PROBE: a team member cannot get a signed upload URL for another member's booking", async () => {
    const token = createToken(MEMBER_A1, TENANT_A)
    const res = await GET(getReq(BOOKING_ASSIGNED_TO_A2, token))
    expect(res.status).toBe(404)
  })

  it('positive control: the assigned team member CAN get a signed upload URL for their own booking', async () => {
    const token = createToken(MEMBER_A2, TENANT_A)
    const res = await GET(getReq(BOOKING_ASSIGNED_TO_A2, token))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signedUrl).toBe('https://storage.example/signed')
  })
})
