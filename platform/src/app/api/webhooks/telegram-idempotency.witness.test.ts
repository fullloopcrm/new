/**
 * REGRESSION TEST — was a WITNESS test documenting the bug from audit finding
 * #3 (`telegram/route.ts` never read `update_id`, so it had NO replay dedupe;
 * Telegram redelivers any update on a non-2xx/timeout, reprocessing it and
 * re-sending the bot's reply — on an allowlisted chat that means re-running
 * the AI agent). Now that `claimWebhookEvent('telegram', `owner:${update_id}`)`
 * is wired in at the top of `POST` (see
 * deploy-prep/webhook-dedupe-helper-design.md), this asserts the fix via the
 * shortest side-effecting branch (the "This bot is private." reply), which
 * needs no agent/convo mocking — the claim sits above that branch too.
 *
 * No route edits beyond the dedupe wiring. Drives the real POST handler twice
 * with an identical update (same update_id).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted so the spy exists before the (hoisted) vi.mock factory reads it.
const { sendTelegram } = vi.hoisted(() => ({ sendTelegram: vi.fn().mockResolvedValue({ ok: true }) }))

vi.mock('@/lib/telegram', () => ({ sendTelegram }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))

// Simulate the real UNIQUE(provider, event_id) constraint on
// processed_webhook_events with an in-memory claimed set.
const claimed = new Set<string>()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table === 'processed_webhook_events') {
        return {
          insert(payload: { provider: string; event_id: string }) {
            const key = `${payload.provider}:${payload.event_id}`
            if (claimed.has(key)) {
              return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } })
            }
            claimed.add(key)
            return Promise.resolve({ data: null, error: null })
          },
        }
      }
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

describe('telegram update idempotency (FIXED: claimWebhookEvent wired in)', () => {
  beforeEach(() => {
    sendTelegram.mockClear()
    claimed.clear()
  })

  it('replies once, then dedupes a replay of the SAME update_id', async () => {
    const first = await POST(update(42))
    const second = await POST(update(42)) // identical update_id — a true replay

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toMatchObject({ deduped: true })

    // The fix: the replay is deduped before the "This bot is private." reply
    // fires again — only one outbound Telegram send total.
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('still processes a different update_id normally', async () => {
    const first = await POST(update(43))
    const second = await POST(update(44))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    expect(sendTelegram).toHaveBeenCalledTimes(2)
  })
})
