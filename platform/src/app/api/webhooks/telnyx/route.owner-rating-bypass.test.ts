import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression test for the 2026-08-06/07 incident: a phone number that is
 * BOTH the tenant's owner_phone AND a client's phone (an owner testing with
 * their own number as cleaner + client) had every numeric 1-5 rating reply
 * routed into the owner<->admin chat instead of the review engine, because
 * the owner-phone check ran before anything checked whether this was an
 * active rating-reply conversation. Reproduced live: replied "5" and "4" to
 * two separate "how'd we do?" asks, both landed in tenant_owner_messages,
 * neither ever reached client_feedback/reviews/billing.
 *
 * This proves the fix (route.ts's ratingReplyBypass check) without
 * regressing the legitimate case: a genuine owner text with no active
 * rating conversation must still route to owner_chat as before.
 */

const { OWNER_PHONE, TENANT_ID } = vi.hoisted(() => ({
  OWNER_PHONE: '+12122029220',
  TENANT_ID: '00000000-0000-0000-0000-000000000001',
}))

const inserts = vi.hoisted(() => ({
  tenant_owner_messages: [] as Array<Record<string, unknown>>,
}))

const hasActiveRatingLog = vi.hoisted(() => ({ value: false }))

const TENANT_ROW = {
  id: TENANT_ID,
  name: 'The NYC Maid',
  telnyx_api_key: 'key',
  telnyx_phone: '+18883164019',
  owner_phone: OWNER_PHONE,
  timezone: 'America/New_York',
}

const mock = vi.hoisted(() => {
  function makeChain(table: string, col?: string): Record<string, unknown> {
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (row: Record<string, unknown>) => {
        if (table === 'tenant_owner_messages') inserts.tenant_owner_messages.push(row)
        return { ...chain, then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
      },
      update: () => chain,
      order: () => chain,
      ilike: () => chain,
      gte: () => chain,
      in: () => chain,
      or: () => chain,
      eq: (nextCol: string) => makeChain(table, nextCol),
      limit: () => {
        if (table === 'tenants' && col === 'telnyx_phone') {
          return { then: (resolve: (v: unknown) => void) => resolve({ data: [TENANT_ROW], error: null }) }
        }
        if (table === 'sms_logs') {
          return {
            then: (resolve: (v: unknown) => void) =>
              resolve({ data: hasActiveRatingLog.value ? [{ id: 'log-1' }] : [], error: null }),
          }
        }
        return { then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }) }
      },
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    }
    return chain
  }
  return { supabaseAdmin: { from: (table: string) => makeChain(table) } }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mock.supabaseAdmin }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn((id: string) => id === TENANT_ID), NYCMAID_TENANT_ID: TENANT_ID }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn(async () => new Response(null, { status: 200 })) }))
vi.mock('@/lib/feedback-reply', () => ({ handleFeedbackReply: vi.fn(async () => null) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-time', () => ({ getTenantTimezone: () => 'America/New_York' }))
vi.mock('@/lib/recurring', () => ({ nowNaiveET: () => '2026-08-07T00:00:00' }))
vi.mock('@/lib/notify', () => ({ sendTenantTelegram: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/review-engine', () => ({ handleReviewRating: vi.fn(async () => new Response(null, { status: 200 })) }))
vi.mock('@/lib/webhook-verify', () => ({ verifyTelnyx: vi.fn(() => ({ valid: true })) }))

import { POST } from './route'

beforeEach(() => {
  inserts.tenant_owner_messages.length = 0
  hasActiveRatingLog.value = false
})

function messageReceivedEvent(from: string, to: string, text: string): string {
  return JSON.stringify({
    data: {
      event_type: 'message.received',
      payload: { from: { phone_number: from }, to: [{ phone_number: to }], text },
    },
  })
}

function req(body: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx', { method: 'POST', body })
}

describe('telnyx webhook — owner-phone rating-reply bypass', () => {
  it('a bare 1-5 reply with an active rating conversation does NOT get filed as an owner text, even from owner_phone', async () => {
    hasActiveRatingLog.value = true
    await POST(req(messageReceivedEvent(OWNER_PHONE, '+18883164019', '5')) as never)
    expect(inserts.tenant_owner_messages.length).toBe(0)
  })

  it('a genuine owner text with NO active rating conversation still routes to owner_chat as before', async () => {
    hasActiveRatingLog.value = false
    await POST(req(messageReceivedEvent(OWNER_PHONE, '+18883164019', 'hey what is going on with the schedule today')) as never)
    expect(inserts.tenant_owner_messages.length).toBe(1)
  })

  it('a bare 1-5 reply with NO active rating conversation still routes to owner_chat (not every digit is a rating)', async () => {
    hasActiveRatingLog.value = false
    await POST(req(messageReceivedEvent(OWNER_PHONE, '+18883164019', '3')) as never)
    expect(inserts.tenant_owner_messages.length).toBe(1)
  })

  // Real live failure 2026-08-07 ~11:31/11:33: the first version of this fix
  // only covered a bare 1-5 digit (state 1). "Done" and a follow-up
  // screenshot -- state 2, replying to the bill+review-offer text -- both
  // still landed in tenant_owner_messages, because they aren't bare digits.
  it('a "Done" reply with an active conversation does NOT get filed as an owner text', async () => {
    hasActiveRatingLog.value = true
    await POST(req(messageReceivedEvent(OWNER_PHONE, '+18883164019', 'Done')) as never)
    expect(inserts.tenant_owner_messages.length).toBe(0)
  })

  it('a bare photo/screenshot reply with an active conversation does NOT get filed as an owner text', async () => {
    hasActiveRatingLog.value = true
    await POST(req(messageReceivedEvent(OWNER_PHONE, '+18883164019', '')) as never)
    expect(inserts.tenant_owner_messages.length).toBe(0)
  })
})
