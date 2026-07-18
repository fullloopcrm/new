import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/prospects is public/unauthenticated. Every free-text field on the
 * insert goes through cap() to bound row size, but service_zips (a TEXT[]
 * column) was passed through raw — a direct API caller (this route isn't
 * wired to any frontend form yet) could POST an unbounded array of unbounded
 * strings. Verifies the fix: array length and per-entry length are capped.
 */

let insertedProspectRow: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: function () { return this },
        in: function () { return this },
        limit: async () => ({ data: [], error: null }),
      }),
      insert: (row: Record<string, unknown>) => {
        if (table === 'prospects') insertedProspectRow = row
        return { select: () => ({ single: async () => ({ data: { id: 'new-prospect', ...row }, error: null }) }) }
      },
    }),
  },
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/lead-fit', () => ({ computeFit: () => ({ score: 0, bucket: 'cold' }) }))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://homeservicesbusinesscrm.com/api/prospects', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { insertedProspectRow = null })

describe('POST /api/prospects — service_zips cap', () => {
  it('caps an oversized service_zips array at 100 entries of 20 chars each', async () => {
    const res = await POST(req({
      business_name: 'Acme Plumbing',
      owner_name: 'Jane Doe',
      owner_email: 'jane@example.com',
      trade: 'plumbing',
      service_zips: Array.from({ length: 5000 }, (_, i) => `zip-${i}`.repeat(50)),
    }))
    expect(res.status).toBe(200)
    const zips = insertedProspectRow!.service_zips as string[]
    expect(zips.length).toBeLessThanOrEqual(100)
    for (const z of zips) expect(z.length).toBeLessThanOrEqual(20)
  })

  it('stores null when service_zips is absent', async () => {
    const res = await POST(req({
      business_name: 'Acme Plumbing',
      owner_name: 'Jane Doe',
      owner_email: 'jane@example.com',
      trade: 'plumbing',
    }))
    expect(res.status).toBe(200)
    expect(insertedProspectRow!.service_zips).toBeNull()
  })
})
