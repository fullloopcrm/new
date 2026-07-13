/**
 * JEFE TELEGRAM WEBHOOK AUTH — /api/webhooks/telegram/jefe POST.
 *
 * Same gap as the owner bot (see ../route.auth.test.ts) — Jefe is the
 * platform-GM agent, so impersonating Jeff here is the highest-value target
 * in the webhook fleet.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/jefe/agent', () => ({
  askJefe: vi.fn(async () => ({ text: 'unreachable' })),
}))

vi.mock('@/lib/jefe/actions', () => ({
  loadJefeHistory: vi.fn(async () => []),
  saveJefeTurn: vi.fn(async () => {}),
}))

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '' })),
}))

const ORIGINAL_ENV = { ...process.env }

function req(body: unknown, secretHeader?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secretHeader !== undefined) headers['x-telegram-bot-api-secret-token'] = secretHeader
  return new Request('https://example.com/api/webhooks/telegram/jefe', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/telegram/jefe — secret_token gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects a forged update with the wrong secret when JEFE_WEBHOOK_SECRET is configured', async () => {
    process.env.JEFE_BOT_TOKEN = 'fake-bot-token'
    process.env.JEFE_WEBHOOK_SECRET = 'real-secret'
    process.env.JEFE_OWNER_CHAT_ID = '12345'
    const { POST } = await import('./route')

    const res = await POST(req({ message: { chat: { id: 12345 }, text: 'do the thing' } }, 'guessed-secret'))
    expect(res.status).toBe(401)
  })

  it('falls back to TELEGRAM_WEBHOOK_SECRET when JEFE_WEBHOOK_SECRET is unset', async () => {
    process.env.JEFE_BOT_TOKEN = 'fake-bot-token'
    delete process.env.JEFE_WEBHOOK_SECRET
    process.env.TELEGRAM_WEBHOOK_SECRET = 'shared-secret'
    process.env.JEFE_OWNER_CHAT_ID = '12345'
    const { POST } = await import('./route')

    const res = await POST(req({ message: { chat: { id: 12345 }, text: 'do the thing' } }, 'wrong'))
    expect(res.status).toBe(401)
  })

  it('passes through when no secret is configured yet (pre-activation)', async () => {
    process.env.JEFE_BOT_TOKEN = 'fake-bot-token'
    delete process.env.JEFE_WEBHOOK_SECRET
    delete process.env.TELEGRAM_WEBHOOK_SECRET
    process.env.JEFE_OWNER_CHAT_ID = '99999'
    const { POST } = await import('./route')

    const res = await POST(req({ message: { chat: { id: 1 }, text: 'hi' } }))
    expect(res.status).not.toBe(401)
  })
})
