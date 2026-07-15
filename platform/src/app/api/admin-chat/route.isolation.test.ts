import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/admin-chat.
 *
 * askSelena() resolves ITS tenant context purely from the sms_conversations
 * row for the given conversation id (see resolveTenantForConversation in
 * lib/selena/agent.ts) — not from the caller's authenticated tenant. Before
 * the fix, a caller-supplied `sessionId` was passed straight through with no
 * ownership check: a manager+ authenticated against tenant A could submit
 * tenant B's admin-dashboard conversation id and get Selena to load/act on
 * tenant B's data, returned directly in the response to tenant A's caller.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
const requirePermissionMock = vi.hoisted(() => vi.fn())
const askSelenaMock = vi.hoisted(() => vi.fn(async () => ({ text: 'reply', toolsCalled: [] })))
const insertConversationMessageMock = vi.hoisted(() => vi.fn(async () => ({ data: null, error: null })))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: askSelenaMock }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: insertConversationMessageMock }))

import { POST } from './route'

function seed() {
  return {
    sms_conversations: [
      { id: 'convo-a', tenant_id: TENANT_A, phone: '+12122029220', state: 'admin-dashboard', completed_at: null },
      { id: 'convo-b', tenant_id: TENANT_B, phone: '+13105551234', state: 'admin-dashboard', completed_at: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  vi.clearAllMocks()
  h = createTenantDbHarness(seed())
  holder.from = h.from
  requirePermissionMock.mockResolvedValue({ tenant: { tenantId: TENANT_A }, error: null })
  askSelenaMock.mockResolvedValue({ text: 'reply', toolsCalled: [] })
})

function chat(body: Record<string, unknown>) {
  return POST(new NextRequest('http://t/api/admin-chat', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/admin-chat — tenant isolation on caller-supplied sessionId', () => {
  it('wrong-tenant probe: rejects a sessionId belonging to another tenant, never calls askSelena', async () => {
    const res = await chat({ message: 'hi', sessionId: 'convo-b' })
    expect(res.status).toBe(404)
    expect(askSelenaMock).not.toHaveBeenCalled()
    expect(insertConversationMessageMock).not.toHaveBeenCalled()
  })

  it('rejects a sessionId that does not exist at all', async () => {
    const res = await chat({ message: 'hi', sessionId: 'convo-does-not-exist' })
    expect(res.status).toBe(404)
    expect(askSelenaMock).not.toHaveBeenCalled()
  })

  it('positive control: accepts a sessionId owned by the caller tenant', async () => {
    const res = await chat({ message: 'hi', sessionId: 'convo-a' })
    expect(res.status).toBe(200)
    expect(askSelenaMock).toHaveBeenCalledWith('web', 'hi', 'convo-a', expect.any(String))
  })

  it('positive control: omitting sessionId reuses/creates the callers own tenant conversation', async () => {
    const res = await chat({ message: 'hi' })
    expect(res.status).toBe(200)
    expect(askSelenaMock).toHaveBeenCalledWith('web', 'hi', 'convo-a', expect.any(String))
  })
})
