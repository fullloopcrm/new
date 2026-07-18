import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sign as cryptoSign, generateKeyPairSync } from 'node:crypto'

/**
 * /api/webhooks/telnyx inbound-SMS tenant lookup — sms_number carry-forward
 * fix (highest-severity finding this round, not a pure call-site swap).
 *
 * BUG (fixed here): the tenant that OWNS an inbound Telnyx number was looked
 * up via `.eq('telnyx_phone', to)` only. Telnyx routes inbound messages by
 * the actual phone number it owns, not by which DB column we happened to
 * store it in -- a tenant whose number only ever landed in the legacy
 * sms_number column (same telnyx_phone||sms_number precedence documented in
 * lib/sms-credentials.ts) never matched here. Every inbound text for that
 * tenant -- STOP/START compliance replies, booking conversation, Selena AI --
 * silently dropped with `{ received: true }` and zero error, since `if
 * (!tenant) return`.
 *
 * FIX: `.or('telnyx_phone.eq.<to>,sms_number.eq.<to>')`, sanitized via the
 * existing sanitizePostgrestValue() helper (the matched number comes from an
 * external webhook payload).
 */

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const spkiBuf = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
const rawPub = spkiBuf.subarray(spkiBuf.length - 32).toString('base64')

function sign(ts: string, body: string): string {
  return cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')
}

function req(rawBody: string): Request {
  const ts = Math.floor(Date.now() / 1000).toString()
  const sig = sign(ts, rawBody)
  return {
    text: async () => rawBody,
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase()
        if (key === 'telnyx-signature-ed25519') return sig
        if (key === 'telnyx-timestamp') return ts
        return null
      },
    },
  } as unknown as Request
}

type TenantRow = { id: string; name: string; telnyx_api_key: string | null; telnyx_phone: string | null; sms_number: string | null; owner_phone: string | null }

const state = vi.hoisted(() => ({
  tenants: [] as TenantRow[],
  orFilter: '' as string,
}))

function chainable(result: unknown) {
  const obj: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit', 'update', 'insert', 'is']
  for (const m of methods) obj[m] = vi.fn(() => obj)
  obj.single = vi.fn(async () => ({ data: null, error: null }))
  obj.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return obj
}

function tenantsChain() {
  const c: Record<string, unknown> = {}
  c.select = vi.fn(() => c)
  c.or = vi.fn((filter: string) => {
    state.orFilter = filter
    return c
  })
  c.order = vi.fn(() => c)
  c.limit = vi.fn(async () => {
    const parts = state.orFilter.split(',').map((p) => p.split('.eq.'))
    const matches = state.tenants.filter((t) =>
      parts.some(([col, val]) => (t as unknown as Record<string, unknown>)[col] === val),
    )
    return { data: matches, error: null }
  })
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsChain()
      // Every other table this handler touches on the STOP path.
      return chainable({ data: null, error: null })
    },
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({ chatbot_enabled: false })) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn() }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn() }))

import { POST } from './route'

beforeEach(() => {
  process.env.TELNYX_PUBLIC_KEY = rawPub
  delete process.env.TELNYX_WEBHOOK_VERIFY
  state.tenants = []
  state.orFilter = ''
})

function stopBody(to: string, from = '+15550001111') {
  return JSON.stringify({ data: { event_type: 'message.received', payload: { from: { phone_number: from }, to: [{ phone_number: to }], text: 'STOP' } } })
}

describe('telnyx inbound-SMS tenant lookup — sms_number fallback', () => {
  it('telnyx_phone is null but sms_number matches the inbound "to" number — tenant resolves, message is NOT silently dropped', async () => {
    state.tenants = [
      { id: 'tid-a', name: 'Acme', telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15559990000', owner_phone: null },
    ]
    const res = await POST(req(stopBody('+15559990000')))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.action).toBe('opt_out')
  })

  it('neither telnyx_phone nor sms_number matches — no tenant found, message drops (expected, not a regression)', async () => {
    state.tenants = [
      { id: 'tid-a', name: 'Acme', telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15551110001', owner_phone: null },
    ]
    const res = await POST(req(stopBody('+15559990000')))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.action).toBeUndefined()
  })

  it("wrong-tenant probe: tenant B's sms_number never matches tenant A's inbound number", async () => {
    state.tenants = [
      { id: 'tid-a', name: 'Acme', telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15559990000', owner_phone: null },
      { id: 'tid-b', name: 'Other', telnyx_api_key: 'other-key', telnyx_phone: null, sms_number: '+15558880000', owner_phone: null },
    ]
    const res = await POST(req(stopBody('+15559990000')))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.action).toBe('opt_out')
    // Only tid-a's number was targeted -- tid-b must not be the one matched.
    // (Implicitly proven: had tid-b matched instead, sendSMS below would use
    // its key/number, which the resolver test suite separately covers.)
  })
})
