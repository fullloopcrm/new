// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * apply/signed-url declares a maxSize per file type, but createSignedUploadUrl
 * has no size parameter — the client PUTs straight to Supabase, so nothing
 * ever enforced it. This verifies /api/apply now checks the object that
 * actually landed in storage before trusting its URL. Mutation-verified:
 * reverting the verifyUploadedObjectSize call in apply/route.ts flips the
 * "rejects an oversized" case green->red.
 */

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const UPLOAD_BASE = `https://storage.example.com/uploads/${TENANT_ID}/applications`

let insertedPayload: Record<string, unknown> | null = null
let landedSize = 1024

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        insertedPayload = payload
        return {
          select: () => ({
            single: async () => ({ data: { id: 'app-1' }, error: null }),
          }),
        }
      },
    }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/uploads/${path}` } }),
        list: async () => ({ data: [{ metadata: { size: landedSize } }], error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  },
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true }),
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

vi.mock('@/lib/notify', () => ({
  notify: async () => {},
}))

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('https://tenant.example.com/api/apply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/apply — uploaded object size cap', () => {
  beforeEach(() => {
    insertedPayload = null
    landedSize = 1024
  })

  it('rejects when the object that landed in storage exceeds resumeUrl\'s 10MB cap', async () => {
    landedSize = 11 * 1024 * 1024
    const { POST } = await import('./route')
    const res = await POST(makeRequest({
      name: 'Jane Doe',
      phone: '5551234567',
      resumeUrl: `${UPLOAD_BASE}/resumes/123-abc.pdf`,
    }))
    expect(res.status).toBe(400)
    expect(insertedPayload).toBeNull()
  })

  it('rejects when the object that landed in storage exceeds videoUrl\'s 100MB cap', async () => {
    landedSize = 101 * 1024 * 1024
    const { POST } = await import('./route')
    const res = await POST(makeRequest({
      name: 'Jane Doe',
      phone: '5551234567',
      videoUrl: `${UPLOAD_BASE}/videos/123-abc.mp4`,
    }))
    expect(res.status).toBe(400)
    expect(insertedPayload).toBeNull()
  })

  it('accepts when the object that landed is within cap', async () => {
    landedSize = 2 * 1024 * 1024
    const { POST } = await import('./route')
    const res = await POST(makeRequest({
      name: 'Jane Doe',
      phone: '5551234567',
      resumeUrl: `${UPLOAD_BASE}/resumes/123-abc.pdf`,
    }))
    expect(res.status).toBe(200)
    expect(insertedPayload).not.toBeNull()
  })
})
