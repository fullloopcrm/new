import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'node:crypto'

/**
 * Confirmed live 2026-07-28: the 8400/9030 alias fix (2026-07-27, for real
 * customer texts sent directly to the branded number) also let through
 * Telnyx's own forward-leg ECHO of the tenant's outbound SMS — an internal
 * "30-Min Heads Up" ops alert sent from the mainline showed up as a second
 * inbound event between the alias legs, got treated as a real client
 * message, and Yinez tried to act on it.
 *
 * This proves the fix: an aliased `to` whose `from` is the tenant's own
 * mainline or either alias number is dropped before any tenant/client
 * processing runs; a genuine outside sender on the same aliased `to` still
 * resolves normally.
 */

const { NYCMAID_TENANT_ID, MAINLINE, ALIAS_A, ALIAS_B } = vi.hoisted(() => ({
  NYCMAID_TENANT_ID: '00000000-0000-0000-0000-000000000001',
  MAINLINE: '+18883164019',
  ALIAS_A: '+12122028400',
  ALIAS_B: '+12122029030',
}))

const inserts = vi.hoisted(() => ({ notifications: [] as Array<Record<string, unknown>> }))

const mock = vi.hoisted(() => {
  function makeChain(table: string): Record<string, unknown> {
    let eqCol: string | undefined
    let eqVal: unknown
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (row: Record<string, unknown>) => {
        if (table === 'notifications') inserts.notifications.push(row)
        return { ...chain, then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
      },
      update: () => chain,
      order: () => chain,
      limit: () => chain,
      eq: (col: string, val: unknown) => {
        eqCol = col
        eqVal = val
        return chain
      },
      ilike: (col: string, val: unknown) => {
        eqCol = col
        eqVal = val
        return chain
      },
      is: () => chain,
      single: async () => resolveTenant(table, eqCol, eqVal, 'single'),
      maybeSingle: async () => resolveTenant(table, eqCol, eqVal, 'maybeSingle'),
      then: (resolve: (v: unknown) => void) => resolve(resolveTenantList(table, eqCol, eqVal)),
    }
    return chain
  }

  function resolveTenant(table: string, col: string | undefined, val: unknown, _mode: string) {
    if (table === 'tenants' && col === 'id' && val === NYCMAID_TENANT_ID) {
      return { data: { id: NYCMAID_TENANT_ID, name: 'The NYC Maid', telnyx_api_key: 'key', telnyx_phone: MAINLINE, owner_phone: '+12122029220' }, error: null }
    }
    return { data: null, error: null }
  }

  function resolveTenantList(table: string, col: string | undefined, val: unknown) {
    if (table === 'tenants' && col === 'telnyx_phone') return { data: [], error: null } // no direct match — forces the alias path
    return { data: [], error: null }
  }

  return { supabaseAdmin: { from: (table: string) => makeChain(table) } }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mock.supabaseAdmin }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn((id: string) => id === NYCMAID_TENANT_ID), NYCMAID_TENANT_ID }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn(async () => null) }))
vi.mock('@/lib/feedback-reply', () => ({ handleFeedbackReply: vi.fn(async () => null) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-time', () => ({ getTenantTimezone: () => 'America/New_York' }))
vi.mock('@/lib/recurring', () => ({ nowNaiveET: () => '2026-07-28T00:00:00' }))
vi.mock('@/lib/notify', () => ({ sendTenantTelegram: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/review-engine', () => ({ handleReviewRating: vi.fn(async () => null) }))
vi.mock('@/lib/webhook-verify', () => ({ verifyTelnyx: vi.fn(() => ({ valid: true })) }))

import { POST } from './route'

beforeEach(() => {
  inserts.notifications.length = 0
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

describe('telnyx webhook — self-echo guard on aliased branded numbers', () => {
  it('drops an aliased-`to` event whose `from` is the tenant\'s own mainline (the ops-alert echo)', async () => {
    await POST(req(messageReceivedEvent(MAINLINE, ALIAS_B, '30-MIN HEADS UP...')) as never)
    expect(inserts.notifications.some((n) => n.type === 'sms_received')).toBe(false)
  })

  it('drops an aliased-`to` event whose `from` is the OTHER alias leg (alias-to-alias echo)', async () => {
    await POST(req(messageReceivedEvent(ALIAS_A, ALIAS_B, '✓ Payment request SENT...')) as never)
    expect(inserts.notifications.some((n) => n.type === 'sms_received')).toBe(false)
  })

  it('still accepts a genuine outside sender texting the aliased number directly', async () => {
    await POST(req(messageReceivedEvent('+19148156718', ALIAS_A, 'Hi, interested in weekly cleaning')) as never)
    expect(inserts.notifications.some((n) => n.type === 'sms_received')).toBe(true)
  })
})
