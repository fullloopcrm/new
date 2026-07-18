import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/team-applications is public/unauthenticated. `name` and every
 * other free-text field (address, experience, notes, etc.) had zero length
 * cap, unlike the already-fixed sibling public intake routes (/api/contact,
 * /api/lead, /api/waitlist, /api/ingest/lead, /api/ingest/application) which
 * cap name at 200 / long text at 2000 so a single submission can't balloon a
 * row (or the admin notification built from it) to megabytes of
 * attacker-chosen content. Verifies the fix.
 */

const TENANT_ID = 'tenant-1'

let insertedRow: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: (_cols: string) => {
        if (table === 'tenants') {
          return {
            eq: () => ({ single: async () => ({ data: { id: TENANT_ID, name: 'Canary' } }) }),
          }
        }
        return {
          eq: function () { return this },
          limit: function () { return this },
          then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: [], error: null }),
        }
      },
      insert: (row: Record<string, unknown>) => {
        insertedRow = row
        return { select: () => ({ single: async () => ({ data: { id: 'new-app', ...row }, error: null }) }) }
      },
    }),
  },
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/team-provisioning', () => ({ provisionApprovedApplicant: async () => {} }))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://canary.example.com/api/team-applications', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}`, 'x-tenant-slug': 'canary' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { insertedRow = null })

describe('POST /api/team-applications — free-text length cap', () => {
  it('caps an oversized name at 200 chars before the insert', async () => {
    const res = await POST(req({ name: 'A'.repeat(5000), phone: '5551234567' }))
    expect(res.status).toBe(201)
    expect((insertedRow!.name as string).length).toBeLessThanOrEqual(200)
  })

  it('caps oversized notes at 2000 chars before the insert', async () => {
    const res = await POST(req({ name: 'Real Name', phone: '5559876543', notes: 'X'.repeat(50000) }))
    expect(res.status).toBe(201)
    expect((insertedRow!.notes as string).length).toBeLessThanOrEqual(2000)
  })
})
