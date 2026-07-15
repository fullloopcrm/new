import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/ai-chat — bookings.edit gate (broad-hunt: this route only
 * called getTenantForRequest() for base tenant auth, no requirePermission
 * check, despite giving the AI tools that mutate bookings/clients and read
 * revenue stats. Per rbac.ts 'staff' lacks bookings.edit (view/create only);
 * 'manager'/'admin'/'owner' all have it and must keep working.
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
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      chain.or = () => chain
      chain.ilike = () => chain
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { id: h.tenantId, name: 'Acme Cleaning', industry: 'cleaning', anthropic_api_key: 'plaintext-key' },
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
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => h.create(...a) }
  },
}))

import { POST } from './route'

const chatReq = (messages: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify({ messages }) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.create.mockReset()
  h.create.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] })
  h.store = { clients: [], bookings: [] }
})

describe('POST /api/admin/ai-chat — bookings.edit permission', () => {
  it('rejects a staff member (no bookings.edit) with 403 before calling Anthropic', async () => {
    const res = await POST(chatReq([{ role: 'user', content: 'hi' }]))

    expect(res.status).toBe(403)
    expect(h.create).not.toHaveBeenCalled()
  })

  it('allows a manager (has bookings.edit) through to the model', async () => {
    h.role = 'manager'
    const res = await POST(chatReq([{ role: 'user', content: 'hi' }]))

    expect(res.status).toBe(200)
    expect(h.create).toHaveBeenCalledTimes(1)
  })

  it('allows an admin through', async () => {
    h.role = 'admin'
    const res = await POST(chatReq([{ role: 'user', content: 'hi' }]))

    expect(res.status).toBe(200)
  })

  it('allows an owner through', async () => {
    h.role = 'owner'
    const res = await POST(chatReq([{ role: 'user', content: 'hi' }]))

    expect(res.status).toBe(200)
  })
})
