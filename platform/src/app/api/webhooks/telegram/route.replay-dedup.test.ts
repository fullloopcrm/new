import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * W4 — regression lock: a Telegram redelivery of the same update_id (its
 * documented retry-on-slow-ack behavior) must not re-run the owner agent a
 * second time. Without this, a retried delivery could re-trigger a
 * side-effecting owner tool call (refund, broadcast, cron trigger) twice for
 * one real instruction. See telegram-webhook-dedup.ts.
 */

const h = vi.hoisted(() => {
  const state = { askSelenaCalls: 0 }
  const seenUpdateIds = new Set<number>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeBuilder(table: string): any {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => Promise.resolve({ data: [], error: null }),
      insert: (row: Record<string, unknown>) => {
        if (table === 'telegram_webhook_events') {
          const updateId = row.update_id as number
          if (seenUpdateIds.has(updateId)) {
            return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
          }
          seenUpdateIds.add(updateId)
          return Promise.resolve({ error: null })
        }
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
          then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
        }
      },
      then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { state, supabaseAdmin, seenUpdateIds }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/telegram-webhook-auth', () => ({
  verifyTelegramWebhook: vi.fn(() => ({ ok: true })),
}))
vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '{}' })),
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => {
    h.state.askSelenaCalls += 1
    return { text: 'reply', toolsCalled: [] }
  }),
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

beforeEach(() => {
  vi.clearAllMocks()
  h.state.askSelenaCalls = 0
  h.seenUpdateIds.clear()
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
  process.env.TELEGRAM_OWNER_CHAT_ID = '999999'
})

function makeRequest(updateId: number): Request {
  return new Request('http://localhost/api/webhooks/telegram', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ update_id: updateId, message: { chat: { id: 999999 }, text: 'refund booking bk-1 $50' } }),
  })
}

describe('POST /api/webhooks/telegram — redelivery dedup', () => {
  it('runs the agent once for a fresh update_id', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest(111))
    expect(res.status).toBe(200)
    expect(h.state.askSelenaCalls).toBe(1)
  })

  it('skips a redelivered update_id and does not re-run the agent', async () => {
    const { POST } = await import('./route')

    const first = await POST(makeRequest(222))
    expect((await first.json()).duplicate).toBeUndefined()

    const retry = await POST(makeRequest(222))
    const retryJson = await retry.json()

    expect(retry.status).toBe(200)
    expect(retryJson.duplicate).toBe(true)
    expect(h.state.askSelenaCalls).toBe(1)
  })

  it('treats different update_ids as independent messages', async () => {
    const { POST } = await import('./route')
    await POST(makeRequest(301))
    await POST(makeRequest(302))
    expect(h.state.askSelenaCalls).toBe(2)
  })
})
