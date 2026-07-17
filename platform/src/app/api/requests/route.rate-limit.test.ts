import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/requests is fully unauthenticated (public partnership-application
 * form, allowlisted pre-auth in middleware.ts). It had no per-IP throttle —
 * only a per-email 24h dedup, which a scripted caller trivially bypasses by
 * rotating the email field — so an anonymous looper could drive unlimited
 * partner_requests inserts and an admin notification email per call. Fixed
 * with the same per-IP rateLimitDb convention already used on the sibling
 * public forms (/api/inquiry, /api/public-upload).
 */

let insertedCount = 0
let rlCallsForBucket: Record<string, number> = {}

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, max: number) => {
    rlCallsForBucket[bucketKey] = (rlCallsForBucket[bucketKey] || 0) + 1
    const count = rlCallsForBucket[bucketKey]
    return { allowed: count <= max, remaining: Math.max(0, max - count) }
  },
}))

vi.mock('@/lib/email', () => ({
  sendEmail: async () => ({}),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'partner_requests') throw new Error(`unexpected table ${table}`)
      return {
        select: () => ({
          eq: () => ({
            gte: () => ({
              limit: () => ({
                // No recent-submission match — every call gets a fresh email.
                single: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => {
              insertedCount++
              return { data: { id: 'req-' + insertedCount }, error: null }
            },
          }),
        }),
      }
    },
  },
}))

import { POST } from './route'

function req(ip: string, email: string) {
  const body = {
    business_name: 'Acme Cleaning',
    contact_name: 'Jane Doe',
    email,
    service_category: 'Cleaning',
    city: 'New York',
    state: 'NY',
    years_in_business: '5',
    team_size: '10',
    monthly_revenue: '10000',
    pitch: 'We would like to partner.',
  }
  return {
    headers: { get: (h: string) => (h === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

beforeEach(() => {
  insertedCount = 0
  rlCallsForBucket = {}
})

describe('POST /api/requests — anonymous partner-form rate limit', () => {
  it('caps submissions per IP even when the caller rotates the email field to dodge the 24h dedup', async () => {
    let rejected = 0
    for (let i = 0; i < 30; i++) {
      const res = await POST(req('198.51.100.9', `attacker${i}@example.com`))
      if (res.status === 429) rejected++
    }
    expect(insertedCount).toBeLessThanOrEqual(5)
    expect(rejected).toBeGreaterThan(0)
  })

  it('does not throttle a different IP sharing no bucket with the attacker', async () => {
    for (let i = 0; i < 25; i++) {
      await POST(req('198.51.100.9', `attacker${i}@example.com`))
    }
    const res = await POST(req('203.0.113.5', 'legit@example.com'))
    expect(res.status).toBe(201)
  })
})
