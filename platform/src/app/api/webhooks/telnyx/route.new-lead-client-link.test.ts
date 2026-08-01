import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'node:crypto'

/**
 * Telnyx inbound-SMS webhook — new-lead conversation must be linked to the
 * client record createLeadAndEnterPipeline just created.
 *
 * Real bug found live 2026-08-01 (ai-01 re-check): a brand-new lead's FIRST
 * inbound SMS creates a real `clients` row via createLeadAndEnterPipeline
 * (see route.lead-creation.test.ts), but the sms_conversations row created
 * moments later in the chatbot block was still writing `client_id:
 * client?.id || null` — `client` is the stale pre-creation lookup (always
 * null for a genuinely new sender), so the new lead's id was dropped on the
 * floor. Nothing ever backfills sms_conversations.client_id later, so the
 * conversation is permanently orphaned: every client-facing Yinez tool
 * (lookup_bookings, reschedule_booking, cancel_booking, confirm_payment,
 * check_payment, send_pin, resend_confirmation, update_account — all of
 * core-tools-account.ts / core-tools-schedule.ts hard-require
 * sms_conversations.client_id) fails with "No account" for the rest of that
 * conversation's life, even though the client genuinely exists. Confirmed
 * live in prod audit_logs + a direct clients/sms_conversations cross-check:
 * 34 conversations in the trailing 30 days had client_id null despite a
 * real, phone-matching clients row existing.
 *
 * This test proves the fix: the sms_conversations insert in the chatbot
 * block now falls back to newLeadClientId, same as the notification insert
 * a few lines above it already did.
 */

const createLeadAndEnterPipeline = vi.hoisted(() => vi.fn(async () => ({ clientId: 'new-client-99', dealId: 'new-deal-1', wasExistingClient: false })))
vi.mock('@/lib/lead-intake', () => ({ createLeadAndEnterPipeline }))

const tenantRow = {
  id: 'tid-1', name: 'Test Tenant',
  telnyx_api_key: 'tk_live_test', telnyx_phone: '+15550001111',
  owner_phone: null, timezone: 'America/New_York',
  telegram_bot_token: null, telegram_chat_id: null,
}

let insertedConversations: Array<Record<string, unknown>> = []

function makeChain(table: string) {
  const eqs: Record<string, unknown> = {}
  let pendingInsert: Record<string, unknown> | null = null

  const resolveList = () => {
    if (table === 'tenants') return { data: [tenantRow] }
    if (table === 'clients') return { data: [] } // unknown sender — no existing client
    if (table === 'team_members') return { data: [] }
    return { data: [] }
  }
  const resolveOne = () => {
    if (table === 'clients') return { data: null, error: null }
    if (table === 'team_members') return { data: null, error: null }
    if (table === 'sms_conversations') return { data: null, error: null } // no existing active convo
    return { data: null, error: null }
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: (data: Record<string, unknown>) => {
      pendingInsert = data
      if (table === 'sms_conversations') insertedConversations.push(data)
      return chain
    },
    update: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => resolveOne(),
    single: async () => {
      if (table === 'sms_conversations' && pendingInsert) {
        return { data: { id: 'convo-1', client_id: pendingInsert.client_id ?? null, name: pendingInsert.name ?? null }, error: null }
      }
      return { data: null, error: { code: 'PGRST116' } }
    },
    then: (resolve: (v: unknown) => void) => resolve(resolveList()),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => makeChain(t) } }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({
    chatbot_enabled: true,
    sms_reply_enabled: true,
    auto_respond_leads: true,
    chatbot_greeting: 'Hi! Thanks for reaching out.',
  })),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn(() => false), NYCMAID_TENANT_ID: '00000000-0000-0000-0000-000000000001' }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn(async () => null) }))
vi.mock('@/lib/review-engine', () => ({ handleReviewRating: vi.fn(async () => null) }))
vi.mock('@/lib/feedback-reply', () => ({ handleFeedbackReply: vi.fn(async () => null) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))
vi.mock('@/lib/notify', () => ({ sendTenantTelegram: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

import { POST } from './route'

function signWith(body: string, key: KeyObject, tsSeconds: number): Record<string, string> {
  const ts = String(tsSeconds)
  const sig = cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), key).toString('base64')
  return { 'telnyx-timestamp': ts, 'telnyx-signature-ed25519': sig }
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
const RAW_PUB = spki.subarray(spki.length - 32).toString('base64')
const freshTs = (): number => Math.floor(Date.now() / 1000)

function inboundSms(from: string, text = 'hi, do you service Astoria?'): string {
  return JSON.stringify({
    data: {
      event_type: 'message.received',
      payload: { from: { phone_number: from }, to: [{ phone_number: '+15550001111' }], text },
    },
  })
}

function makeRequest(body: string, headers: Record<string, string>): Request {
  return new Request('http://localhost/api/webhooks/telnyx', { method: 'POST', headers: new Headers(headers), body })
}

async function post(body: string) {
  return POST(makeRequest(body, signWith(body, privateKey, freshTs())) as never)
}

beforeEach(() => {
  process.env.TELNYX_PUBLIC_KEY = RAW_PUB
  delete process.env.TELNYX_WEBHOOK_VERIFY
  insertedConversations = []
  createLeadAndEnterPipeline.mockClear()
})

describe('telnyx inbound SMS — new-lead conversation links to the just-created client', () => {
  it('a brand-new lead\'s first inbound SMS creates a conversation with client_id set (not null)', async () => {
    const res = await post(inboundSms('+19175551234'))
    expect(res.status).toBe(200)
    expect(createLeadAndEnterPipeline).toHaveBeenCalledTimes(1)
    expect(insertedConversations.length).toBe(1)
    // The bug: this used to be null (or undefined), permanently orphaning the
    // conversation from the client createLeadAndEnterPipeline just created.
    expect(insertedConversations[0].client_id).toBe('new-client-99')
  })
})
