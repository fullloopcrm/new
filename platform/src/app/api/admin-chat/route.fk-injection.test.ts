/**
 * POST /api/admin-chat — cross-tenant FK injection on sessionId. The route
 * used a caller-supplied sessionId to insert into `sms_conversation_messages`
 * and handed it straight to askSelena() with zero check that the underlying
 * sms_conversations row belongs to the caller's tenant. A caller could reuse
 * another tenant's sessionId to read/append to that tenant's admin-chat
 * thread.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
const askSelenaMock = vi.fn(async () => ({ text: 'reply', toolsCalled: [] }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: (...a: Parameters<typeof askSelenaMock>) => askSelenaMock(...a) }))

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  askSelenaMock.mockClear()
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    sms_conversations: [
      { id: 'session-A1', tenant_id: TENANT_A, state: 'admin-dashboard' },
      { id: 'session-B1', tenant_id: TENANT_B, state: 'admin-dashboard' },
    ],
    sms_conversation_messages: [],
  }
})

describe('POST /api/admin-chat — cross-tenant sessionId FK injection', () => {
  it('rejects a sessionId belonging to another tenant, calls askSelena with nothing, inserts nothing', async () => {
    const res = await POST(postReq({ message: 'hi', sessionId: 'session-B1' }))

    expect(res.status).toBe(404)
    expect(askSelenaMock).not.toHaveBeenCalled()
    expect(h.store.sms_conversation_messages.length).toBe(0)
  })

  it('accepts a sessionId genuinely owned by the caller tenant', async () => {
    const res = await POST(postReq({ message: 'hi', sessionId: 'session-A1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.sessionId).toBe('session-A1')
    expect(askSelenaMock).toHaveBeenCalledTimes(1)
    expect(h.store.sms_conversation_messages.length).toBe(2)
  })
})
