// @vitest-environment node
//
// node, not jsdom: jsdom's FormData/File and undici's (which Request/
// NextRequest use under the hood) are different implementations that don't
// interoperate — jsdom's File fails undici's internal webidl check.
import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'

/**
 * W4 regression test — MODE 2 of POST /api/booking-notes/upload spliced the
 * caller-supplied `booking_id` straight into the storage object path
 * (`booking-notes/${bookingId}/...`) with no charset or length restriction —
 * same unvalidated-string-in-storage-path class already fixed for `folder`
 * in /api/uploads. This bucket is public (see storage-path-randomness.test.ts),
 * so a malformed or oversized booking_id could produce a broken/huge storage
 * key. Proves the fix: the path segment derived from booking_id is restricted
 * to a safe slug charset and capped in length.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

let capturedPath = ''

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (row: Record<string, unknown>) => ({
        select: () => ({ single: async () => ({ data: { id: 'note-1', ...row }, error: null }) }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async (path: string) => {
          capturedPath = path
          return { error: null }
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/uploads/${path}` } }),
      }),
    },
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A, role: 'owner' }, error: null }),
}))

import { POST } from './route'

function uploadRequest(bookingId: string): Request {
  const fd = new FormData()
  fd.append('booking_id', bookingId)
  fd.append('file', new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))
  return new Request('https://x/api/booking-notes/upload', { method: 'POST', body: fd })
}

describe('POST /api/booking-notes/upload — MODE 2 storage path caps', () => {
  it('strips control/path characters out of booking_id before building the storage path', async () => {
    const res = await POST(uploadRequest('../../evil/"quote"') as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    expect(capturedPath.startsWith('booking-notes/')).toBe(true)
    const segment = capturedPath.split('/')[1]
    expect(segment).not.toMatch(/[./"]/)
  })

  it('caps an oversized booking_id to a bounded path segment', async () => {
    const huge = 'a'.repeat(5000)
    const res = await POST(uploadRequest(huge) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const segment = capturedPath.split('/')[1]
    expect(segment.length).toBeLessThanOrEqual(64)
  })

  it('falls back to "unknown" when booking_id sanitizes to empty', async () => {
    const res = await POST(uploadRequest('././..') as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    expect(capturedPath.split('/')[1]).toBe('unknown')
  })
})
