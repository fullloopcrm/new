import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/ai/chat — campaigns.view gate (broad-hunt: session-auth only,
 * no requirePermission check, unlike the sibling campaigns.* AI routes
 * already gated in commit 47e68c41 — same class, missed in that sweep.
 * The system prompt embeds recent bookings' final_price, so an ungated
 * staff member (no finance.view) could extract revenue data through chat.
 * Per rbac.ts 'staff' lacks campaigns.view entirely; 'manager' and up have it.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  create: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  role: string
  create: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { id: h.tenantId, name: 'Acme Cleaning', industry: 'cleaning', selena_config: null, anthropic_api_key: 'plaintext-key' },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: { create: (...a: unknown[]) => h.create(...a) },
  }),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.create.mockReset()
  h.create.mockResolvedValue({ content: [{ type: 'text', text: 'here is your copy' }] })
  h.store = { clients: [], bookings: [], team_members: [] }
})

describe('POST /api/ai/chat — campaigns.view permission', () => {
  it('rejects a staff member (no campaigns.view) with 403 before calling the model', async () => {
    const res = await POST(postReq({ messages: [{ role: 'user', content: 'hi' }] }))

    expect(res.status).toBe(403)
    expect(h.create).not.toHaveBeenCalled()
  })

  it('allows a manager (has campaigns.view) through', async () => {
    h.role = 'manager'
    const res = await POST(postReq({ messages: [{ role: 'user', content: 'hi' }] }))

    expect(res.status).toBe(200)
    expect(h.create).toHaveBeenCalledTimes(1)
  })

  it('allows an owner through', async () => {
    h.role = 'owner'
    const res = await POST(postReq({ messages: [{ role: 'user', content: 'hi' }] }))

    expect(res.status).toBe(200)
  })
})
