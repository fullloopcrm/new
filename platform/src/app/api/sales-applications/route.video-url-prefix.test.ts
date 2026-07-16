/**
 * sales-applications/route.ts POST — video_url storage-prefix enforcement.
 *
 * video_url is expected to come from the legitimate signed-upload flow
 * (/api/apply/signed-url) and is rendered as a raw <a href> in the admin
 * dashboard ("Watch Selfie Video"). Before this fix, nothing checked that the
 * submitted video_url actually pointed at this tenant's own
 * applications/videos storage prefix — an http(s) URL to ANY external
 * resource (a phishing page, another tenant's video, arbitrary content) would
 * pass the scheme check and get stored + surfaced to staff as if it were a
 * genuine selfie video. Same bug class already fixed in
 * team-portal/video-upload. Fixed by requiring video_url to start with the
 * public URL prefix for `${tenantId}/applications/videos/`.
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn(async () => ({ allowed: true, remaining: 2 })))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify }))

const insertCalls: Array<{ table: string; row: Record<string, unknown> }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          single: () => Promise.resolve({ data: { id: 'tenant-1', name: 'Acme' }, error: null }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        insertCalls.push({ table, row })
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'sa-1', ...row }, error: null }),
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

function applicationReq(overrides: Record<string, unknown>): Request {
  const body = {
    tenant_slug: 'acme',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '5551234567',
    location: 'NYC',
    video_url: 'https://storage.example/public/uploads/tenant-1/applications/videos/clip.mp4',
    ...overrides,
  }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => body,
  } as unknown as Request
}

describe('POST /api/sales-applications — video_url storage-prefix enforcement', () => {
  it('rejects an http(s) video_url pointing outside this tenant\'s own storage prefix, no DB write', async () => {
    const res = await POST(applicationReq({ video_url: 'https://evil.example.com/fake-video.mp4' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('rejects a video_url pointing at a DIFFERENT tenant\'s applications/videos prefix, no DB write', async () => {
    const res = await POST(applicationReq({ video_url: 'https://storage.example/public/uploads/other-tenant/applications/videos/clip.mp4' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('accepts a video_url inside this tenant\'s own applications/videos prefix', async () => {
    const res = await POST(applicationReq({}))
    expect(res.status).toBe(201)
    expect(insertCalls).toHaveLength(1)
  })
})
