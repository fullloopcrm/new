import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in the Telnyx
 * inbound-SMS webhook's chatbot flow.
 *
 * sms_conversation_messages.tenant_id has a column DEFAULT of 'nycmaid' (the
 * rollout safety net added by migrations/2026_05_09_tenant_id_core.sql). All
 * four sms_conversation_messages inserts in the chatbot branch (new-convo
 * inbound + greeting, ongoing-convo inbound + AI reply) omitted tenant_id,
 * mis-tagging every OTHER tenant's chatbot message as nycmaid's and hiding it
 * from that tenant's own tenant-scoped GET ?convoId read. Same gap already
 * fixed on the selena/chat/yinez/admin-chat siblings; tracked as P2
 * "write-side siblings" in deploy-prep/idor-remediation-status.md.
 *
 * FIX: all four inserts now carry `tenant_id: tenantId` — the tenant the
 * webhook resolved from the verified event's `to` phone number.
 */

const TENANT_ID = 'tenant-msg-tag'

const h = vi.hoisted(() => {
  const state = {
    existingConvo: null as Record<string, unknown> | null,
    messageInserts: [] as Record<string, unknown>[],
    tenantRow: {
      id: 'tenant-msg-tag',
      name: 'Acme',
      telnyx_api_key: 'key_test',
      telnyx_phone: '+15551234567',
      owner_phone: '+19995550000',
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeBuilder(table: string): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      is: () => builder,
      order: () => builder,
      limit: () => {
        if (table === 'tenants') return Promise.resolve({ data: [state.tenantRow], error: null })
        return builder
      },
      single: () => {
        if (table === 'sms_conversations') return Promise.resolve({ data: state.existingConvo, error: null })
        return Promise.resolve({ data: null, error: null })
      },
      // Feedback-campaign-reply lookup (clients/campaign_recipients/client_feedback)
      // always misses in this fixture -- irrelevant to the tenant-tagging
      // regression this file locks down, so the block short-circuits and the
      // chatbot flow below runs exactly as before.
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      insert: (row: Record<string, unknown>) => {
        if (table === 'sms_conversation_messages') state.messageInserts.push(row)
        if (table === 'sms_conversations') {
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'new-convo-1', client_id: null, name: null }, error: null }),
            }),
          }
        }
        return { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) }
      },
      then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/webhook-verify', () => ({
  verifyTelnyx: () => ({ valid: true }),
  isWebhookVerifyDisabled: () => true,
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({
  askSelena: vi.fn(async () => ({ text: 'ai reply', checklist: {}, bookingCreated: false })),
}))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'ai reply', bookingCreated: false })) }))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ chatbot_enabled: true, auto_respond_leads: true, chatbot_greeting: 'Hi there!' })),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn(() => false) }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn(async () => null) }))

import { POST } from './route'

function makeRequest(text: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      data: {
        event_type: 'message.received',
        payload: {
          from: { phone_number: '+12125551234' },
          to: [{ phone_number: '+15551234567' }],
          text,
        },
      },
    }),
  })
}

beforeEach(() => {
  h.state.messageInserts.length = 0
  h.state.existingConvo = null
})

describe('Telnyx webhook chatbot flow — sms_conversation_messages inserts carry tenant_id', () => {
  it('stamps tenant_id on both inserts when creating a new conversation (inbound + greeting)', async () => {
    const res = await POST(makeRequest('hello there') as never)
    expect(res.status).toBe(200)

    expect(h.state.messageInserts).toHaveLength(2)
    for (const insert of h.state.messageInserts) {
      expect(insert.tenant_id).toBe(TENANT_ID)
    }
  })

  it('stamps tenant_id on both inserts for an ongoing conversation (inbound + AI reply)', async () => {
    h.state.existingConvo = { id: 'convo-existing-1', client_id: null, name: null }

    const res = await POST(makeRequest('a follow-up message') as never)
    expect(res.status).toBe(200)

    expect(h.state.messageInserts).toHaveLength(2)
    for (const insert of h.state.messageInserts) {
      expect(insert.tenant_id).toBe(TENANT_ID)
    }
  })
})
