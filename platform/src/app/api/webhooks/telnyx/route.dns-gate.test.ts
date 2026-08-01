import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'node:crypto'

/**
 * Telnyx inbound SMS — DNS (do_not_service) gate on the ComHub-feeding
 * chatbot block.
 *
 * 2026-08-01: a do_not_service client must get zero ComHub communications.
 * The AI-chatbot block is what creates sms_conversations/
 * sms_conversation_messages, which the comhub_mirror_sms_message DB trigger
 * mirrors into comhub_messages — so gating that block on DNS is what keeps
 * a DNS client's texts from ever surfacing as a ComHub thread. Proven here
 * via getSettings(): it's the first call inside the gated block, so a DNS
 * client never reaching it proves the whole block was skipped.
 */

vi.mock('@/lib/lead-intake', () => ({ createLeadAndEnterPipeline: vi.fn(async () => ({ clientId: 'x', dealId: null, wasExistingClient: false })) }))

let clientsSeed: Array<{ id: string; tenant_id: string; phone: string; name: string; do_not_service?: boolean }>
let membersSeed: Array<{ id: string; tenant_id: string; phone: string; name: string }>
const tenantRow = { id: 'tid-1', name: 'Test Tenant', telnyx_api_key: '+15550001111', telnyx_phone: '+15550001111', owner_phone: null, timezone: 'America/New_York', telegram_bot_token: null, telegram_chat_id: null }

function makeChain(table: string) {
  const eqs: Record<string, unknown> = {}
  const ilikes: Record<string, unknown> = {}
  const phoneMatches = (seedPhone: string) => {
    if (eqs.phone !== undefined) return seedPhone === eqs.phone
    if (ilikes.phone !== undefined) {
      const pattern = String(ilikes.phone).replace(/%/g, '').replace(/\D/g, '')
      return seedPhone.replace(/\D/g, '').includes(pattern)
    }
    return true
  }
  const resolveList = () => {
    if (table === 'tenants') return { data: [tenantRow] }
    if (table === 'clients') return { data: clientsSeed.filter((c) => phoneMatches(c.phone)) }
    if (table === 'team_members') return { data: membersSeed.filter((m) => phoneMatches(m.phone)) }
    return { data: [] }
  }
  const resolveOne = () => {
    if (table === 'clients') return { data: clientsSeed.find((c) => phoneMatches(c.phone)) || null, error: null }
    if (table === 'team_members') return { data: membersSeed.find((m) => phoneMatches(m.phone)) || null, error: null }
    return { data: null, error: null }
  }
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    ilike: (col: string, val: unknown) => { ilikes[col] = val; return chain },
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => resolveOne(),
    single: async () => ({ data: null, error: { code: 'PGRST116' } }),
    then: (resolve: (v: unknown) => void) => resolve(resolveList()),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => makeChain(t) } }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({})) }))
const getSettings = vi.fn(async (_tenantId: string) => ({ chatbot_enabled: true, sms_reply_enabled: true }))
vi.mock('@/lib/settings', () => ({ getSettings: (tenantId: string) => getSettings(tenantId) }))
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
  clientsSeed = []
  membersSeed = []
  getSettings.mockClear()
})

describe('telnyx inbound SMS — DNS gate on the ComHub-feeding chatbot block', () => {
  it('a do_not_service client never reaches the chatbot/ComHub-mirror block', async () => {
    clientsSeed = [{ id: 'c-dns', tenant_id: 'tid-1', phone: '+19175551234', name: 'DNS Client', do_not_service: true }]
    const res = await post(inboundSms('+19175551234'))
    expect(res.status).toBe(200)
    expect(getSettings).not.toHaveBeenCalled()
  })

  it('CONTROL: a normal client still reaches the chatbot/ComHub-mirror block', async () => {
    clientsSeed = [{ id: 'c-ok', tenant_id: 'tid-1', phone: '+19175551234', name: 'Normal Client', do_not_service: false }]
    const res = await post(inboundSms('+19175551234'))
    expect(res.status).toBe(200)
    expect(getSettings).toHaveBeenCalledTimes(1)
  })
})
