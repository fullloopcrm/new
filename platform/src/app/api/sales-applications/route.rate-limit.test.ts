/**
 * sales-applications/route.ts POST — rate limiting was in-memory only.
 *
 * Fully public, unauthenticated Commission Sales Partner application form
 * (tenant resolved from body/header, not a session) used a plain in-process
 * Map to cap submissions at 3/10min/IP. An in-memory Map does not survive
 * serverless cold starts and is not shared across concurrent instances, so
 * it does not meaningfully throttle abuse in production — same class already
 * fixed on sibling public forms (waitlist, contact, feedback, lead,
 * public-upload) via the DB-backed rateLimitDb().
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify }))

const insertCalls: Array<{ table: string }> = []
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
        insertCalls.push({ table })
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

function applicationReq(): Request {
  const body = {
    tenant_slug: 'acme',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '5551234567',
    location: 'NYC',
    video_url: 'https://storage.example/public/uploads/tenant-1/applications/videos/clip.mp4',
  }
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    json: async () => body,
  } as unknown as Request
}

describe('POST /api/sales-applications — rate limiting', () => {
  it('is rate-limited per-ip and rejects (no DB write) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(applicationReq())
    expect(res.status).toBe(429)
    expect(insertCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('sales-applications:203.0.113.9', 3, 10 * 60 * 1000)
  })

  it('allows the submission through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 2 })
    const res = await POST(applicationReq())
    expect(res.status).toBe(201)
    expect(insertCalls.map((c) => c.table)).toEqual(expect.arrayContaining(['sales_applications']))
  })
})
