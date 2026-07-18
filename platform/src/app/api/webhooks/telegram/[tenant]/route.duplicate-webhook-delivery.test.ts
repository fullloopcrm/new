import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * Telegram resends the SAME update_id if this route doesn't respond 200
 * promptly. This per-tenant route has zero dedup key, same class as the
 * sibling owner-bot and Jefe-bot fixes — a redelivery re-ran the whole
 * agent pipeline for a tenant's own owner chat, including a second real
 * outbound Telegram send. Fix: insert-first-claim on
 * telegram_webhook_updates(dedup_key), scoped per tenant since update_id
 * is only unique within one bot token's own sequence (a different
 * tenant's bot can independently reuse the same number).
 */

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))

vi.mock('@/lib/secret-crypto', () => ({
  decryptSecret: (v: string) => `decrypted-${v}`,
}))

const askSelena = vi.fn().mockResolvedValue({ text: 'ok reply', toolsCalled: [] })
vi.mock('@/lib/selena/agent', () => ({ askSelena: (...args: unknown[]) => askSelena(...args) }))

const sendTelegram = vi.fn().mockResolvedValue({ ok: true, status: 200, body: '{}' })
vi.mock('@/lib/telegram', () => ({ sendTelegram: (...args: unknown[]) => sendTelegram(...args) }))

import { POST } from './route'

const TENANT_ID = 'tenant-1'
const CHAT_ID = 555
const params = () => Promise.resolve({ tenant: 'acme' })

function update(updateId: number | undefined, text: string) {
  const body = JSON.stringify({
    ...(updateId !== undefined ? { update_id: updateId } : {}),
    message: { chat: { id: CHAT_ID }, text },
  })
  return new Request('http://x/api/webhooks/telegram/acme', { method: 'POST', body })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.fake = createFakeSupabase({
    tenants: [
      { id: TENANT_ID, slug: 'acme', telegram_bot_token: 'encrypted-token', telegram_chat_id: String(CHAT_ID) },
    ],
    sms_conversations: [],
    sms_conversation_messages: [],
    notifications: [],
  })
  h.fake!._addUniqueConstraint('telegram_webhook_updates', 'dedup_key')
})

describe('POST /api/webhooks/telegram/[tenant] — redelivered update dedup', () => {
  it('a redelivered update (same update_id) does not re-invoke Selena or re-send to Telegram', async () => {
    const first = await POST(update(321, 'hello'), { params: params() })
    expect((await first.json()).action).toBeUndefined()
    expect(askSelena).toHaveBeenCalledTimes(1)
    expect(sendTelegram).toHaveBeenCalledTimes(1)

    const redelivery = await POST(update(321, 'hello'), { params: params() })
    const redeliveryBody = await redelivery.json()

    expect(redeliveryBody.action).toBe('duplicate_delivery')
    expect(askSelena).toHaveBeenCalledTimes(1)
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('two different update ids both process normally', async () => {
    await POST(update(1, 'first'), { params: params() })
    await POST(update(2, 'second'), { params: params() })

    expect(askSelena).toHaveBeenCalledTimes(2)
  })

  it('the same update_id number for a DIFFERENT tenant is not treated as a duplicate — scoped per tenant, not global', async () => {
    h.fake!._seed('tenants', [
      { id: 'tenant-2', slug: 'beta', telegram_bot_token: 'encrypted-token-2', telegram_chat_id: String(CHAT_ID) },
    ])

    const acme = await POST(update(42, 'hi'), { params: params() })
    expect((await acme.json()).action).toBeUndefined()

    const beta = await POST(update(42, 'hi'), { params: Promise.resolve({ tenant: 'beta' }) })
    expect((await beta.json()).action).toBeUndefined()

    expect(askSelena).toHaveBeenCalledTimes(2)
  })

  it('an update with no update_id (malformed/legacy payload) still processes — dedup is best-effort, not a hard requirement', async () => {
    await POST(update(undefined, 'hello'), { params: params() })
    expect(askSelena).toHaveBeenCalledTimes(1)
  })
})
