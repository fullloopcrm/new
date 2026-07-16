// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * resumeUrl/portfolioFileUrl/videoUrl came from this unauthenticated public
 * form and were stored verbatim in `notes` with zero validation — same bug
 * class already fixed in /api/management-applications and
 * /api/team-portal/video-upload. Mutation-verified below: reverting the
 * prefix check (see apply/route.ts) flips the "rejects" case green->red.
 */

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const UPLOAD_BASE = `https://storage.example.com/uploads/${TENANT_ID}/applications`

let insertedPayload: Record<string, unknown> | null = null

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

describe('POST /api/apply — file URL prefix validation', () => {
  beforeEach(() => {
    insertedPayload = null
  })

  it('rejects a videoUrl that is not inside this tenant applications prefix', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({
      name: 'Jane Doe',
      phone: '5551234567',
      videoUrl: 'https://evil.example.com/payload.mp4',
    }))
    expect(res.status).toBe(400)
    expect(insertedPayload).toBeNull()
  })

  it('rejects a resumeUrl forged into another tenant prefix', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({
      name: 'Jane Doe',
      phone: '5551234567',
      resumeUrl: `${UPLOAD_BASE.replace(TENANT_ID, 'other-tenant-id')}/resumes/x.pdf`,
    }))
    expect(res.status).toBe(400)
    expect(insertedPayload).toBeNull()
  })

  it('accepts URLs that live inside this tenant own signed-upload prefix', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({
      name: 'Jane Doe',
      phone: '5551234567',
      resumeUrl: `${UPLOAD_BASE}/resumes/123-abc.pdf`,
      videoUrl: `${UPLOAD_BASE}/videos/123-abc.mp4`,
    }))
    expect(res.status).toBe(200)
    expect(insertedPayload).not.toBeNull()
  })

  it('allows submission with no file URLs at all', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest({ name: 'Jane Doe', phone: '5551234567' }))
    expect(res.status).toBe(200)
  })
})
