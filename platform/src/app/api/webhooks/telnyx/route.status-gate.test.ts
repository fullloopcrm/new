import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sign as cryptoSign, generateKeyPairSync } from 'node:crypto'

/**
 * /api/webhooks/telnyx inbound-SMS tenant lookup — tenantServesSite() status gate.
 *
 * Same bug class as every other slug/host/phone-resolved entry point fixed
 * this session (PIN-login, portal/team-portal auth tokens, public site
 * header resolver, the per-tenant Telegram webhook): this resolver looks the
 * tenant up by phone number and never inherited the tenantServesSite()
 * status gate. Without it, a suspended/cancelled/deleted tenant kept
 * auto-confirming bookings and running the full Selena/Yinez AI conversation
 * (with live tool calls) against that tenant's data indefinitely — inbound
 * SMS delivery has no dependency on the tenant's site/dashboard being
 * reachable.
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

type TenantRow = {
  id: string
  name: string
  status: string
  telnyx_api_key: string | null
  telnyx_phone: string | null
  sms_number: string | null
  owner_phone: string | null
}

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

const askSelenaLegacy = vi.fn()
const askYinez = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsChain()
      return chainable({ data: null, error: null })
    },
  },
}))
const sendSMS = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMS(...args) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: (...args: unknown[]) => askSelenaLegacy(...args) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: (...args: unknown[]) => askYinez(...args) }))
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
  sendSMS.mockClear()
  askSelenaLegacy.mockClear()
  askYinez.mockClear()
})

function stopBody(to: string, from = '+15550001111', text = 'STOP') {
  return JSON.stringify({ data: { event_type: 'message.received', payload: { from: { phone_number: from }, to: [{ phone_number: to }], text } } })
}

describe('telnyx inbound-SMS tenant lookup — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'skips a %s tenant — no opt-out processed, no SMS sent',
    async (status) => {
      state.tenants = [
        { id: 'tid-a', name: 'Acme', status, telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15559990000', owner_phone: null },
      ]
      const res = await POST(req(stopBody('+15559990000')))
      const body = await res.json()
      expect(res.status).toBe(200)
      expect(body).toEqual({ received: true, skip: 'tenant_not_active' })
      expect(sendSMS).not.toHaveBeenCalled()
    },
  )

  it.each(['active', 'setup', 'pending'])('still processes a %s tenant\'s STOP reply', async (status) => {
    state.tenants = [
      { id: 'tid-a', name: 'Acme', status, telnyx_api_key: 'acme-key', telnyx_phone: null, sms_number: '+15559990000', owner_phone: null },
    ]
    const res = await POST(req(stopBody('+15559990000')))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.skip).not.toBe('tenant_not_active')
    expect(body.action).toBe('opt_out')
  })
})
