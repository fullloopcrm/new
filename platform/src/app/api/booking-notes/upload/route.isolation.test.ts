// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant booking_id FK injection + path-injection via
 * unsanitized filename extension on POST /api/booking-notes/upload.
 *
 * Before this fix, booking_id (from formData) was written into booking_notes
 * and spliced into the storage key (`booking-notes/<bookingId>/...`) with no
 * check that it belongs to the acting tenant — same class as the JSON
 * POST /api/booking-notes fix. The file extension was also taken raw from
 * file.name (independent of the checked MIME type), which could inject '/'
 * or '..' segments into the storage key.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
const uploadMock = vi.hoisted(() => vi.fn(async (_path: string, ..._rest: unknown[]) => ({ error: null })))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
      }),
    },
  },
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: TENANT_A, tenant: { id: TENANT_A }, role: 'owner' })),
  }
})

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'booking-a1', tenant_id: TENANT_A },
      { id: 'booking-b1', tenant_id: TENANT_B },
    ],
    booking_notes: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  vi.clearAllMocks()
  uploadMock.mockClear()
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function postUpload(fields: Record<string, string>, filename = 'photo.jpg') {
  const form = new FormData()
  form.set('file', new File([new Uint8Array([1, 2, 3])], filename, { type: 'image/jpeg' }))
  for (const [k, v] of Object.entries(fields)) form.set(k, v)

  return POST(
    new Request('http://acme-a.example.com/api/booking-notes/upload', {
      method: 'POST',
      body: form,
    }) as unknown as import('next/server').NextRequest,
  )
}

describe('POST /api/booking-notes/upload — booking_id ownership', () => {
  it("WRONG-TENANT PROBE: a foreign tenant's booking_id is rejected, no upload/insert", async () => {
    const res = await postUpload({ booking_id: 'booking-b1' })
    expect(res.status).toBe(404)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(h.seed.booking_notes).toHaveLength(0)
  })

  it('a nonexistent booking_id is rejected, no upload/insert', async () => {
    const res = await postUpload({ booking_id: 'booking-nope' })
    expect(res.status).toBe(404)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('malicious extension is sanitized out of the storage path', async () => {
    await postUpload({ booking_id: 'booking-a1' }, '../../evil')
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const path = uploadMock.mock.calls[0][0] as string
    expect(path.startsWith('booking-notes/booking-a1/')).toBe(true)
    expect(path).not.toContain('..')
    expect(path.split('/')).toHaveLength(3)
  })

  it("positive control: the acting tenant's own booking_id succeeds", async () => {
    const res = await postUpload({ booking_id: 'booking-a1' })
    expect(res.status).toBe(200)
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(h.seed.booking_notes).toHaveLength(1)
  })
})
