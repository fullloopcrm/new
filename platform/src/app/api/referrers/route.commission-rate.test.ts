import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * POST /api/referrers signup -- commission_rate derivation.
 *
 * BUG (fixed this pass): every new referrer was inserted with a hardcoded
 * commission_rate of 0.10, regardless of what the tenant had configured in
 * Settings > Referrals & Policies (tenants.commission_rate, a whole percent
 * like the dashboard/referrals UI's "Set commission rates" field claims to
 * control). That setting was pure decoration -- it never reached the row
 * that /api/referral-commissions and /api/team-portal/checkout actually read
 * when paying a referrer out. FIX: the insert now derives commission_rate
 * from tenant.commission_rate (percent -> fraction), falling back to 10%
 * only when the tenant has never configured one (null/undefined), and
 * honoring an explicit 0 rather than treating it as falsy-missing.
 */

let insertedPayload: Record<string, unknown> | undefined
let tenantRow: { id: string; commission_rate?: number | null }

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
  getTenantFromHeaders: async () => tenantRow,
}))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 9 }),
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

describe('POST /api/referrers -- commission_rate derived from tenant setting', () => {
  it('uses the tenant-configured commission_rate (percent -> fraction)', async () => {
    tenantRow = { id: 'tenant_1', commission_rate: 15 }
    await POST(postReq({ name: 'Patricia', email: 'patricia@example.com' }))
    expect(insertedPayload?.commission_rate).toBe(0.15)
  })

  it('honors an explicit 0% rather than falling back to 10%', async () => {
    tenantRow = { id: 'tenant_1', commission_rate: 0 }
    await POST(postReq({ name: 'Patricia', email: 'patricia@example.com' }))
    expect(insertedPayload?.commission_rate).toBe(0)
  })

  it('falls back to 10% when the tenant never configured a rate', async () => {
    tenantRow = { id: 'tenant_1', commission_rate: null }
    await POST(postReq({ name: 'Patricia', email: 'patricia@example.com' }))
    expect(insertedPayload?.commission_rate).toBe(0.10)
  })

  it('falls back to 10% when the field is undefined', async () => {
    tenantRow = { id: 'tenant_1' }
    await POST(postReq({ name: 'Patricia', email: 'patricia@example.com' }))
    expect(insertedPayload?.commission_rate).toBe(0.10)
  })
})
