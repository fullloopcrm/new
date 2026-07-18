import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/ai/assistant rate-limited call *volume* (30/10min, up to 10
 * tool-use iterations each) but never capped the size of the `messages`
 * payload before replaying it across every iteration — unlike
 * admin/translate's MAX_TEXT_LENGTH, the documented convention for this
 * exact risk. An authenticated tenant member (any role) could send one
 * oversized messages array and have it multiply across iterations, driving
 * real Anthropic spend against the tenant's (or platform's) stored key.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}) } }))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 30 }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT,
    role: 'admin',
    tenant: { name: 'Acme', industry: 'cleaning', anthropic_api_key: null },
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/postgrest-safe', () => ({ sanitizePostgrestValue: (v: string) => v }))

let createCallCount = 0
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: async () => {
        createCallCount++
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] }
      },
    },
  }),
}))

process.env.ANTHROPIC_API_KEY = 'test-key'

import { POST } from '@/app/api/ai/assistant/route'

function req(body: unknown): Request {
  return new Request('https://x/api/ai/assistant', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/ai/assistant — messages payload cap', () => {
  it('rejects an oversized single message before calling Anthropic', async () => {
    createCallCount = 0
    const res = await POST(req({ messages: [{ role: 'user', content: 'x'.repeat(4001) }] }))
    expect(res.status).toBe(400)
    expect(createCallCount).toBe(0)
  })

  it('rejects an oversized messages array before calling Anthropic', async () => {
    createCallCount = 0
    const messages = Array.from({ length: 41 }, () => ({ role: 'user' as const, content: 'hi' }))
    const res = await POST(req({ messages }))
    expect(res.status).toBe(400)
    expect(createCallCount).toBe(0)
  })

  it('allows a normal-sized messages array through to Anthropic', async () => {
    createCallCount = 0
    const res = await POST(req({ messages: [{ role: 'user', content: 'how many clients do we have' }] }))
    expect(res.status).toBe(200)
    expect(createCallCount).toBe(1)
  })
})
