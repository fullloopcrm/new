/**
 * TELEGRAM WEBHOOK AUTH — /api/webhooks/telegram/[tenant] POST (per-tenant owner bot).
 *
 * Residual gap in the bug class documented in the sibling
 * ../route.auth.test.ts (2026-07-13 fleet-wide webhook/cron audit): even with
 * the secret_token gate fully enforcing (proves the request really came from
 * Telegram), this route's SEPARATE chat-id ownership check —
 * `tenant.telegram_chat_id && chatId !== tenant.telegram_chat_id` — skipped
 * itself entirely whenever telegram_chat_id was unset. That's a real, common
 * window: saving `telegram_bot_token` auto-registers the live webhook
 * immediately (see admin/businesses/[id]/route.ts), before the admin has
 * captured the numeric owner chat id (which normally requires someone to
 * message the bot first). Any Telegram user who found the bot during that
 * window got a full conversation with the tenant's AI agent as if
 * owner-verified. Fix: no chat id on file -> reject, matching the sibling
 * global-owner-bot route's already-correct `ALLOWED_CHAT_IDS.has(...)`
 * fail-closed pattern (empty set never matches).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { mockTenant } = vi.hoisted(() => ({
  mockTenant: {
    id: 'tenant-1',
    slug: 'acme',
    telegram_bot_token: 'encrypted-token',
    telegram_chat_id: null as string | null,
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: mockTenant }) }) }) }
      }
      if (table === 'sms_conversations') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }),
          }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }) }),
        }
      }
      return { insert: () => Promise.resolve({ data: null, error: null }) }
    },
  },
}))

vi.mock('@/lib/secret-crypto', () => ({
  decryptSecret: (v: string) => `decrypted-${v}`,
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'hi', toolsCalled: [] })),
}))

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '{}' })),
}))

const ORIGINAL_ENV = { ...process.env }

function req(body: unknown): Request {
  return new Request('https://example.com/api/webhooks/telegram/acme', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const UPDATE = { message: { chat: { id: 555 }, text: 'hello' } }
const params = () => Promise.resolve({ tenant: 'acme' })

describe('POST /api/webhooks/telegram/[tenant] — owner chat-id gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.TELEGRAM_WEBHOOK_SECRET
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects any chat when the tenant has no telegram_chat_id on file yet', async () => {
    mockTenant.telegram_chat_id = null
    const { askSelena } = await import('@/lib/selena/agent')
    const { POST } = await import('./route')

    const res = await POST(req(UPDATE), { params: params() })
    const json = await res.json()

    expect(json.private).toBe(true)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('rejects a chat id that does not match the registered owner chat', async () => {
    mockTenant.telegram_chat_id = '999'
    const { askSelena } = await import('@/lib/selena/agent')
    const { POST } = await import('./route')

    const res = await POST(req(UPDATE), { params: params() })
    const json = await res.json()

    expect(json.private).toBe(true)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('accepts a chat id that matches the registered owner chat', async () => {
    mockTenant.telegram_chat_id = '555'
    const { askSelena } = await import('@/lib/selena/agent')
    const { POST } = await import('./route')

    const res = await POST(req(UPDATE), { params: params() })
    const json = await res.json()

    expect(json.private).toBeUndefined()
    expect(askSelena).toHaveBeenCalled()
  })
})
