/**
 * REGRESSION TEST — was a WITNESS test documenting the bug from audit finding
 * #3 (`telnyx/route.ts` had no dedupe on the Telnyx message id, so a
 * redelivered inbound SMS re-ran the handler and RE-SENT the outbound reply —
 * real money, customer-facing duplicate). Now that `claimWebhookEvent` is
 * wired in (see deploy-prep/webhook-dedupe-helper-design.md), this asserts the
 * fix: a replayed message id is deduped via `processed_webhook_events` and
 * short-circuits before `sendSMS` runs again.
 *
 * We exercise the STOP/opt-out branch because it is the shortest inbound path
 * that still calls `sendSMS` (the TCPA confirmation) without dragging in the AI
 * agents — the dedupe claim sits above both paths identically.
 *
 * No route edits beyond the dedupe wiring. Drives the real POST handler twice
 * with an identical event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// A chainable, table-routed supabase mock. Every query-builder method returns
// the same thenable proxy; awaiting it resolves to a per-table canned result.
// `processed_webhook_events` is stateful — it simulates the real
// UNIQUE(provider, event_id) constraint so replays get a 23505 on insert.
const claimed = new Set<string>()

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
  let lastInsertPayload: { provider?: string; event_id?: string } | null = null
  const proxy: unknown = new Proxy(function () {} as unknown as object, {
    get(_t, prop) {
      if (prop === 'then') {
        let result: unknown
        if (table === 'processed_webhook_events' && lastInsertPayload) {
          const key = `${lastInsertPayload.provider}:${lastInsertPayload.event_id}`
          if (claimed.has(key)) {
            result = { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          } else {
            claimed.add(key)
            result = { data: null, error: null }
          }
        } else {
          result = resultForTable(table)
        }
        return (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled)
      }
      return (...args: unknown[]) => {
        if (prop === 'from') { table = String(args[0]); lastInsertPayload = null }
        if (prop === 'insert') lastInsertPayload = args[0] as { provider?: string; event_id?: string }
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

function inboundStop(messageId: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: {
        id: 'telnyx_evt_replay_001',
        event_type: 'message.received',
        payload: {
          id: messageId,
          from: { phone_number: '+15551234567' },
          to: [{ phone_number: '+19998887777' }],
          text: 'STOP',
        },
      },
    }),
  })
}

describe('telnyx message.received idempotency (FIXED: claimWebhookEvent wired in)', () => {
  beforeEach(() => {
    sendSMS.mockClear()
    claimed.clear()
    process.env.TELNYX_WEBHOOK_VERIFY = 'off'
  })

  it('sends the outbound confirmation SMS once, then dedupes the replay', async () => {
    const messageId = 'telnyx_msg_replay_001'

    const first = await POST(inboundStop(messageId))
    const second = await POST(inboundStop(messageId))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toMatchObject({ deduped: true })

    // The fix: an identical redelivered inbound SMS is deduped, not re-sent.
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('still processes a different message id normally', async () => {
    const first = await POST(inboundStop('telnyx_msg_a'))
    const second = await POST(inboundStop('telnyx_msg_b'))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    expect(sendSMS).toHaveBeenCalledTimes(2)
  })
})
