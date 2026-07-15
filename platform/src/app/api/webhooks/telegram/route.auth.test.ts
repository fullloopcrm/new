/**
 * OWNER TELEGRAM WEBHOOK AUTH — /api/webhooks/telegram POST.
 *
 * Fleet-wide webhook/cron audit finding, 2026-07-13: Telegram never signs
 * webhook bodies, so the route's only prior "auth" was matching chat_id from
 * the (fully attacker-controlled) POST body against an env-var allowlist.
 * Anyone who found this URL and guessed/leaked TELEGRAM_OWNER_CHAT_ID could
 * forge an update and drive Yinez with owner-tier tools.
 *
 * This suite proves the new secret_token gate actually rejects bad/missing
 * headers at the route level (not just in the underlying helper) once
 * TELEGRAM_WEBHOOK_SECRET is configured, and stays a no-op (today's behavior)
 * when it isn't — so shipping this doesn't break the live bot pre-activation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve(undefined) }),
      select: () => ({
        eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }),
      }),
    }),
  },
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'unreachable', toolsCalled: [] })),
}))

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '' })),
}))

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: () => requireAdminMock(),
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

describe('POST /api/webhooks/telegram — secret_token gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects a forged update with the wrong secret when TELEGRAM_WEBHOOK_SECRET is configured', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'real-secret'
    process.env.TELEGRAM_OWNER_CHAT_ID = '12345'
    const { POST } = await import('./route')

    const res = await POST(req({ message: { chat: { id: 12345 }, text: 'do the thing' } }, 'guessed-secret'))
    expect(res.status).toBe(401)
  })

  it('rejects a forged update with no secret header at all when configured', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'real-secret'
    process.env.TELEGRAM_OWNER_CHAT_ID = '12345'
    const { POST } = await import('./route')

    const res = await POST(req({ message: { chat: { id: 12345 }, text: 'do the thing' } }))
    expect(res.status).toBe(401)
  })

  it('passes through to the chat-id check when no secret is configured yet (pre-activation)', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
    process.env.TELEGRAM_OWNER_CHAT_ID = '99999'
    const { POST } = await import('./route')

    // Unknown chat id → falls through to the private-bot branch, not a 401
    // from the secret gate — proves the gate itself didn't block this.
    const res = await POST(req({ message: { chat: { id: 1 }, text: 'hi' } }))
    expect(res.status).not.toBe(401)
  })
})

describe('GET /api/webhooks/telegram — diag endpoint requires platform admin', () => {
  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    requireAdminMock.mockReset()
    const { sendTelegram } = await import('@/lib/telegram')
    vi.mocked(sendTelegram).mockClear()
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects an unauthenticated caller before sending a Telegram message or leaking owner_chat_id', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token'
    process.env.TELEGRAM_OWNER_CHAT_ID = '12345'
    requireAdminMock.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    const { GET } = await import('./route')
    const { sendTelegram } = await import('@/lib/telegram')

    const res = await GET()

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.owner_chat_id).toBeUndefined()
    expect(sendTelegram).not.toHaveBeenCalled()
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
