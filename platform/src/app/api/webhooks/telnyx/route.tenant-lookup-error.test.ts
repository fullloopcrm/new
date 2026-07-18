import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sign as cryptoSign, generateKeyPairSync } from 'node:crypto'

/**
 * /api/webhooks/telnyx inbound-SMS tenant lookup — masked-DB-error fix.
 *
 * BUG (fixed here): the phone-number-based tenant resolver
 * (`.or('telnyx_phone.eq.<to>,sms_number.eq.<to>')`) only destructured
 * `data`, discarding `error`. A genuine DB failure looked identical to "no
 * tenant owns this number" and fell into the same `if (!tenant) return
 * { received: true }` no-op — every inbound text (STOP/START TCPA compliance
 * replies, booking confirmations, the Selena AI conversation) silently
 * vanished with zero error surfaced for the length of the outage, instead of
 * failing loud so Telnyx's own delivery-retry policy could redeliver once the
 * DB recovered. Same masked-error class already fixed across
 * tenant.ts/tenant-lookup.ts/tenant-query.ts/domains.ts/tenant-site.ts and
 * the 6 slug-resolver-twins.
 *
 * FIX: check `error` explicitly and throw (uncaught -> 500, not a silent
 * 200 "received: true") instead of discarding it.
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

function chainable(result: unknown) {
  const obj: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit', 'update', 'insert', 'is']
  for (const m of methods) obj[m] = vi.fn(() => obj)
  obj.single = vi.fn(async () => ({ data: null, error: null }))
  obj.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            or: () => ({
              order: () => ({
                limit: async () => ({ data: null, error: { message: 'connection reset' } }),
              }),
            }),
          }),
        }
      }
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
})

function stopBody(to: string, from = '+15550001111') {
  return JSON.stringify({ data: { event_type: 'message.received', payload: { from: { phone_number: from }, to: [{ phone_number: to }], text: 'STOP' } } })
}

describe('telnyx inbound-SMS tenant lookup — masked DB error', () => {
  it('a genuine DB failure on the tenant-by-phone lookup surfaces loud (500), not a silent "received: true"', async () => {
    await expect(POST(req(stopBody('+15559990000')))).rejects.toThrow('TELNYX_INBOUND_TENANT_LOOKUP_ERROR')
  })
})
