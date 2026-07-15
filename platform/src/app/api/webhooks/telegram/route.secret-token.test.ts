import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/webhooks/telegram (platform owner bot) had NO signature/secret
 * verification — only a body-supplied chat ID allowlist, which an attacker
 * can forge in the POST payload itself. This locks in:
 *   - TELEGRAM_WEBHOOK_SECRET set + missing/wrong header => 401, never
 *     touches askSelena (fail-closed)
 *   - TELEGRAM_WEBHOOK_SECRET set + correct header => passes verification
 *   - TELEGRAM_WEBHOOK_SECRET unset => soft-gated fail-open (pre-activation):
 *     enforcement only kicks in once a secret is configured AND every live
 *     webhook has been re-registered with Telegram's secret_token param —
 *     see deploy-prep/telegram-webhook-secret-activation.md
 */

const askSelena = vi.fn()
vi.mock('@/lib/selena/agent', () => ({ askSelena: (...args: unknown[]) => askSelena(...args) }))

const sendTelegram = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, body: '' }))
vi.mock('@/lib/telegram', () => ({ sendTelegram: (...args: unknown[]) => sendTelegram(...args) }))

const insertConversationMessage = vi.fn()
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: (...args: unknown[]) => insertConversationMessage(...args) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => Promise.resolve({ data: null, error: null }),
      select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }),
    }),
  },
}))

function req(opts: { body?: object; secretHeader?: string | null } = {}): Request {
  return {
    json: async () => opts.body ?? {},
    headers: { get: (name: string) => (name.toLowerCase() === 'x-telegram-bot-api-secret-token' ? (opts.secretHeader ?? null) : null) },
  } as unknown as Request
}

beforeEach(() => {
  vi.resetModules()
  askSelena.mockReset()
  sendTelegram.mockClear()
  insertConversationMessage.mockClear()
  process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token'
  process.env.TELEGRAM_OWNER_CHAT_ID = '12345'
})

describe('telegram global webhook — secret token verification', () => {
  it('secret configured, header missing => 401, never processes the update', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'shh-secret'
    const { POST } = await import('./route')

    const res = await POST(req({ body: { message: { chat: { id: 12345 }, text: 'hi' } } }))

    expect(res.status).toBe(401)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('secret configured, wrong header => 401, never processes the update', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'shh-secret'
    const { POST } = await import('./route')

    const res = await POST(req({ body: { message: { chat: { id: 12345 }, text: 'hi' } }, secretHeader: 'attacker-guess' }))

    expect(res.status).toBe(401)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('secret configured, correct header => passes verification and reaches business logic', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'shh-secret'
    const { POST } = await import('./route')

    const res = await POST(req({ body: {}, secretHeader: 'shh-secret' }))

    expect(res.status).toBe(200)
    expect((await res.json()).skip).toBe('no_chat_or_text')
  })

  it('secret NOT configured => soft-gated fail-open (pre-activation), reaches business logic', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
    const { POST } = await import('./route')

    const res = await POST(req({ body: {} }))

    // route.ts only enforces verifyTelegramSecret when TELEGRAM_WEBHOOK_SECRET
    // is configured (soft-gate until every live webhook is re-registered with
    // secret_token — see deploy-prep/telegram-webhook-secret-activation.md).
    // Unconfigured secret therefore still reaches business logic instead of 401ing.
    expect(res.status).toBe(200)
    expect((await res.json()).skip).toBe('no_chat_or_text')
  })
})
