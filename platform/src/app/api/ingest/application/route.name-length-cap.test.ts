import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/ingest/application is gated by a shared INGEST_SECRET, but the
 * actual `name`/free-text content originates from a satellite site's own
 * public job-application form — applicant-controlled. Zero length cap let it
 * flow unbounded into the team_applications row and, downstream, into a hired
 * team_members.name that admin SMS embed (see smsLateCheckInAdmin /
 * smsLateCheckOutAdmin / smsRunningLateAdmin). Verifies the fix: name capped
 * at 200, free-text fields capped too.
 */

const TENANT = { id: 'tenant-1', name: 'Canary', slug: 'canary' }
const SECRET = 'shared-ingest-secret'

let capturedInsert: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        ilike: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        insert: (row: Record<string, unknown>) => {
          capturedInsert = row
          return { select: () => ({ single: async () => ({ data: { id: 'new-app' }, error: null }) }) }
        },
      }
      return chain
    },
  },
}))
vi.mock('@/lib/tenant-lookup', () => ({ getTenantBySlug: async () => TENANT }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://app.example.com/api/ingest/application', {
    method: 'POST',
    headers: { 'x-ingest-secret': SECRET, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  process.env.INGEST_SECRET = SECRET
  capturedInsert = null
})

describe('POST /api/ingest/application — name/text length cap', () => {
  it('caps an oversized name at 200 chars before the team_applications insert', async () => {
    const res = await POST(req({ tenant_slug: 'canary', name: 'A'.repeat(5000), phone: '5551234567' }))
    expect(res.status).toBe(200)
    expect((capturedInsert!.name as string).length).toBeLessThanOrEqual(200)
  })

  it('caps an oversized experience field before the insert', async () => {
    const res = await POST(req({ tenant_slug: 'canary', name: 'Real Name', phone: '5559876543', experience: 'X'.repeat(50000) }))
    expect(res.status).toBe(200)
    expect((capturedInsert!.experience as string).length).toBeLessThanOrEqual(2000)
  })
})
