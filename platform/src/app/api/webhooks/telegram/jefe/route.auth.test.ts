/**
 * TELEGRAM WEBHOOK AUTH — /api/webhooks/telegram/jefe POST (platform GM bot).
 *
 * Same residual gap as the [tenant]/route.ts fix, same session: the owner
 * chat-id check `OWNER_CHAT_ID && chatId !== OWNER_CHAT_ID` skipped itself
 * entirely whenever JEFE_OWNER_CHAT_ID/TELEGRAM_OWNER_CHAT_ID was unset,
 * letting anyone who found the bot talk to Jefe (platform-wide GM agent) as
 * if owner-verified. Fix: no owner chat id configured -> reject, not fall
 * through — matches the already-correct fail-closed pattern in the global
 * owner-bot route's ALLOWED_CHAT_IDS.has(...) check.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/jefe/agent', () => ({
  askJefe: vi.fn(async () => ({ text: 'jefe reply' })),
}))

vi.mock('@/lib/jefe/actions', () => ({
  loadJefeHistory: vi.fn(async () => []),
  saveJefeTurn: vi.fn(async () => {}),
}))

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '{}' })),
}))

const ORIGINAL_ENV = { ...process.env }

function req(body: unknown): Request {
  return new Request('https://example.com/api/webhooks/telegram/jefe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const UPDATE = { message: { chat: { id: 555 }, text: 'status report' } }

describe('POST /api/webhooks/telegram/jefe — owner chat-id gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.TELEGRAM_WEBHOOK_SECRET
    process.env.JEFE_BOT_TOKEN = 'jefe-bot-token'
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects any chat when no owner chat id is configured at all', async () => {
    delete process.env.JEFE_OWNER_CHAT_ID
    delete process.env.TELEGRAM_OWNER_CHAT_ID
    const { askJefe } = await import('@/lib/jefe/agent')
    const { POST } = await import('./route')

    const res = await POST(req(UPDATE))
    const json = await res.json()

    expect(json.private).toBe(true)
    expect(askJefe).not.toHaveBeenCalled()
  })

  it('rejects a chat id that does not match the configured owner chat', async () => {
    process.env.JEFE_OWNER_CHAT_ID = '999'
    const { askJefe } = await import('@/lib/jefe/agent')
    const { POST } = await import('./route')

    const res = await POST(req(UPDATE))
    const json = await res.json()

    expect(json.private).toBe(true)
    expect(askJefe).not.toHaveBeenCalled()
  })

  it('accepts a chat id that matches the configured owner chat', async () => {
    process.env.JEFE_OWNER_CHAT_ID = '555'
    const { askJefe } = await import('@/lib/jefe/agent')
    const { POST } = await import('./route')

    const res = await POST(req(UPDATE))
    const json = await res.json()

    expect(json.private).toBeUndefined()
    expect(askJefe).toHaveBeenCalled()
  })
})
