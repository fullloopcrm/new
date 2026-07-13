/**
 * WITNESS test for deploy-prep/telnyx-sms-verify-killswitch-guard-spec.md
 * Part 1 (P2, now APPLIED): `telnyx/route.ts` had no rate limit of its own on
 * `message.received` — the Telnyx signature check was the ONLY throttle, so
 * the moment `TELNYX_WEBHOOK_VERIFY=off` is set (local dev, break-glass, or
 * misconfig), the endpoint became unauthenticated AND unthrottled, and could
 * drive unbounded Anthropic-agent + Telnyx spend. This proves the fix: a
 * `rateLimitDb` ceiling now runs regardless of verify state.
 *
 * Uses `TELNYX_WEBHOOK_VERIFY=off` throughout (verify off, worst case) so the
 * rate limit is proven to be the ONLY remaining backstop, matching the gap
 * the spec describes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted so state exists before the (hoisted) vi.mock factories read it.
const { sendSMS, rateLimitDb, rlState } = vi.hoisted(() => {
  const rlState = new Map<string, number>()
  return {
    sendSMS: vi.fn().mockResolvedValue({ ok: true }),
    rlState,
    rateLimitDb: vi.fn(async (bucketKey: string, maxRequests: number) => {
      const current = rlState.get(bucketKey) ?? 0
      if (current >= maxRequests) return { allowed: false, remaining: 0 }
      rlState.set(bucketKey, current + 1)
      return { allowed: true, remaining: maxRequests - current - 1 }
    }),
  }
})

function resultForTable(table: string): unknown {
  switch (table) {
    case 'tenants':
      return {
        data: [
          {
            id: 't1',
            name: 'NYC Maid',
            telnyx_api_key: 'test-key',
            telnyx_phone: '+19998887777',
            owner_phone: '+12120000000',
          },
        ],
      }
    case 'clients':
      return { data: { id: 'c1', name: 'Jane' } }
    case 'team_members':
      return { data: null }
    case 'processed_webhook_events':
      // Every call is a fresh (unused) message id in this test — never a
      // dedupe hit — so the rate limiter is what's under test, not dedupe.
      return { data: null, error: null }
    default:
      return { data: null, error: null }
  }
}

function makeChainableSupabase() {
  let table = ''
  const proxy: unknown = new Proxy(function () {} as unknown as object, {
    get(_t, prop) {
      if (prop === 'then') {
        const result = resultForTable(table)
        return (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled)
      }
      return (...args: unknown[]) => {
        if (prop === 'from') table = String(args[0])
        return proxy
      }
    },
  })
  return proxy
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeChainableSupabase() }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn().mockReturnValue(false) }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn() }))

import { POST } from './telnyx/route'

function inboundStop(messageId: string, from = '+15551234567'): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify({
      data: {
        id: `telnyx_evt_${messageId}`,
        event_type: 'message.received',
        payload: {
          id: messageId,
          from: { phone_number: from },
          to: [{ phone_number: '+19998887777' }],
          text: 'STOP',
        },
      },
    }),
  })
}

function deliveryStatus(msgId: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: { id: `telnyx_evt_status_${msgId}`, event_type: 'message.delivered', payload: { id: msgId } },
    }),
  })
}

describe('telnyx message.received rate limit (P2 killswitch-spec Part 1, APPLIED)', () => {
  beforeEach(() => {
    sendSMS.mockClear()
    rateLimitDb.mockClear()
    rlState.clear()
    process.env.TELNYX_WEBHOOK_VERIFY = 'off'
  })

  it('allows the first 10 inbound messages from one sender, then 429s the 11th', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await POST(inboundStop(`msg_${i}`))
      expect(res.status).toBe(200)
    }
    expect(sendSMS).toHaveBeenCalledTimes(10)

    const eleventh = await POST(inboundStop('msg_10'))
    expect(eleventh.status).toBe(429)
    expect(await eleventh.json()).toMatchObject({ error: 'rate_limited' })

    // The throttled request never reached sendSMS (agent/reply path not invoked).
    expect(sendSMS).toHaveBeenCalledTimes(10)
  })

  it('never rate-limits delivery-status events (message.sent/delivered/failed)', async () => {
    for (let i = 0; i < 100; i++) {
      const res = await POST(deliveryStatus(`d_${i}`))
      expect(res.status).toBe(200)
    }
    // Delivery-status path returns before the rate limiter is ever called.
    expect(rateLimitDb).not.toHaveBeenCalled()
  })

  it('scopes the limit per-sender — a different sender is unaffected by another sender being throttled', async () => {
    for (let i = 0; i < 10; i++) {
      await POST(inboundStop(`a_${i}`, '+15551234567'))
    }
    const blocked = await POST(inboundStop('a_10', '+15551234567'))
    expect(blocked.status).toBe(429)

    const otherSender = await POST(inboundStop('b_0', '+15559998888'))
    expect(otherSender.status).toBe(200)
  })
})
