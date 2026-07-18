import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * POST /api/referrers signup's rateLimitDb (5/10min per IP) bounds request
 * COUNT, not the SIZE of its free-text fields -- `name` is already bounded
 * to 50 chars via isValidName(), but email/phone/preferred_payout are
 * written straight to the referrers row with no cap. Same class as the
 * apply/contact/leads/etc. message-length caps, ported here via the shared
 * maxLengthError() helper.
 */

let insertedPayload: Record<string, unknown> | undefined

function referrersBuilder() {
  const chain: Record<string, unknown> = {
    select: () => ({ eq: () => ({ ilike: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
    insert: (payload: Record<string, unknown>) => {
      insertedPayload = payload
      return {
        select: () => ({
          single: async () => ({ data: { id: 'new_ref', ...payload }, error: null }),
        }),
      }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'referrers') return referrersBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: 'tenant_1', commission_rate: null }),
}))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 4 }),
}))

import { POST } from './route'

function postReq(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: { get: () => '203.0.113.5' },
  } as unknown as NextRequest
}

beforeEach(() => {
  insertedPayload = undefined
})

const BASE = { name: 'Patricia', email: 'patricia@example.com' }

describe('POST /api/referrers — free-text field length cap', () => {
  it('rejects when preferred_payout exceeds 5000 characters, before any DB write', async () => {
    const res = await POST(postReq({ ...BASE, preferred_payout: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(insertedPayload).toBeUndefined()
  })

  it('rejects when phone exceeds 5000 characters', async () => {
    const res = await POST(postReq({ ...BASE, phone: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
  })

  it('accepts fields exactly at the 5000 character boundary', async () => {
    const res = await POST(postReq({ ...BASE, preferred_payout: 'a'.repeat(5000) }))
    expect(res.status).toBe(201)
  })

  it('accepts a normal signup', async () => {
    const res = await POST(postReq({ ...BASE, phone: '5551234567', preferred_payout: 'zelle' }))
    expect(res.status).toBe(201)
  })
})
