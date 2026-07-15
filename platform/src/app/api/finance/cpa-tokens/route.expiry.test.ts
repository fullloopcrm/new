import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/finance/cpa-tokens `expires_in_days: 0` bug.
 *
 * FIXED. `expiresAt = body.expires_in_days ? ... : null` used a truthy check,
 * so `expires_in_days: 0` (the caller explicitly asking for an
 * immediately-expiring token) was indistinguishable from omitting the field
 * entirely — both silently produced `expires_at: null`, i.e. a PERMANENT
 * read-only token into the tenant's full general ledger/trial balance. The
 * dashboard UI (`dashboard/finance/cpa-access/page.tsx`) had the identical
 * `parseInt(days) || null` bug one layer up, so typing "0" into the expiry
 * field never even sent a 0 to the server.
 *
 * Now uses `!= null` + `Number.isFinite`, so 0 (and any non-negative number)
 * produces a real expires_at, clamped to "now" at minimum.
 *
 * LOCK: expires_in_days: 0 produces an already-expired token, not a
 * permanent one.
 * CONTROL: omitting the field still produces a permanent (null) token —
 * that's the deliberate "no expiration" UX, unchanged.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { POST } from './route'

function seed() {
  return { cpa_access_tokens: [] as Record<string, unknown>[], entities: [] as Record<string, unknown>[] }
}

function postReq(body: unknown): Request {
  return { url: 'http://x/api/finance/cpa-tokens', json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/cpa-tokens POST — expires_in_days: 0 WITNESS', () => {
  it('LOCK: expires_in_days: 0 produces an already-expired token, not a permanent one', async () => {
    const before = Date.now()
    const res = await POST(postReq({ expires_in_days: 0, cpa_name: 'Test CPA' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'cpa_access_tokens')!.rows[0]
    expect(row.expires_at).not.toBeNull()
    expect(new Date(row.expires_at as string).getTime()).toBeLessThanOrEqual(before + 1000)
  })

  it('CONTROL: omitting expires_in_days still produces a permanent (null) token', async () => {
    const res = await POST(postReq({ cpa_name: 'Test CPA' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'cpa_access_tokens')!.rows[0]
    expect(row.expires_at).toBeNull()
  })

  it('CONTROL: a positive expires_in_days still produces a future expiry', async () => {
    const res = await POST(postReq({ expires_in_days: 90, cpa_name: 'Test CPA' }))
    expect(res.status).toBe(200)

    const row = h.capture.inserts.find((i) => i.table === 'cpa_access_tokens')!.rows[0]
    expect(row.expires_at).not.toBeNull()
    expect(new Date(row.expires_at as string).getTime()).toBeGreaterThan(Date.now())
  })
})
