import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regression: GET /api/webhooks/telegram is a manual diagnostic route (not a
 * real Telegram webhook target — Telegram never calls GET). It had zero auth,
 * so any unauthenticated internet caller could hit it to (1) trigger a real
 * outbound Telegram message to the owner's chat and (2) read owner_chat_id +
 * bot_token_len back in plaintext JSON. Fix: gate behind requireAdmin().
 */

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: requireAdminMock,
}))

const sendTelegramMock = vi.fn(async () => ({ ok: true, status: 200, body: '{}' }))
vi.mock('@/lib/telegram', () => ({
  sendTelegram: sendTelegramMock,
}))

vi.mock('@/lib/telegram-webhook-auth', () => ({
  verifyTelegramWebhook: vi.fn(() => ({ ok: true })),
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'reply', toolsCalled: [] })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve(undefined) }),
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({ limit: async () => ({ data: [] }) }),
          }),
        }),
      }),
    }),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
  process.env.TELEGRAM_OWNER_CHAT_ID = '999999'
})

describe('GET /api/webhooks/telegram', () => {
  it('rejects unauthenticated callers before sending or leaking anything', async () => {
    requireAdminMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    )

    const { GET } = await import('./route')
    const res = await GET()

    expect(res.status).toBe(401)
    expect(sendTelegramMock).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.owner_chat_id).toBeUndefined()
    expect(body.bot_token_len).toBeUndefined()
  })

  it('allows an authenticated admin through to the diagnostic send', async () => {
    requireAdminMock.mockResolvedValue(null)

    const { GET } = await import('./route')
    const res = await GET()

    expect(res.status).toBe(200)
    expect(sendTelegramMock).toHaveBeenCalledTimes(1)
    const body = await res.json()
    expect(body.owner_chat_id).toBe('999999')
  })
})
