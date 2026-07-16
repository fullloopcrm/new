/**
 * WITNESS — missing storage-prefix enforcement on management-applications POST.
 *
 * POST /api/management-applications (public, unauthenticated — tenant
 * resolved from the host header) required resume_url/photo_url/video_url to
 * be present but never checked that they actually pointed at this tenant's
 * own signed-upload prefix (/api/management-applications/signed-url). An
 * applicant could submit any string — another tenant's file, an external
 * phishing/malware URL — and have it stored and surfaced to staff reviewing
 * the application as if it were their own resume/photo/selfie video. Same
 * bug class already fixed in team-portal/video-upload and
 * sales-applications: require each URL to start with the public URL prefix
 * for `${tenantId}/management-applications/{resumes,photos,videos}/`.
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn(async () => ({ allowed: true })))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify }))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))

const insertCalls: Array<{ row: Record<string, unknown> }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        insertCalls.push({ row })
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'app-1', ...row }, error: null }),
          }),
        }
      },
      delete: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example/public/uploads/${path}` } }),
      }),
    },
  },
}))

import { POST } from './route'

function applicationReq(overrides: Record<string, unknown>): Request {
  const body = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '5551234567',
    location: 'NYC',
    resume_url: 'https://storage.example/public/uploads/tenant-1/management-applications/resumes/r.pdf',
    photo_url: 'https://storage.example/public/uploads/tenant-1/management-applications/photos/p.jpg',
    video_url: 'https://storage.example/public/uploads/tenant-1/management-applications/videos/v.mp4',
    ...overrides,
  }
  return new Request('http://acme.example.com/api/management-applications', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/management-applications — upload storage-prefix enforcement', () => {
  it('rejects a resume_url pointing at an external domain, no DB write', async () => {
    const res = await POST(applicationReq({ resume_url: 'https://evil.example.com/resume.pdf' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it("rejects a video_url pointing at a DIFFERENT tenant's prefix, no DB write", async () => {
    const res = await POST(applicationReq({ video_url: 'https://storage.example/public/uploads/other-tenant/management-applications/videos/v.mp4' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('rejects a photo_url pointing at the wrong folder within this tenant\'s own prefix', async () => {
    const res = await POST(applicationReq({ photo_url: 'https://storage.example/public/uploads/tenant-1/management-applications/videos/p.jpg' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('accepts genuine URLs inside this tenant\'s own signed-upload prefixes', async () => {
    const res = await POST(applicationReq({}))
    expect(res.status).toBe(200)
    expect(insertCalls).toHaveLength(1)
  })
})
