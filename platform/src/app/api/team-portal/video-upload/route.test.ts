// @vitest-environment node
//
// node, not jsdom: jsdom's FormData/File and undici's (which NextRequest/
// next/server use internally) are different classes, so a jsdom File fails
// undici's internal `webidl.is.File()` check when parsed as multipart body.
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Zero prior coverage on this route. Two upload paths (signed-URL and legacy
 * FormData) both write a booking's walkthrough/final video URL, but only the
 * legacy path checked booking.team_member_id === auth.id — the signed-URL
 * flow (GET + JSON POST) let ANY active team member in the tenant attach a
 * video to ANY other member's job. Fixed alongside this test; the ownership
 * assertions below are mutation-verified (reverting the fix flips them RED).
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'
const MEMBER_A = '11111111-0000-0000-0000-000000000001'
const MEMBER_B = '22222222-0000-0000-0000-000000000002'
const BOOKING_A = 'bbbbbbbb-0000-0000-0000-00000000000a'

const updates: Array<{ table: string; payload: Record<string, unknown>; idEq?: string; tenantEq?: string }> = []

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_A,
    team_member_id: MEMBER_A,
    start_time: '2026-01-01T10:00:00Z',
    service_type: 'Deep Clean',
    clients: { name: 'Alice Client' },
    team_members: { name: 'Bob Cleaner' },
    ...overrides,
  }
}

let bookingLookupResult: unknown = booking()
let uploadError: unknown = null
let signedUrlError: unknown = null

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let entry: { table: string; payload: Record<string, unknown>; idEq?: string; tenantEq?: string } | undefined
    const c: Record<string, unknown> = {
      select: () => c,
      update: (payload: Record<string, unknown>) => {
        entry = { table, payload }
        updates.push(entry)
        return c
      },
      eq: (col: string, val: string) => {
        if (entry) {
          if (col === 'id') entry.idEq = val
          if (col === 'tenant_id') entry.tenantEq = val
        }
        return c
      },
      single: async () => {
        if (table === 'bookings') return { data: bookingLookupResult, error: null }
        return { data: null, error: null }
      },
    }
    return c
  }
  return {
    supabaseAdmin: {
      from: (t: string) => chain(t),
      storage: {
        from: () => ({
          createSignedUploadUrl: async () =>
            signedUrlError
              ? { data: null, error: signedUrlError }
              : { data: { signedUrl: 'https://signed.example/upload', token: 'tok-1' }, error: null },
          upload: async () => (uploadError ? { error: uploadError } : { error: null }),
          // Real Supabase echoes the path back in the public URL — the mock
          // does too, so the route's prefix-validation (JSON POST flow) can
          // be exercised with a realistic path-derived URL vs. a foreign one.
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/storage/v1/object/public/uploads/${path}` } }),
        }),
      },
    },
  }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({})) }))

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => {
    if (token === `token-${MEMBER_A}`) return { id: MEMBER_A, tid: TENANT, role: 'worker' }
    return null
  },
}))

import { NextRequest } from 'next/server'
import { GET, POST } from './route'

beforeEach(() => {
  updates.length = 0
  bookingLookupResult = booking()
  uploadError = null
  signedUrlError = null
})

function authedUrl(path: string, member = MEMBER_A) {
  return new NextRequest(`https://x${path}`, {
    headers: { authorization: `Bearer token-${member}` },
  })
}

describe('team-portal/video-upload GET (signed URL)', () => {
  it('REJECTS (401) with no bearer token', async () => {
    const res = await GET(new NextRequest('https://x/api/team-portal/video-upload?booking_id=b&type=final'))
    expect(res.status).toBe(401)
  })

  it('REJECTS (401) with an invalid token', async () => {
    const req = new NextRequest('https://x/api/team-portal/video-upload?booking_id=b&type=final', {
      headers: { authorization: 'Bearer garbage' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('REJECTS (400) missing booking_id or type', async () => {
    const res = await GET(authedUrl('/api/team-portal/video-upload?type=final'))
    expect(res.status).toBe(400)
  })

  it('REJECTS (400) a disallowed content_type', async () => {
    const res = await GET(
      authedUrl(`/api/team-portal/video-upload?booking_id=${BOOKING_A}&type=final&content_type=text/html`),
    )
    expect(res.status).toBe(400)
  })

  it('REJECTS (404) when the booking is assigned to a DIFFERENT team member', async () => {
    bookingLookupResult = booking({ team_member_id: MEMBER_B })
    const res = await GET(authedUrl(`/api/team-portal/video-upload?booking_id=${BOOKING_A}&type=final`))
    expect(res.status).toBe(404)
  })

  it('REJECTS (404) when the booking does not exist / wrong tenant', async () => {
    bookingLookupResult = null
    const res = await GET(authedUrl(`/api/team-portal/video-upload?booking_id=${BOOKING_A}&type=final`))
    expect(res.status).toBe(404)
  })

  it('ALLOWS the assigned team member and returns a signed URL', async () => {
    const res = await GET(authedUrl(`/api/team-portal/video-upload?booking_id=${BOOKING_A}&type=final`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.signedUrl).toBe('https://signed.example/upload')
    expect(body.path).toContain(TENANT)
  })
})

describe('team-portal/video-upload POST — signed-URL save (JSON)', () => {
  function jsonReq(payload: Record<string, unknown>, member = MEMBER_A) {
    return new NextRequest('https://x/api/team-portal/video-upload', {
      method: 'POST',
      headers: { authorization: `Bearer token-${member}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  it('REJECTS (401) with no bearer token', async () => {
    const req = new NextRequest('https://x/api/team-portal/video-upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_A, type: 'final', url: 'https://x/video.mp4' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('REJECTS (400) missing fields', async () => {
    const res = await POST(jsonReq({ booking_id: BOOKING_A, type: 'final' }))
    expect(res.status).toBe(400)
  })

  it('REJECTS (404) a foreign-member booking and writes nothing', async () => {
    bookingLookupResult = booking({ team_member_id: MEMBER_B })
    const res = await POST(jsonReq({ booking_id: BOOKING_A, type: 'final', url: 'https://x/video.mp4' }))
    expect(res.status).toBe(404)
    expect(updates).toHaveLength(0)
  })

  it('ALLOWS the assigned member and stamps the correct video field + tenant filter', async () => {
    const validUrl = `https://cdn.example/storage/v1/object/public/uploads/${TENANT}/job-videos/${BOOKING_A}/walkthrough-1700000000-abc123.mp4`
    const res = await POST(jsonReq({ booking_id: BOOKING_A, type: 'walkthrough', url: validUrl }))
    expect(res.status).toBe(200)
    expect(updates).toHaveLength(1)
    expect(updates[0].payload.walkthrough_video_url).toBe(validUrl)
    expect(updates[0].tenantEq).toBe(TENANT)
  })

  it('REJECTS (400) a url outside this tenant/booking/type\'s own storage prefix and writes nothing', async () => {
    const res = await POST(jsonReq({ booking_id: BOOKING_A, type: 'walkthrough', url: 'https://evil.example/payload.mp4' }))
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('REJECTS (400) a url pointing at a DIFFERENT booking\'s storage path', async () => {
    const otherBookingUrl = `https://cdn.example/storage/v1/object/public/uploads/${TENANT}/job-videos/some-other-booking/walkthrough-1700000000-abc123.mp4`
    const res = await POST(jsonReq({ booking_id: BOOKING_A, type: 'walkthrough', url: otherBookingUrl }))
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })
})

describe('team-portal/video-upload POST — legacy FormData', () => {
  function formReq(fields: Record<string, string | File>, member = MEMBER_A) {
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields)) fd.set(k, v)
    return new NextRequest('https://x/api/team-portal/video-upload', {
      method: 'POST',
      headers: { authorization: `Bearer token-${member}` },
      body: fd,
    })
  }

  const smallFile = () => new File([new Uint8Array(10)], 'clip.mp4', { type: 'video/mp4' })

  it('REJECTS (404) a foreign-member booking (pre-existing ownership check)', async () => {
    bookingLookupResult = booking({ team_member_id: MEMBER_B })
    const res = await POST(formReq({ file: smallFile(), booking_id: BOOKING_A, type: 'final' }))
    expect(res.status).toBe(404)
  })

  it('REJECTS (400) a disallowed MIME type', async () => {
    const badFile = new File([new Uint8Array(10)], 'clip.exe', { type: 'application/octet-stream' })
    const res = await POST(formReq({ file: badFile, booking_id: BOOKING_A, type: 'final' }))
    expect(res.status).toBe(400)
  })

  it('ALLOWS the assigned member and returns the public URL', async () => {
    const res = await POST(formReq({ file: smallFile(), booking_id: BOOKING_A, type: 'final' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain(`/uploads/${TENANT}/job-videos/${BOOKING_A}/final-`)
    expect(updates[0].payload.final_video_url).toBe(body.url)
  })
})
