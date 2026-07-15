/**
 * TELEGRAM WEBHOOK AUTH — /api/webhooks/telegram POST (platform owner bot).
 *
 * Fleet-wide webhook/cron audit finding, 2026-07-13: this route (and its
 * jefe/ and [tenant]/ siblings) authenticated ONLY by comparing message.chat.id
 * from the raw, unsigned POST body against a stored owner chat id. Chat ids
 * aren't secret — anyone who found the URL could forge a body claiming to be
 * the owner and get the full owner-level agent (broadcast SMS, refunds,
 * payment marking, etc, see selena/agent.ts's tool list).
 *
 * Telegram's real anti-forgery mechanism is the secret_token set via
 * setWebhook, echoed back on every real update via
 * X-Telegram-Bot-Api-Secret-Token. This suite proves the new gate rejects a
 * forged/missing token once TELEGRAM_WEBHOOK_SECRET is configured, and fails
 * OPEN (old chat-id-only behavior, not a 401) while it's still unconfigured —
 * deliberately, so this doesn't 401 every legitimate update the moment it
 * deploys, before Jeff has re-registered the live webhooks with the secret
 * (see the fail-CLOSED contrast note in telnyx-voice/route.auth.test.ts).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: () => Promise.resolve({ data: [] }) }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
  },
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'ok', toolsCalled: [] })),
}))

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '{}' })),
}))

const ORIGINAL_ENV = { ...process.env }

function req(body: unknown, secretHeader?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secretHeader !== undefined) headers['x-telegram-bot-api-secret-token'] = secretHeader
  return new Request('https://example.com/api/webhooks/telegram', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

const FORGED_UPDATE = { message: { chat: { id: 999999 }, text: 'send_broadcast to everyone: URGENT click here' } }

describe('POST /api/webhooks/telegram — secret-token gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects a forged update with a bad secret token once TELEGRAM_WEBHOOK_SECRET is configured', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'real-secret'
    const { POST } = await import('./route')

    const res = await POST(req(FORGED_UPDATE, 'attacker-guess'))
    expect(res.status).toBe(401)
  })

  it('rejects an update with no secret token header at all once configured', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'real-secret'
    const { POST } = await import('./route')

    const res = await POST(req(FORGED_UPDATE))
    expect(res.status).toBe(401)
  })

  it('accepts a request with the correct secret token once configured', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'real-secret'
    process.env.TELEGRAM_OWNER_CHAT_ID = '999999'
    const { POST } = await import('./route')

    const res = await POST(req(FORGED_UPDATE, 'real-secret'))
    expect(res.status).toBe(200)
  })

  it('fails OPEN (no 401) pre-activation, when TELEGRAM_WEBHOOK_SECRET is not yet configured', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
    const { POST } = await import('./route')

    // No secret header sent at all — old behavior (chat-id-only gate) still runs.
    const res = await POST(req(FORGED_UPDATE))
    expect(res.status).toBe(200)
  })
})

/**
 * GET /api/webhooks/telegram had NO auth check at all — any unauthenticated
 * caller could hit it to (1) trigger a real outbound Telegram message to the
 * owner and (2) read owner_chat_id + bot_token_len back in the JSON response.
 * owner_chat_id is the value ALLOWED_CHAT_IDS is built from, so leaking it
 * here defeats the point of keeping it secret. Gated with requireAdmin(),
 * matching the platform-admin pattern used by GET /api/admin/notifications.
 */

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: () => requireAdminMock(),
}))

describe('GET /api/webhooks/telegram — diag endpoint requires platform admin', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    requireAdminMock.mockReset()
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects an unauthenticated caller before sending a Telegram message or leaking owner_chat_id', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token'
    process.env.TELEGRAM_OWNER_CHAT_ID = '12345'
    requireAdminMock.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const { GET } = await import('./route')

    const res = await GET()

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.owner_chat_id).toBeUndefined()
  })

  it('allows a verified platform admin through', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token'
    process.env.TELEGRAM_OWNER_CHAT_ID = '12345'
    requireAdminMock.mockResolvedValue(null)
    const { GET } = await import('./route')

    const res = await GET()

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.owner_chat_id).toBe('12345')
  })
})
