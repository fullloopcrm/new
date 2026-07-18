// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * management-applications/signed-url declares a maxSize per file type, but
 * createSignedUploadUrl has no size parameter — the client PUTs straight to
 * Supabase, so nothing ever enforced it. This verifies POST
 * /api/management-applications now checks the object that actually landed
 * in storage before trusting its URL and persisting the application row.
 */

const TENANT = { id: 'tenant-1', name: 'Canary' }
const UPLOAD_PREFIX = `https://storage.example.com/${TENANT.id}/management-applications/`

let insertedRow: Record<string, unknown> | null = null
let landedSize = 1024

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
        list: async () => ({ data: [{ metadata: { size: landedSize } }], error: null }),
        remove: async () => ({ data: null, error: null }),
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

beforeEach(() => {
  insertedRow = null
  landedSize = 1024
})

describe('POST /api/management-applications — uploaded object size cap', () => {
  it('rejects when the object that landed for photo_url exceeds its 10MB cap', async () => {
    landedSize = 11 * 1024 * 1024
    const res = await POST(req({
      name: 'Real Name',
      email: 'a@example.com',
      phone: '5551234567',
      location: 'Nowhere',
      resume_url: `${UPLOAD_PREFIX}resume.pdf`,
      photo_url: `${UPLOAD_PREFIX}photo.jpg`,
      video_url: `${UPLOAD_PREFIX}video.mp4`,
    }))
    expect(res.status).toBe(400)
    expect(insertedRow).toBeNull()
  })

  it('rejects when the object that landed for video_url exceeds its 100MB cap', async () => {
    landedSize = 101 * 1024 * 1024
    const res = await POST(req({
      name: 'Real Name',
      email: 'b@example.com',
      phone: '5559876543',
      location: 'Nowhere',
      resume_url: `${UPLOAD_PREFIX}resume.pdf`,
      photo_url: `${UPLOAD_PREFIX}photo.jpg`,
      video_url: `${UPLOAD_PREFIX}video.mp4`,
    }))
    expect(res.status).toBe(400)
    expect(insertedRow).toBeNull()
  })

  it('accepts when every uploaded object landed within cap', async () => {
    landedSize = 2 * 1024 * 1024
    const res = await POST(req({
      name: 'Real Name',
      email: 'c@example.com',
      phone: '5551112222',
      location: 'Nowhere',
      resume_url: `${UPLOAD_PREFIX}resume.pdf`,
      photo_url: `${UPLOAD_PREFIX}photo.jpg`,
      video_url: `${UPLOAD_PREFIX}video.mp4`,
    }))
    expect(res.status).toBe(200)
    expect(insertedRow).not.toBeNull()
  })
})
