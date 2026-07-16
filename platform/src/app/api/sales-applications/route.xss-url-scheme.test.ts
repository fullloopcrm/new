/**
 * sales-applications/route.ts POST — video_url/linkedin_url scheme validation.
 *
 * video_url/linkedin_url are stored verbatim from this fully public,
 * unauthenticated Commission Sales Partner application form and later
 * rendered as <a href={...}> in the staff dashboard (SalesAppsTab.tsx) with
 * no scheme sanitization on the render side. React does not block
 * `javascript:` hrefs, so an unauthenticated applicant could submit
 * video_url: 'javascript:...' and get it executed in a staff member's
 * dashboard session the moment they click "Watch Selfie Video" to review the
 * application — a stored XSS with no auth required to plant it.
 *
 * FIX: POST now rejects video_url/linkedin_url unless they're http(s).
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
        info: () => Promise.resolve({ data: { size: 1024, contentType: 'video/mp4' }, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
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

describe('POST /api/sales-applications — video_url/linkedin_url scheme validation', () => {
  it('rejects a javascript: video_url (stored-XSS payload), no DB write', async () => {
    const res = await POST(applicationReq({ video_url: 'javascript:alert(document.cookie)' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('rejects a data: video_url, no DB write', async () => {
    const res = await POST(applicationReq({ video_url: 'data:text/html,<script>alert(1)</script>' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('rejects a javascript: linkedin_url even when video_url is valid', async () => {
    const res = await POST(applicationReq({ linkedin_url: 'javascript:alert(document.cookie)' }))
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('accepts a genuine https video_url + linkedin_url', async () => {
    const res = await POST(applicationReq({ linkedin_url: 'https://linkedin.com/in/jane' }))
    expect(res.status).toBe(201)
    expect(insertCalls).toHaveLength(1)
    expect(insertCalls[0].row.video_url).toBe('https://storage.example/public/uploads/tenant-1/applications/videos/clip.mp4')
  })
})
