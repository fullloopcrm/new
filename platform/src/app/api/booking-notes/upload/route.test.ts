// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * WITNESS — cross-tenant booking_id FK injection via POST
 * /api/booking-notes/upload.
 *
 * Before this fix, booking_id (from formData) was written into booking_notes
 * and spliced into the storage key (`booking-notes/<bookingId>/...`) with no
 * check that it belongs to the acting tenant — same class as the JSON
 * POST /api/booking-notes fix. Extension sanitization was already present on
 * this branch; this test just guards it stays that way alongside the new
 * ownership check.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle
const uploadMock = vi.hoisted(() => vi.fn(async (_path: string, ..._rest: unknown[]) => ({ error: null })))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return {
    supabaseAdmin: {
      ...fake,
      storage: {
        from: () => ({
          upload: uploadMock,
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
        }),
      },
    },
  }
})

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ tenantId: 'tenant-A', role: 'owner' })),
  }
})

import { POST } from './route'

beforeEach(() => {
  h.seq = 0
  uploadMock.mockClear()
  h.store = {
    bookings: [
      { id: 'booking-A1', tenant_id: 'tenant-A' },
      { id: 'booking-B1', tenant_id: 'tenant-B' },
    ],
    booking_notes: [],
  }
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
  it("rejects a foreign tenant's booking_id, no upload/insert", async () => {
    const res = await postUpload({ booking_id: 'booking-B1' })
    expect(res.status).toBe(404)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(h.store.booking_notes).toHaveLength(0)
  })

  it('rejects a nonexistent booking_id, no upload/insert', async () => {
    const res = await postUpload({ booking_id: 'booking-nope' })
    expect(res.status).toBe(404)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('malicious extension is sanitized out of the storage path', async () => {
    await postUpload({ booking_id: 'booking-A1' }, '../../evil')
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const path = uploadMock.mock.calls[0][0] as string
    expect(path.startsWith('booking-notes/booking-A1/')).toBe(true)
    expect(path).not.toContain('..')
    expect(path.split('/')).toHaveLength(3)
  })

  it("accepts the acting tenant's own booking_id", async () => {
    const res = await postUpload({ booking_id: 'booking-A1' })
    expect(res.status).toBe(200)
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(h.store.booking_notes).toHaveLength(1)
  })
})
