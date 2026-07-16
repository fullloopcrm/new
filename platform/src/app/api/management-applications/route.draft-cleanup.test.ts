import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * management-applications POST — draft-cleanup key probe.
 *
 * BUG (fixed here): draft/route.ts keys management_application_drafts by an
 * opaque client_id when the caller supplies one (falls back to raw IP only
 * otherwise — see apply-visitor-key.ts). This route's own post-submit
 * cleanup delete still matched `ip_address` against the raw request IP only,
 * so once a real applicant's draft was saved under their client_id, this
 * cleanup silently missed it: the row survived past a successful submission
 * and could resurface as a stale draft on a later visit. Not a cross-tenant
 * leak (the frontend also independently DELETEs via client_id right after a
 * successful submit) but a real redundant-cleanup regression introduced by
 * the client_id fix itself.
 *
 * FIX: resolve the same visitorKey (client_id when supplied, else raw IP)
 * the draft route uses, so the cleanup actually finds the row it saved.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: vi.fn(async () => ({ id: A })) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    management_applications: [] as Record<string, unknown>[],
    management_application_drafts: [
      {
        id: 'draft-1',
        tenant_id: A,
        ip_address: 'client-abc12345', // saved under the applicant's client_id
        position: 'operations-coordinator',
        form_data: { name: 'Draft Applicant' },
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function postReq(body: Record<string, unknown>, ip = '203.0.113.9') {
  return new Request('http://t', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

const FORM = {
  name: 'Real Applicant',
  email: 'applicant@example.com',
  phone: '5551234567',
  location: 'NYC',
  resume_url: 'https://x/resume.pdf',
  photo_url: 'https://x/photo.jpg',
  video_url: 'https://x/video.mp4',
}

describe('management-applications POST — draft-cleanup key probe', () => {
  it('client_id-keyed draft IS deleted on successful submit when client_id is supplied', async () => {
    const res = await POST(postReq({ ...FORM, client_id: 'client-abc12345' }))
    expect(res.status).toBe(200)
    const stillThere = h.seed.management_application_drafts.some((d) => d.id === 'draft-1')
    expect(stillThere).toBe(false)
  })

  it('REGRESSION PROBE: without client_id in the body, cleanup falls back to raw-IP key and does NOT touch a client_id-keyed draft (documents the fallback boundary, not a leak)', async () => {
    const res = await POST(postReq({ ...FORM }))
    expect(res.status).toBe(200)
    const stillThere = h.seed.management_application_drafts.some((d) => d.id === 'draft-1')
    expect(stillThere).toBe(true)
  })
})
