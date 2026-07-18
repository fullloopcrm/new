import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * Telegram resends the SAME update_id if this route doesn't respond 200
 * promptly (confirmed via Telegram's webhook docs — retries start quickly,
 * back off to a few minutes). This route awaits a full Selena round-trip
 * before responding, with no dedup key — a redelivery re-ran the whole
 * pipeline, including a second real outbound Telegram send to Jeff. Fix:
 * insert-first-claim on telegram_webhook_updates(dedup_key), 23505 on the
 * claim short-circuits as an idempotent no-op before any side effect.
 */

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))

const askSelena = vi.fn().mockResolvedValue({ text: 'ok reply', toolsCalled: [] })
vi.mock('@/lib/selena/agent', () => ({ askSelena: (...args: unknown[]) => askSelena(...args) }))

const sendTelegram = vi.fn().mockResolvedValue({ ok: true, status: 200, body: '{}' })
vi.mock('@/lib/telegram', () => ({ sendTelegram: (...args: unknown[]) => sendTelegram(...args) }))

const OWNER_CHAT_ID = 999999

function update(updateId: number | undefined, text: string) {
  const body = JSON.stringify({
    ...(updateId !== undefined ? { update_id: updateId } : {}),
    message: { chat: { id: OWNER_CHAT_ID }, text },
  })
  return new Request('http://x/api/webhooks/telegram', { method: 'POST', body })
}

let POST: typeof import('./route').POST

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  delete process.env.TELEGRAM_WEBHOOK_SECRET
  process.env.TELEGRAM_OWNER_CHAT_ID = String(OWNER_CHAT_ID)
  h.fake = createFakeSupabase({ sms_conversations: [], sms_conversation_messages: [], notifications: [] })
  h.fake!._addUniqueConstraint('telegram_webhook_updates', 'dedup_key')
  ;({ POST } = await import('./route'))
})

describe('POST /api/webhooks/telegram — redelivered update dedup', () => {
  it('a redelivered update (same update_id) does not re-invoke Selena or re-send to Telegram', async () => {
    const first = await POST(update(555, 'what is the health of nycmaid'))
    expect((await first.json()).action).toBeUndefined()
    expect(askSelena).toHaveBeenCalledTimes(1)
    expect(sendTelegram).toHaveBeenCalledTimes(1)

    const redelivery = await POST(update(555, 'what is the health of nycmaid'))
    const redeliveryBody = await redelivery.json()

    expect(redeliveryBody.action).toBe('duplicate_delivery')
    // The real bug: without the claim, this second call would re-run Selena
    // (a fresh, possibly different LLM reply) and send it to Jeff again.
    expect(askSelena).toHaveBeenCalledTimes(1)
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('two different update ids both process normally', async () => {
    await POST(update(1, 'first message'))
    await POST(update(2, 'second message'))

    expect(askSelena).toHaveBeenCalledTimes(2)
    expect(sendTelegram).toHaveBeenCalledTimes(2)
  })

  it('an update with no update_id (malformed/legacy payload) still processes — dedup is best-effort, not a hard requirement', async () => {
    await POST(update(undefined, 'hello'))
    expect(askSelena).toHaveBeenCalledTimes(1)
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })
})
