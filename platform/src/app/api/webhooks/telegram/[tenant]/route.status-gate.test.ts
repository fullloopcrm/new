import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/webhooks/telegram/[tenant] — tenantServesSite() status gate.
 *
 * Same bug class as every other slug/host-resolved entry point fixed this
 * session (PIN-login, portal/team-portal auth tokens, public site header
 * resolver): this route hand-rolls its own `tenants.slug` lookup instead of
 * the shared resolver, so it never inherited the tenantServesSite() status
 * gate. A suspended/cancelled/deleted tenant's Telegram bot would otherwise
 * keep answering inbound messages and running the AI agent against that
 * tenant's live data — Telegram delivery has no dependency on the tenant's
 * site/dashboard being reachable.
 */

const askSelena = vi.fn()
vi.mock('@/lib/selena/agent', () => ({ askSelena: (...args: unknown[]) => askSelena(...args) }))
const sendTelegram = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, body: '' }))
vi.mock('@/lib/telegram', () => ({ sendTelegram }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn() }))

let tenantRow: Record<string, unknown> | null = null
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: () => Promise.resolve({ data: val === tenantRow?.slug ? tenantRow : null, error: null }),
            }),
          }),
        }
      }
      return {
        // insert() is used two ways by this route: `.insert(...).then(...)`
        // (fire-and-forget notifications) and `.insert(...).select('id').single()`
        // (sms_conversations create) — return something that satisfies both.
        insert: () =>
          Object.assign(Promise.resolve({ data: null, error: null }), {
            select: () => ({ single: () => Promise.resolve({ data: { id: 'convo1' }, error: null }) }),
          }),
        select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }) }),
      }
    },
  },
}))

function req(): Request {
  return {
    json: async () => ({ message: { chat: { id: 555 }, text: 'hi' } }),
    headers: { get: (name: string) => (name.toLowerCase() === 'x-telegram-bot-api-secret-token' ? 'acme-secret' : null) },
  } as unknown as Request
}

function ctx(tenant: string) {
  return { params: Promise.resolve({ tenant }) }
}

beforeEach(() => {
  vi.resetModules()
  askSelena.mockReset()
  sendTelegram.mockClear()
})

describe('telegram per-tenant webhook — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'skips a %s tenant without running the agent or sending a reply',
    async (status) => {
      tenantRow = {
        id: 't1',
        slug: 'acme',
        status,
        telegram_bot_token: 'plain_bot_token',
        telegram_chat_id: '555',
        telegram_webhook_secret: 'acme-secret',
      }
      const { POST } = await import('./route')
      const res = await POST(req(), ctx('acme'))
      const body = await res.json()

      expect(body).toEqual({ ok: true, skip: 'tenant_not_active' })
      expect(askSelena).not.toHaveBeenCalled()
      expect(sendTelegram).not.toHaveBeenCalled()
    },
  )

  it.each(['active', 'setup', 'pending'])('still processes a %s tenant', async (status) => {
    tenantRow = {
      id: 't1',
      slug: 'acme',
      status,
      telegram_bot_token: 'plain_bot_token',
      telegram_chat_id: '555',
      telegram_webhook_secret: 'acme-secret',
    }
    askSelena.mockResolvedValue({ text: 'reply', toolsCalled: [] })
    const { POST } = await import('./route')
    const res = await POST(req(), ctx('acme'))
    const body = await res.json()

    expect(body.skip).not.toBe('tenant_not_active')
    expect(askSelena).toHaveBeenCalled()
  })
})
