import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team-portal/video-upload/route.ts (docs/adr/0004).
 * booking_id is caller-supplied (query param / request body), so a worker
 * holding a valid tenant-A token could previously guess a tenant-B booking id.
 * The LEAK CONTROL case proves the store itself has no implicit tenant scoping.
 *
 * Also covers cross-member isolation: GET/POST (json-reference-save) only scoped
 * bookings by tenant_id, unlike the legacy FormData POST branch (and every sibling
 * portal route — checkin, checkout, reassign) which also requires
 * booking.team_member_id === auth.id. Any team member with a valid tenant token
 * could otherwise mint a signed upload URL for, or overwrite the video reference
 * on, a booking assigned to a DIFFERENT team member in the same tenant.
 */

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return {
    supabaseAdmin: {
      ...fake,
      storage: {
        from: () => ({
          createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `https://x/${path}`, token: 'sig-token' }, error: null }),
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://public/${path}` } }),
        }),
      },
    },
  }
})
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { GET, POST } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const A_BOOKING = 'bk-a'
const B_BOOKING = 'bk-b'
const OTHER_MEMBER_BOOKING = 'bk-a-other-member'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('bookings', [
    { id: A_BOOKING, tenant_id: A_ID, team_member_id: 'tm-a', start_time: '2026-08-01T10:00:00.000Z', service_type: 'Deep Clean', clients: { name: 'A Client' }, team_members: { name: 'A Worker' }, walkthrough_video_url: null, final_video_url: null },
    { id: B_BOOKING, tenant_id: B_ID, team_member_id: 'tm-b', start_time: '2026-08-02T10:00:00.000Z', service_type: 'B Service', clients: { name: 'B Client' }, team_members: { name: 'B Worker' }, walkthrough_video_url: null, final_video_url: null },
    { id: OTHER_MEMBER_BOOKING, tenant_id: A_ID, team_member_id: 'tm-a-other', start_time: '2026-08-03T10:00:00.000Z', service_type: 'Deep Clean', clients: { name: 'A Client 2' }, team_members: { name: 'A Other Worker' }, walkthrough_video_url: null, final_video_url: null },
  ])
})

function getReq(token: string, bookingId: string): NextRequest {
  const url = `http://x/api?booking_id=${bookingId}&type=final&filename=a.mp4&content_type=video%2Fmp4`
  return new NextRequest(url, { headers: { authorization: `Bearer ${token}` } })
}
function postReq(token: string, bookingId: string): Request {
  return new Request('http://x', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId, type: 'final', url: 'https://public/uploaded.mp4' }),
  })
}

describe('team-portal/video-upload GET/POST — tenantDb isolation', () => {
  it("worker A's own token gets a signed URL for their OWN booking (positive control)", async () => {
    const token = createToken('tm-a', A_ID)
    const res = await GET(getReq(token, A_BOOKING) as any)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.signedUrl).toContain(A_BOOKING)
  })

  it("worker A CANNOT get a signed upload URL for tenant B's booking by guessing its id — 404", async () => {
    const token = createToken('tm-a', A_ID)
    const res = await GET(getReq(token, B_BOOKING) as any)
    expect(res.status).toBe(404)
  })

  it("POST from tenant A's token saving a video reference never mutates tenant B's same-named booking", async () => {
    const token = createToken('tm-a', A_ID)
    const res = await POST(postReq(token, B_BOOKING) as any)
    expect(res.status).toBe(404)
    const bRow = fake._all('bookings').find((r) => r.id === B_BOOKING)!
    expect(bRow.final_video_url).toBeNull()
  })

  it("LEAK CONTROL: selecting bookings by id ALONE (no tenant_id filter) WOULD return tenant B's booking for B's id — proves the route's tenantDb scoping is load-bearing", async () => {
    const { data } = await supabaseAdmin
      .from('bookings')
      .select('id, team_member_id, start_time, service_type, clients(name), team_members!bookings_team_member_id_fkey(name)')
      .eq('id', B_BOOKING)
      .maybeSingle()
    expect((data as { team_member_id: string }).team_member_id).toBe('tm-b')
  })

  it('wrong-member probe: GET 404s for a booking assigned to a DIFFERENT team member (same tenant) — no signed URL leaked', async () => {
    const token = createToken('tm-a', A_ID)
    const res = await GET(getReq(token, OTHER_MEMBER_BOOKING) as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.signedUrl).toBeUndefined()
  })

  it('wrong-member probe: POST (json) 404s and does NOT write when booking belongs to a different team member', async () => {
    const token = createToken('tm-a', A_ID)
    const res = await POST(postReq(token, OTHER_MEMBER_BOOKING) as any)
    expect(res.status).toBe(404)
    const row = fake._all('bookings').find((r) => r.id === OTHER_MEMBER_BOOKING)!
    expect(row.final_video_url).toBeNull()
  })

  it('missing/invalid token -> 401 on both GET and POST', async () => {
    expect((await GET(getReq('', A_BOOKING) as any)).status).toBe(401)
    expect((await GET(getReq('bad-token', A_BOOKING) as any)).status).toBe(401)
    expect((await POST(postReq('bad-token', A_BOOKING) as any)).status).toBe(401)
  })
})
