/**
 * TELEGRAM WEBHOOK DIAG GATE — /api/webhooks/telegram GET.
 *
 * Broad-hunt finding, 2026-07-15: this diagnostic GET handler sent a live
 * Telegram message to the owner and echoed owner_chat_id/bot_token_len in the
 * JSON response with ZERO auth check. /api/webhooks(.*) is public in
 * middleware.ts (Telegram's own POST webhook has no bearer scheme to gate
 * on), so anyone who found the URL could spam the owner's Telegram and read
 * back their chat id. Fixed by requiring the same CRON_SECRET bearer check
 * used by every other internal diagnostic/cron route (verifyCronSecret).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '{}' })),
}))

const ORIGINAL_ENV = { ...process.env }

function getReq(authHeader?: string): Request {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new Request('https://example.com/api/webhooks/telegram', { method: 'GET', headers })
}

describe('GET /api/webhooks/telegram — CRON_SECRET gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects with 500 when CRON_SECRET is not configured (fail-closed, not fail-open)', async () => {
    delete process.env.CRON_SECRET
    const { GET } = await import('./route')

    const res = await GET(getReq())
    expect(res.status).toBe(500)
  })

  it('rejects an unauthenticated request once CRON_SECRET is configured', async () => {
    process.env.CRON_SECRET = 'real-secret'
    const { GET } = await import('./route')

    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('rejects a wrong bearer token', async () => {
    process.env.CRON_SECRET = 'real-secret'
    const { GET } = await import('./route')

    const res = await GET(getReq('Bearer attacker-guess'))
    expect(res.status).toBe(401)
  })

  it('does not leak owner_chat_id or send a Telegram message on a rejected request', async () => {
    process.env.CRON_SECRET = 'real-secret'
    process.env.TELEGRAM_OWNER_CHAT_ID = '999999'
    const { GET } = await import('./route')
    const { sendTelegram } = await import('@/lib/telegram')

    const res = await GET(getReq('Bearer wrong'))
    const body = await res.json()
    expect(body.owner_chat_id).toBeUndefined()
    expect(sendTelegram).not.toHaveBeenCalled()
  })

  it('accepts a request with the correct bearer token', async () => {
    process.env.CRON_SECRET = 'real-secret'
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
    process.env.TELEGRAM_OWNER_CHAT_ID = '999999'
    const { GET } = await import('./route')

    const res = await GET(getReq('Bearer real-secret'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.owner_chat_id).toBe('999999')
  })
})
