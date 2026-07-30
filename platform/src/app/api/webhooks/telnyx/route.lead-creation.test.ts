import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'node:crypto'

/**
 * Telnyx inbound-SMS webhook — unknown-sender lead creation.
 *
 * 2026-07-30 pipeline trace found: an SMS from a phone matching neither an
 * existing client nor a team member created ONLY an admin notification — no
 * client, no portal_lead, no sales deal. A prospect texting in cold was
 * invisible to Sales unless an admin happened to notice the alert. This
 * suite proves the fix is wired: `createLeadAndEnterPipeline` (the same
 * helper proven in chat/route.lead-creation.test.ts) fires for a genuinely
 * unknown sender, and does NOT fire for a known client or team member.
 *
 * lead-intake itself is mocked here (not re-exercised) — its correctness is
 * already proven directly; this file only proves the WIRING into this route.
 */

const createLeadAndEnterPipeline = vi.hoisted(() => vi.fn(async () => ({ clientId: 'new-client-1', dealId: 'new-deal-1', wasExistingClient: false })))
vi.mock('@/lib/lead-intake', () => ({ createLeadAndEnterPipeline }))

let clientsSeed: Array<{ id: string; tenant_id: string; phone: string; name: string }>
let membersSeed: Array<{ id: string; tenant_id: string; phone: string; name: string }>
const tenantRow = { id: 'tid-1', name: 'Test Tenant', telnyx_api_key: null, telnyx_phone: '+15550001111', owner_phone: null, timezone: 'America/New_York', telegram_bot_token: null, telegram_chat_id: null }

function makeChain(table: string) {
  const eqs: Record<string, unknown> = {}
  const resolveList = () => {
    if (table === 'tenants') return { data: [tenantRow] }
    if (table === 'clients') return { data: clientsSeed.filter((c) => c.phone === eqs.phone) }
    if (table === 'team_members') return { data: membersSeed.filter((m) => m.phone === eqs.phone) }
    return { data: [] }
  }
  const resolveOne = () => {
    if (table === 'clients') return { data: clientsSeed.find((c) => c.phone === eqs.phone) || null, error: null }
    if (table === 'team_members') return { data: membersSeed.find((m) => m.phone === eqs.phone) || null, error: null }
    return { data: null, error: null }
  }
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
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
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({})) }))
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
  createLeadAndEnterPipeline.mockClear()
})

describe('telnyx inbound SMS — unknown-sender lead creation', () => {
  it('a phone matching neither a client nor a team member creates a real lead', async () => {
    const res = await post(inboundSms('+19175551234'))
    expect(res.status).toBe(200)
    expect(createLeadAndEnterPipeline).toHaveBeenCalledTimes(1)
    expect(createLeadAndEnterPipeline).toHaveBeenCalledWith('tid-1', expect.objectContaining({
      phone: '+19175551234', source: 'sms-inbound',
    }))
  })

  it('a phone matching an existing client does NOT create a duplicate lead', async () => {
    clientsSeed = [{ id: 'c-1', tenant_id: 'tid-1', phone: '+19175551234', name: 'Known Client' }]
    const res = await post(inboundSms('+19175551234'))
    expect(res.status).toBe(200)
    expect(createLeadAndEnterPipeline).not.toHaveBeenCalled()
  })

  it('a phone matching a team member does NOT create a lead', async () => {
    membersSeed = [{ id: 'm-1', tenant_id: 'tid-1', phone: '+19175551234', name: 'Crew Member' }]
    const res = await post(inboundSms('+19175551234'))
    expect(res.status).toBe(200)
    expect(createLeadAndEnterPipeline).not.toHaveBeenCalled()
  })
})
