import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * GET /api/webhooks/telegram had NO auth check at all — any unauthenticated
 * caller could hit it to (1) trigger a real outbound Telegram message to the
 * owner and (2) read owner_chat_id + bot_token_len back in the JSON response.
 * owner_chat_id is the value ALLOWED_CHAT_IDS is built from, so leaking it
 * here defeats the point of keeping it secret. Gated with requireAdmin(),
 * matching the platform-admin pattern used by GET /api/admin/notifications.
 */

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

const sendTelegram = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, body: '' }))
vi.mock('@/lib/telegram', () => ({ sendTelegram }))

vi.mock('@/lib/sms-messages', () => ({
  insertConversationMessage: vi.fn(),
}))

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: () => requireAdminMock(),
}))

const ORIGINAL_ENV = { ...process.env }

describe('GET /api/webhooks/telegram — diag endpoint requires platform admin', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    requireAdminMock.mockReset()
    sendTelegram.mockClear()
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
