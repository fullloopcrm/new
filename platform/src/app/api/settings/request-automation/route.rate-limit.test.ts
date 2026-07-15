import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/settings/request-automation had no rate limit — any authenticated
 * tenant member could script repeated calls to spam the platform team's inbox.
 * Now capped at 5 requests / hour per tenant.
 */

const { rateLimitAllowed } = vi.hoisted(() => ({ rateLimitAllowed: { value: true } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 't-1',
    userId: 'u-1',
    role: 'staff',
    tenant: { id: 't-1' },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: rateLimitAllowed.value, remaining: rateLimitAllowed.value ? 1 : 0 }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { name: 'Acme', owner_email: 'owner@acme.test' } }),
        }),
      }),
    }),
  },
}))

const sendEmailMock = vi.fn(async (_arg: unknown) => {})
vi.mock('@/lib/email', () => ({
  sendEmail: (arg: unknown) => sendEmailMock(arg),
}))

import { POST } from './route'

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/settings/request-automation', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/settings/request-automation — rate limit', () => {
  it('429s once the per-tenant rate limit is exhausted', async () => {
    rateLimitAllowed.value = false
    const res = await POST(makeRequest({ title: 'New trigger' }))
    expect(res.status).toBe(429)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('allows a normal request through and sends the email', async () => {
    rateLimitAllowed.value = true
    const res = await POST(makeRequest({ title: 'New trigger' }))
    expect(res.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })
})
