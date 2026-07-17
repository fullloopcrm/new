import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/finance/bank-transactions/suggest fans out to `suggestPending`,
 * which can trigger up to 500 paid Anthropic calls in one invocation
 * (categorize-ai.ts's Claude fallback for unseen descriptions). Unlike
 * finance/ai-ask and finance/receipts (already rate-limited), this route had
 * no cap at all — any authenticated tenant member could repeatedly trigger a
 * much larger cost multiplier per call. Now capped per-tenant.
 */

const TENANT_ID = 'tenant-1'
const { rateLimitAllowed } = vi.hoisted(() => ({ rateLimitAllowed: { value: true } }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))

const suggestPendingMock = vi.fn(async (_tenantId: string) => ({ processed: 1, suggestedCount: 1, skipped: 0 }))
vi.mock('@/lib/categorize-ai', () => ({
  suggestPending: (tenantId: string) => suggestPendingMock(tenantId),
}))

import { POST } from './route'

describe('POST /api/finance/bank-transactions/suggest — rate limit', () => {
  it('429s once the per-tenant rate limit is exhausted, without calling suggestPending', async () => {
    rateLimitAllowed.value = false
    const res = await POST()
    expect(res.status).toBe(429)
    expect(suggestPendingMock).not.toHaveBeenCalled()
  })

  it('allows a normal request through', async () => {
    rateLimitAllowed.value = true
    const res = await POST()
    expect(res.status).toBe(200)
    expect(suggestPendingMock).toHaveBeenCalledWith(TENANT_ID)
  })
})
