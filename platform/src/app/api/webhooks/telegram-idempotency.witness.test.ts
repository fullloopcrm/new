/**
 * WITNESS TEST — documents CURRENT (buggy) behavior, not desired behavior.
 *
 * Proves audit finding #3: `telegram/route.ts` never reads `update_id`, so it
 * has NO replay dedupe. Telegram redelivers any update on a non-2xx/timeout, so
 * an identical update is reprocessed and the bot re-sends its reply. On an
 * allowlisted chat that means re-running the AI agent; here we show the same
 * missing-dedupe defect via the shortest side-effecting branch (the
 * "This bot is private." reply), which needs no agent/convo mocking.
 *
 * This asserts the duplicate send DOES happen today; it should start FAILING
 * once `claimWebhookEvent('telegram', body.update_id)` is wired in
 * (deploy-prep/webhook-dedupe-helper-design.md).
 *
 * No route edits. Drives the real POST handler twice with an identical update
 * (same update_id).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted so the spy exists before the (hoisted) vi.mock factory reads it.
const { sendTelegram } = vi.hoisted(() => ({ sendTelegram: vi.fn().mockResolvedValue({ ok: true }) }))

vi.mock('@/lib/telegram', () => ({ sendTelegram }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from() {
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
        insert: () => ({ then: (r: (v: unknown) => unknown) => Promise.resolve({}).then(r) }),
      }
    },
  },
}))

import { POST } from './telegram/route'

function update(updateId: number): Request {
  return new Request('http://localhost/api/webhooks/telegram', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      update_id: updateId,
      message: { chat: { id: 999999999 }, text: 'hello' },
    }),
  })
}

describe('telegram update idempotency (WITNESS: currently non-idempotent)', () => {
  beforeEach(() => {
    sendTelegram.mockClear()
  })

  it('reprocesses and re-replies to the SAME update_id on a replay', async () => {
    const first = await POST(update(42))
    const second = await POST(update(42)) // identical update_id — a true replay

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    // The bug: no update_id dedupe → the replay is processed again and the bot
    // sends a second outbound Telegram message.
    expect(sendTelegram).toHaveBeenCalledTimes(2)
  })
})
