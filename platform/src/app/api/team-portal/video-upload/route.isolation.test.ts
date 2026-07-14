import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/team-portal/video-upload (GET signed-url, POST json-reference-save) only
 * scoped bookings by tenant_id, unlike the legacy FormData POST branch (and every
 * sibling portal route — checkin, checkout, reassign) which also requires
 * booking.team_member_id === auth.id. Any team member with a valid tenant token
 * could mint a real signed upload URL for, or overwrite the video reference on,
 * a booking assigned to a DIFFERENT team member in the same tenant.
 */

const TENANT = 'tid-a'
const MEMBER = 'tm-mine'
const OTHER_MEMBER = 'tm-other'

const bookings = [
  { id: 'bk-mine', tenant_id: TENANT, team_member_id: MEMBER, start_time: '2020-01-01T10:00:00Z', service_type: 'clean', walkthrough_video_url: null, final_video_url: null },
  { id: 'bk-other', tenant_id: TENANT, team_member_id: OTHER_MEMBER, start_time: '2020-01-01T10:00:00Z', service_type: 'clean', walkthrough_video_url: null, final_video_url: null },
]

function bookingsTable() {
  return {
    select: () => {
      const filters: Record<string, unknown> = {}
      const builder = {
        eq: (col: string, val: unknown) => { filters[col] = val; return builder },
        single: async () => {
          const match = bookings.find((b) => Object.entries(filters).every(([k, v]) => (b as Record<string, unknown>)[k] === v))
          return { data: match ? { ...match } : null, error: match ? null : { message: 'not found' } }
        },
      }
      return builder
    },
    update: (patch: Record<string, unknown>) => {
      const filters: Record<string, unknown> = {}
      const builder: Record<string, unknown> = {
        eq: (col: string, val: unknown) => { filters[col] = val; return builder },
        then: (resolve: (v: unknown) => void) => {
          const match = bookings.find((b) => Object.entries(filters).every(([k, v]) => (b as Record<string, unknown>)[k] === v))
          if (match) Object.assign(match, patch)
          resolve({ error: null })
        },
      }
      return builder
    },
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') return bookingsTable()
      throw new Error(`unexpected table: ${table}`)
    },
    storage: {
      from: () => ({
        createSignedUploadUrl: async () => ({ data: { signedUrl: 'https://signed.example/upload', token: 'sig-tok' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://public.example/video.mp4' } }),
      }),
    },
  },
}))

vi.mock('@/lib/notify', () => ({ notify: async () => {} }))

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => (token === 'good' ? { id: MEMBER, tid: TENANT } : null),
}))

import { NextRequest } from 'next/server'
import { GET, POST } from './route'

function getReq(token: string | null, bookingId: string) {
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {}
  const url = `http://t/api/team-portal/video-upload?booking_id=${bookingId}&type=final&content_type=video/mp4`
  return GET(new NextRequest(url, { headers }))
}

function postJsonReq(token: string | null, bookingId: string, url: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }
  return POST(new NextRequest('http://t/api/team-portal/video-upload', { method: 'POST', headers, body: JSON.stringify({ booking_id: bookingId, type: 'final', url }) }))
}

beforeEach(() => {
  bookings[0].walkthrough_video_url = null
  bookings[0].final_video_url = null
  bookings[1].walkthrough_video_url = null
  bookings[1].final_video_url = null
})

describe('team-portal/video-upload — cross-member isolation', () => {
  it('positive control: GET issues a signed URL for the member\'s OWN booking', async () => {
    const res = await getReq('good', 'bk-mine')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signedUrl).toBe('https://signed.example/upload')
  })

  it('wrong-member probe: GET 404s for a booking assigned to a DIFFERENT team member (same tenant) — no signed URL leaked', async () => {
    const res = await getReq('good', 'bk-other')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.signedUrl).toBeUndefined()
  })

  it('positive control: POST (json) saves the video reference on the member\'s OWN booking', async () => {
    const res = await postJsonReq('good', 'bk-mine', 'https://public.example/mine.mp4')
    expect(res.status).toBe(200)
    expect(bookings[0].final_video_url).toBe('https://public.example/mine.mp4')
  })

  it('wrong-member probe: POST (json) 404s and does NOT write when booking belongs to a different team member', async () => {
    const res = await postJsonReq('good', 'bk-other', 'https://attacker.example/planted.mp4')
    expect(res.status).toBe(404)
    expect(bookings[1].final_video_url).toBeNull()
  })

  it('missing/invalid token -> 401 on both GET and POST', async () => {
    expect((await getReq(null, 'bk-mine')).status).toBe(401)
    expect((await getReq('bad', 'bk-mine')).status).toBe(401)
    expect((await postJsonReq(null, 'bk-mine', 'https://x')).status).toBe(401)
  })
})
