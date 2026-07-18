import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/leads is public/unauthenticated (onboarding lead capture). `name`,
 * `business_name`, `industry`, and `message` had zero length cap, unlike the
 * already-fixed sibling public intake routes (/api/contact, /api/lead,
 * /api/waitlist, /api/ingest/lead, /api/ingest/application) which cap short
 * fields at 200 / long text at 2000 so a single submission can't balloon a
 * row (or the admin notification built from it) to megabytes of
 * attacker-chosen content. Verifies the fix.
 */

let insertedLeadRow: Record<string, unknown> | null = null
let insertedPartnerRequestRow: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        if (table === 'leads') {
          insertedLeadRow = row
          return { select: () => ({ single: async () => ({ data: { id: 'lead-1', ...row }, error: null }) }) }
        }
        insertedPartnerRequestRow = row
        return { then: (resolve: (v: { data: unknown; error: null }) => unknown) => resolve({ data: null, error: null }) }
      },
    }),
  },
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://homeservicesbusinesscrm.com/api/leads', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  insertedLeadRow = null
  insertedPartnerRequestRow = null
})

describe('POST /api/leads — free-text length cap', () => {
  it('caps an oversized name and business_name at 200 chars before either insert', async () => {
    const res = await POST(req({
      name: 'A'.repeat(5000),
      email: 'a@example.com',
      business_name: 'B'.repeat(5000),
    }))
    expect(res.status).toBe(200)
    expect((insertedLeadRow!.name as string).length).toBeLessThanOrEqual(200)
    expect((insertedLeadRow!.business_name as string).length).toBeLessThanOrEqual(200)
    expect((insertedPartnerRequestRow!.contact_name as string).length).toBeLessThanOrEqual(200)
    expect((insertedPartnerRequestRow!.business_name as string).length).toBeLessThanOrEqual(200)
  })

  it('caps an oversized message at 2000 chars before either insert', async () => {
    const res = await POST(req({
      name: 'Real Name',
      email: 'b@example.com',
      business_name: 'Real Business',
      message: 'X'.repeat(50000),
    }))
    expect(res.status).toBe(200)
    expect((insertedLeadRow!.message as string).length).toBeLessThanOrEqual(2000)
    expect((insertedPartnerRequestRow!.pitch as string).length).toBeLessThanOrEqual(2000)
  })
})
