/**
 * WITNESS — missing storage-prefix enforcement on apply-ceo POST.
 *
 * POST /api/apply-ceo (public, unauthenticated — tenant resolved from the
 * host header) stored resumeUrl/videoUrl from the request body verbatim with
 * zero validation — not even a scheme check. An applicant could submit any
 * string — another tenant's file, an external phishing/malware URL — and
 * have it stored on the shared management_applications table and surfaced to
 * staff reviewing the application as if it were their own resume/selfie
 * video. Same bug class already fixed in team-portal/video-upload,
 * sales-applications, and management-applications: require each URL (when
 * present) to start with the public URL prefix for
 * `${tenantId}/management-applications/{resumes,videos}/`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn(async () => ({ allowed: true })))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify }))

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1', name: 'Acme', selena_config: {} })),
}))

const insertCalls: Array<{ row: Record<string, unknown> }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        insertCalls.push({ row })
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'app-1', ...row }, error: null }),
          }),
        }
      },
    }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example/public/uploads/${path}` } }),
      }),
    },
  },
}))

import { POST } from './route'

function ceoReq(overrides: Record<string, unknown>): Request {
  const body = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '5551234567',
    resumeUrl: 'https://storage.example/public/uploads/tenant-1/management-applications/resumes/r.pdf',
    videoUrl: 'https://storage.example/public/uploads/tenant-1/management-applications/videos/v.mp4',
    ...overrides,
  }
  return new Request('http://acme.example.com/api/apply-ceo', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/apply-ceo — upload storage-prefix enforcement', () => {
  beforeEach(() => {
    insertCalls.length = 0
  })

  it('rejects a resumeUrl pointing at an external domain, no DB write', async () => {
    const res = await POST(ceoReq({ resumeUrl: 'https://evil.example.com/resume.pdf' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it("rejects a videoUrl pointing at a DIFFERENT tenant's prefix, no DB write", async () => {
    const res = await POST(ceoReq({ videoUrl: 'https://storage.example/public/uploads/other-tenant/management-applications/videos/v.mp4' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('accepts a submission with no resumeUrl/videoUrl at all (both optional)', async () => {
    const res = await POST(ceoReq({ resumeUrl: undefined, videoUrl: undefined }))
    expect(res.status).toBe(200)
    expect(insertCalls).toHaveLength(1)
  })

  it("accepts genuine URLs inside this tenant's own signed-upload prefixes", async () => {
    const res = await POST(ceoReq({}))
    expect(res.status).toBe(200)
    expect(insertCalls).toHaveLength(1)
  })
})
