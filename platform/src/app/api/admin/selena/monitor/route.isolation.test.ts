import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/selena/monitor POST — ownership-check hardening (P1/W1 backlog
 * batch, Section-Q-substitute pattern). The endpoint's auth is a single
 * global ELCHAPO_MONITOR_KEY (GET already returns platform-wide stats by
 * design when no tenant filter is given), so this is not a privilege
 * escalation fix. Previously the conversation-ownership check only ran when
 * the caller supplied a `tenantId` in the body, so a mismatched claim could
 * be silently skipped just by omitting it. Now the conversation's own
 * tenant_id is always resolved first, and a supplied tenantId must match the
 * real owner or the request is rejected.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/secret-compare', () => ({ safeEqual: (a: unknown, b: unknown) => a === b }))

process.env.ELCHAPO_MONITOR_KEY = 'test-monitor-key'

import { POST } from './route'

const postReq = (body: unknown) =>
  new NextRequest('http://x', {
    method: 'POST',
    headers: { 'x-monitor-key': 'test-monitor-key' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.seq = 0
  h.store = {
    sms_conversations: [
      { id: 'convo-A1', tenant_id: 'tenant-A' },
      { id: 'convo-B1', tenant_id: 'tenant-B' },
    ],
    sms_conversation_messages: [
      { id: 'msg-A1', conversation_id: 'convo-A1', direction: 'inbound', message: 'hi from A' },
      { id: 'msg-B1', conversation_id: 'convo-B1', direction: 'inbound', message: 'secret-B message' },
    ],
    tenants: [
      { id: 'tenant-A', slug: 'tenant-a' },
      { id: 'tenant-B', slug: 'tenant-b' },
    ],
  }
})

describe('POST /api/admin/selena/monitor — ownership-check hardening', () => {
  it('returns messages for a conversation id with NO tenantId supplied (global key already grants this, by design)', async () => {
    const res = await POST(postReq({ conversationId: 'convo-A1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.messages.map((m: { message: string }) => m.message)).toEqual(['hi from A'])
  })

  it('a claimed tenantId that does NOT own the conversation is now always rejected, not just when checked before', async () => {
    const res = await POST(postReq({ conversationId: 'convo-B1', tenantId: 'tenant-a' }))
    expect(res.status).toBe(404)
  })

  it('an unknown conversationId is rejected regardless of tenantId', async () => {
    const res = await POST(postReq({ conversationId: 'convo-nope' }))
    expect(res.status).toBe(404)
  })

  it("omitting tenantId still only returns that specific conversation's own messages", async () => {
    const res = await POST(postReq({ conversationId: 'convo-B1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.messages.map((m: { message: string }) => m.message)).toEqual(['secret-B message'])
  })
})
