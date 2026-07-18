import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/management-applications is public/unauthenticated. `name` and
 * every other free-text field (location, current_role, why_this_role, notes,
 * etc.) had zero length cap, unlike the already-fixed sibling public intake
 * routes (/api/contact, /api/lead, /api/waitlist, /api/ingest/lead,
 * /api/ingest/application) which cap name at 200 / long text at 2000 so a
 * single submission can't balloon a row (or the admin notification built
 * from it) to megabytes of attacker-chosen content. Verifies the fix.
 */

const TENANT = { id: 'tenant-1', name: 'Canary' }
const UPLOAD_PREFIX = `https://storage.example.com/${TENANT.id}/management-applications/`

let insertedRow: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: function () { return this },
      eq: function () { return this },
      limit: function () { return this },
      then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: [], error: null }),
      insert: (row: Record<string, unknown>) => {
        insertedRow = row
        return { select: () => ({ single: async () => ({ data: { id: 'new-app', ...row }, error: null }) }) }
      },
      delete: function () { return this },
    }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
      }),
    },
  },
}))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://canary.example.com/api/management-applications', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { insertedRow = null })

describe('POST /api/management-applications — free-text length cap', () => {
  it('caps an oversized name at 200 chars before the insert', async () => {
    const res = await POST(req({
      name: 'A'.repeat(5000),
      email: 'a@example.com',
      phone: '5551234567',
      location: 'Nowhere',
      resume_url: `${UPLOAD_PREFIX}resume.pdf`,
      photo_url: `${UPLOAD_PREFIX}photo.jpg`,
      video_url: `${UPLOAD_PREFIX}video.mp4`,
    }))
    expect(res.status).toBe(200)
    expect((insertedRow!.name as string).length).toBeLessThanOrEqual(200)
  })

  it('caps an oversized why_this_role at 2000 chars before the insert', async () => {
    const res = await POST(req({
      name: 'Real Name',
      email: 'b@example.com',
      phone: '5559876543',
      location: 'Nowhere',
      why_this_role: 'X'.repeat(50000),
      resume_url: `${UPLOAD_PREFIX}resume.pdf`,
      photo_url: `${UPLOAD_PREFIX}photo.jpg`,
      video_url: `${UPLOAD_PREFIX}video.mp4`,
    }))
    expect(res.status).toBe(200)
    expect((insertedRow!.why_this_role as string).length).toBeLessThanOrEqual(2000)
  })
})
