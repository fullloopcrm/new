import { describe, it, expect, vi } from 'vitest'

/**
 * W4 regression test — MODE 1 of POST /api/booking-notes/upload used to
 * insert the caller-supplied `image_urls` verbatim into booking_notes.images
 * with zero validation. Those URLs render unsanitized as <img src> in both
 * the admin dashboard (BookingsAdmin.tsx) and the client-portal booking
 * dashboard (components/BookingNotes.tsx), so an arbitrary caller could
 * force another user's browser to load attacker-controlled image URLs —
 * same class already fixed for team_applications.photo_url and
 * reviews.images/video_url. Proves the fix: only URLs under this route's own
 * `uploads` bucket `booking-notes/` prefix (what MODE 2 actually produces)
 * are accepted; anything else gets a 400 with no DB write.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const BOOKING_ID = 'booking-1'
const OWN_PREFIX = 'https://proj.supabase.co/storage/v1/object/public/uploads/booking-notes/'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let idSeq = 0

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  return {
    insert: (row: Row) => {
      const created = { id: `note-${++idSeq}`, ...row }
      rowsOf().push(created)
      return { select: () => ({ single: async () => ({ data: created, error: null }) }) }
    },
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => chain(t),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `${OWN_PREFIX}${path.replace(/^booking-notes\//, '')}` } }),
        upload: async () => ({ error: null }),
      }),
    },
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A, role: 'owner' }, error: null }),
}))

import { POST } from './route'

function uploadRequest(fields: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return new Request('https://x/api/booking-notes/upload', { method: 'POST', body: fd }) as unknown as Parameters<typeof POST>[0]
}

describe('POST /api/booking-notes/upload — MODE 1 image_urls validation', () => {
  it('rejects a foreign image_urls entry with 400 and writes no note', async () => {
    DB.booking_notes = []
    const req = uploadRequest({
      booking_id: BOOKING_ID,
      image_urls: JSON.stringify(['https://evil.example.com/tracker.png']),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(DB.booking_notes).toHaveLength(0)
  })

  it('rejects a mixed batch (one legit + one foreign URL) entirely', async () => {
    DB.booking_notes = []
    const req = uploadRequest({
      booking_id: BOOKING_ID,
      image_urls: JSON.stringify([`${OWN_PREFIX}real-upload.jpg`, 'https://evil.example.com/x.png']),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(DB.booking_notes).toHaveLength(0)
  })

  it('accepts URLs that match this route\'s own upload prefix', async () => {
    DB.booking_notes = []
    const req = uploadRequest({
      booking_id: BOOKING_ID,
      image_urls: JSON.stringify([`${OWN_PREFIX}real-upload.jpg`]),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(DB.booking_notes).toHaveLength(1)
    expect(DB.booking_notes[0].images).toEqual([`${OWN_PREFIX}real-upload.jpg`])
  })
})
