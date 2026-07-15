import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/yinez (public, unauthenticated web-chat widget) — cross-tenant
 * conversation hijack via caller-supplied `sessionId`.
 *
 * `askSelena()` / `insertConversationMessage()` both resolve the acting
 * tenant from the conversation's OWN row (`sms_conversations.tenant_id`),
 * not from the request's signed tenant header — that's intentional so a
 * conversation stays with its real owner. But this route never verified
 * that a caller-supplied `sessionId` actually belongs to the tenant the
 * request is signed for before using it — so an anonymous visitor on ANY
 * tenant's widget could supply another tenant's live sessionId and inject a
 * message into, and drive Selena's reply/tool-calls against, that victim's
 * real customer conversation. Same action-authorization-bypass class as the
 * comhub/voice/control Telnyx call_control_id hijack (P22 in
 * deploy-prep/cross-tenant-leak-register.md) and the sibling `/api/chat`
 * route already guards this via `insertConversationMessage`'s
 * `expectedTenantId` option — this route just never passed it.
 *
 * FIX: a supplied sessionId is now verified tenant-owned before ANY of
 * insertConversationMessage/askSelena run; a miss 400s. Both
 * insertConversationMessage calls also now pass `expectedTenantId` as
 * defense-in-depth, matching /api/chat.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (tenantId: string | null, sig: string | null) => sig === `sig-${tenantId}`,
}))
const notifyMock = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: notifyMock }))
const scoreConversationMock = vi.hoisted(() => vi.fn(async () => ({ score: 0, issues: [], strengths: [] })))
const selfReviewConversationMock = vi.hoisted(() => vi.fn(async () => ({ review: '', score: 0, improvements: [] })))
vi.mock('@/lib/nycmaid/conversation-scorer', () => ({
  scoreConversation: scoreConversationMock,
  selfReviewConversation: selfReviewConversationMock,
}))
const askSelenaMock = vi.hoisted(() => vi.fn(async () => ({ text: 'Selena reply', toolsCalled: [], bookingCreated: false })))
vi.mock('@/lib/selena/agent', async () => {
  const actual = await vi.importActual<typeof import('@/lib/selena/agent')>('@/lib/selena/agent')
  return { askSelena: askSelenaMock, normalizePhoneDigits: actual.normalizePhoneDigits }
})
const insertConversationMessageMock = vi.hoisted(() =>
  vi.fn(async (_input: Record<string, unknown>, _opts?: Record<string, unknown>) => ({ data: null, error: null })),
)
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: insertConversationMessageMock }))

import { POST } from './route'

function seed() {
  return {
    sms_conversations: [
      { id: 'convo-a', tenant_id: TENANT_A, phone: 'web-a', state: 'active' },
      { id: 'convo-b', tenant_id: TENANT_B, phone: 'web-b', state: 'active' },
    ],
    clients: [] as Array<{ id: string; tenant_id: string }>,
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  notifyMock.mockClear()
  scoreConversationMock.mockClear()
  selfReviewConversationMock.mockClear()
  askSelenaMock.mockClear()
  insertConversationMessageMock.mockClear()
})

function req(tenantId: string, body: Record<string, unknown>) {
  return new NextRequest('http://t/api/yinez', {
    method: 'POST',
    headers: { 'x-tenant-id': tenantId, 'x-tenant-sig': `sig-${tenantId}` },
    body: JSON.stringify(body),
  })
}

describe('POST /api/yinez — sessionId cross-tenant ownership guard', () => {
  it('rejects a foreign-tenant sessionId, never inserts a message or calls Selena', async () => {
    const res = await POST(req(TENANT_A, { message: 'hijack attempt', sessionId: 'convo-b' }))
    expect(res.status).toBe(400)
    expect(insertConversationMessageMock).not.toHaveBeenCalled()
    expect(askSelenaMock).not.toHaveBeenCalled()
  })

  it('rejects a nonexistent sessionId', async () => {
    const res = await POST(req(TENANT_A, { message: 'hi', sessionId: 'convo-nope' }))
    expect(res.status).toBe(400)
    expect(insertConversationMessageMock).not.toHaveBeenCalled()
    expect(askSelenaMock).not.toHaveBeenCalled()
  })

  it('CONTROL: own-tenant sessionId proceeds, insertConversationMessage stamped with expectedTenantId', async () => {
    const res = await POST(req(TENANT_A, { message: 'hi', sessionId: 'convo-a' }))
    expect(res.status).toBe(200)
    expect(askSelenaMock).toHaveBeenCalledWith('web', 'hi', 'convo-a', undefined)
    expect(insertConversationMessageMock).toHaveBeenCalledTimes(2)
    for (const call of insertConversationMessageMock.mock.calls) {
      expect(call[1]).toMatchObject({ expectedTenantId: TENANT_A })
    }
  })

  it('CONTROL: omitted sessionId creates a new tenant-scoped conversation', async () => {
    const res = await POST(req(TENANT_A, { message: 'hi' }))
    expect(res.status).toBe(200)
    const created = h.seed.sms_conversations.find((c) => !['convo-a', 'convo-b'].includes(c.id))
    expect(created).toBeTruthy()
    expect(created?.tenant_id).toBe(TENANT_A)
  })
})
