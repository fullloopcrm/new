import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Global Payouts SMS approval wiring — the webhook must dispatch "YES <code>"
 * / "GO <code>" to the right handler with the right args, and BEFORE the
 * owner-chat routing (an admin approving a payout from the same phone as
 * owner_phone must not get swallowed into tenant_owner_messages instead).
 * The approval/execution logic itself is covered directly in
 * global-payouts-guardrails.test.ts — this only proves the wiring.
 */

const TENANT_ID = 'tenant_1'
const OWNER_PHONE = '+12122029220'
const TELNYX_PHONE = '+18883164019'

const { handleApprovalReplyMock, handleExecutionReplyMock } = vi.hoisted(() => ({
  handleApprovalReplyMock: vi.fn(async () => true),
  handleExecutionReplyMock: vi.fn(async () => true),
}))

vi.mock('@/lib/finance/global-payouts-guardrails', () => ({
  handleApprovalReply: handleApprovalReplyMock,
  handleExecutionReply: handleExecutionReplyMock,
}))

const ownerMessageInserts = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        is: () => chain,
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        insert: (_row: unknown) => {
          if (table === 'tenant_owner_messages') ownerMessageInserts.count++
          return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
        },
        then: (resolve: (v: unknown) => void) => {
          if (table === 'tenants') {
            resolve({
              data: [{ id: TENANT_ID, name: 'The NYC Maid', telnyx_api_key: 'key', telnyx_phone: TELNYX_PHONE, owner_phone: OWNER_PHONE }],
              error: null,
            })
          } else {
            resolve({ data: [], error: null })
          }
        },
      }
      return chain
    },
  },
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false, NYCMAID_TENANT_ID: 'x' }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn(async () => null) }))
vi.mock('@/lib/feedback-reply', () => ({ handleFeedbackReply: vi.fn(async () => null) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-time', () => ({ getTenantTimezone: () => 'America/New_York' }))
vi.mock('@/lib/recurring', () => ({ nowNaiveET: () => '2026-08-04T00:00:00' }))
vi.mock('@/lib/notify', () => ({ sendTenantTelegram: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/review-engine', () => ({ handleReviewRating: vi.fn(async () => null) }))
vi.mock('@/lib/webhook-verify', () => ({ verifyTelnyx: vi.fn(() => ({ valid: true })) }))

import { POST } from './route'

function req(from: string, text: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    body: JSON.stringify({
      data: { event_type: 'message.received', payload: { from: { phone_number: from }, to: [{ phone_number: TELNYX_PHONE }], text } },
    }),
  })
}

beforeEach(() => {
  handleApprovalReplyMock.mockClear()
  handleExecutionReplyMock.mockClear()
  ownerMessageInserts.count = 0
})

describe('telnyx webhook — Global Payouts approval wiring', () => {
  it('routes "YES ABCD" from the owner phone to handleApprovalReply, not owner-chat', async () => {
    await POST(req(OWNER_PHONE, 'YES ABCD') as never)
    expect(handleApprovalReplyMock).toHaveBeenCalledWith(OWNER_PHONE, 'ABCD')
    expect(ownerMessageInserts.count).toBe(0)
  })

  it('routes "GO WXYZ" from the owner phone to handleExecutionReply, not owner-chat', async () => {
    await POST(req(OWNER_PHONE, 'go wxyz') as never)
    expect(handleExecutionReplyMock).toHaveBeenCalledWith(OWNER_PHONE, 'WXYZ')
    expect(ownerMessageInserts.count).toBe(0)
  })

  it('a normal owner text with neither YES nor GO still falls through to owner-chat', async () => {
    await POST(req(OWNER_PHONE, 'hey what time is the job today') as never)
    expect(handleApprovalReplyMock).not.toHaveBeenCalled()
    expect(handleExecutionReplyMock).not.toHaveBeenCalled()
    expect(ownerMessageInserts.count).toBe(1)
  })
})
