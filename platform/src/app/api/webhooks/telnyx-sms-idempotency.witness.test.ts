/**
 * WITNESS TEST — documents CURRENT (buggy) behavior, not desired behavior.
 *
 * Proves audit finding #3: `telnyx/route.ts` handles inbound
 * `message.received` with NO dedupe on the Telnyx message id. A redelivered
 * inbound SMS re-runs the handler and RE-SENDS the outbound reply (real money,
 * customer-facing duplicate).
 *
 * We exercise the STOP/opt-out branch because it is the shortest inbound path
 * that still calls `sendSMS` (the TCPA confirmation) without dragging in the AI
 * agents — the missing dedupe is identical for the agent path. This asserts the
 * duplicate send DOES happen today; it should start FAILING once
 * `claimWebhookEvent` is wired in (deploy-prep/webhook-dedupe-helper-design.md).
 *
 * No route edits. Drives the real POST handler twice with an identical event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// A chainable, table-routed supabase mock. Every query-builder method returns
// the same thenable proxy; awaiting it resolves to a per-table canned result.
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

// vi.hoisted so the spy exists before the (hoisted) vi.mock factory reads it.
const { sendSMS } = vi.hoisted(() => ({ sendSMS: vi.fn().mockResolvedValue({ ok: true }) }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeChainableSupabase() }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
// Stub the heavy agent / settings imports so loading the route is cheap and
// side-effect-free. The STOP path never calls these.
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn().mockReturnValue(false) }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn() }))

import { POST } from './telnyx/route'

function inboundStop(): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: {
        id: 'telnyx_evt_replay_001',
        event_type: 'message.received',
        payload: {
          from: { phone_number: '+15551234567' },
          to: [{ phone_number: '+19998887777' }],
          text: 'STOP',
        },
      },
    }),
  })
}

describe('telnyx message.received idempotency (WITNESS: currently non-idempotent)', () => {
  beforeEach(() => {
    sendSMS.mockClear()
    process.env.TELNYX_WEBHOOK_VERIFY = 'off'
  })

  it('re-sends the outbound confirmation SMS on a replay (duplicate send)', async () => {
    const first = await POST(inboundStop())
    const second = await POST(inboundStop())

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    // The bug: an identical redelivered inbound SMS fires sendSMS a second time.
    expect(sendSMS).toHaveBeenCalledTimes(2)
  })
})
