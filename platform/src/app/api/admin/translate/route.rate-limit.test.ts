import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/admin/translate had no rate limit or input length cap. Any
 * authenticated tenant member could script unbounded calls against the
 * tenant's paid Anthropic key. Now capped at 30 requests / 10 min per tenant
 * and 5000 chars per request.
 */

const { rateLimitAllowed } = vi.hoisted(() => ({ rateLimitAllowed: { value: true } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1',
    userId: 'u-1',
    role: 'staff',
    tenant: { id: 't-1', anthropic_api_key: 'test-key' },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: async () => ({ content: [{ type: 'text', text: 'Hola' }] }),
    },
  }),
}))

import { POST } from './route'

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/translate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/translate — cost controls', () => {
  it('429s once the per-tenant rate limit is exhausted', async () => {
    rateLimitAllowed.value = false
    const res = await POST(makeRequest({ text: 'Hello' }))
    expect(res.status).toBe(429)
  })

  it('400s text over the max length', async () => {
    rateLimitAllowed.value = true
    const res = await POST(makeRequest({ text: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
  })

  it('allows a normal request through', async () => {
    rateLimitAllowed.value = true
    const res = await POST(makeRequest({ text: 'Hello' }))
    expect(res.status).toBe(200)
  })
})
