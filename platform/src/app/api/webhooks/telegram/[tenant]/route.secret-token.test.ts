import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/webhooks/telegram/[tenant] (per-tenant bot) had NO signature/secret
 * verification — only a body-supplied chat ID allowlist. This locks in:
 *   - tenant has telegram_webhook_secret set + missing/wrong header => 401,
 *     never touches askSelena (fail-closed)
 *   - tenant has telegram_webhook_secret set + correct header => passes
 *   - tenant has NO secret configured => fails open (deliberate default
 *     until every tenant rotates one in)
 *   - wrong-tenant probe: a secret that authenticates a DIFFERENT tenant
 *     does not authenticate this one
 */

const askSelena = vi.fn()
vi.mock('@/lib/selena/agent', () => ({ askSelena: (...args: unknown[]) => askSelena(...args) }))

const sendTelegram = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, body: '' }))
vi.mock('@/lib/telegram', () => ({ sendTelegram: (...args: unknown[]) => sendTelegram(...args) }))

const insertConversationMessage = vi.fn()
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: (...args: unknown[]) => insertConversationMessage(...args) }))

let tenantRow: Record<string, unknown> | null = null
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: tenantRow }) }) }) }
      }
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }),
      }
    },
  },
}))

function req(opts: { body?: object; secretHeader?: string | null } = {}): Request {
  return {
    json: async () => opts.body ?? {},
    headers: { get: (name: string) => (name.toLowerCase() === 'x-telegram-bot-api-secret-token' ? (opts.secretHeader ?? null) : null) },
  } as unknown as Request
}

function ctx(tenant: string) {
  return { params: Promise.resolve({ tenant }) }
}

beforeEach(() => {
  vi.resetModules()
  askSelena.mockReset()
  sendTelegram.mockClear()
  insertConversationMessage.mockClear()
  tenantRow = null
})

describe('telegram per-tenant webhook — secret token verification', () => {
  it('tenant has a secret, header missing => 401, never touches askSelena', async () => {
    tenantRow = { id: 't1', slug: 'acme', telegram_bot_token: 'plain_bot_token', telegram_chat_id: '555', telegram_webhook_secret: 'acme-secret' }
    const { POST } = await import('./route')

    const res = await POST(req({ body: { message: { chat: { id: 555 }, text: 'hi' } } }), ctx('acme'))

    expect(res.status).toBe(401)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('tenant has a secret, wrong header => 401, never touches askSelena', async () => {
    tenantRow = { id: 't1', slug: 'acme', telegram_bot_token: 'plain_bot_token', telegram_chat_id: '555', telegram_webhook_secret: 'acme-secret' }
    const { POST } = await import('./route')

    const res = await POST(req({ body: { message: { chat: { id: 555 }, text: 'hi' } }, secretHeader: 'attacker-guess' }), ctx('acme'))

    expect(res.status).toBe(401)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('tenant has a secret, correct header => passes verification and reaches business logic', async () => {
    tenantRow = { id: 't1', slug: 'acme', telegram_bot_token: 'plain_bot_token', telegram_chat_id: '555', telegram_webhook_secret: 'acme-secret' }
    const { POST } = await import('./route')

    const res = await POST(req({ body: {}, secretHeader: 'acme-secret' }), ctx('acme'))

    expect(res.status).toBe(200)
    expect((await res.json()).skip).toBe('no_chat_or_text')
  })

  it('tenant has NO secret configured => fails open, still processes despite missing header', async () => {
    tenantRow = { id: 't1', slug: 'acme', telegram_bot_token: 'plain_bot_token', telegram_chat_id: '555', telegram_webhook_secret: null }
    const { POST } = await import('./route')

    const res = await POST(req({ body: {} }), ctx('acme'))

    expect(res.status).toBe(200)
    expect((await res.json()).skip).toBe('no_chat_or_text')
  })

  it('wrong-tenant probe: another tenant\'s valid secret does not authenticate this tenant', async () => {
    tenantRow = { id: 't1', slug: 'acme', telegram_bot_token: 'plain_bot_token', telegram_chat_id: '555', telegram_webhook_secret: 'acme-secret' }
    const { POST } = await import('./route')

    // "other-tenant-secret" would be valid for a different tenant's row, but
    // this request resolves to acme (via the [tenant] path param) whose
    // secret is "acme-secret" — cross-tenant secrets must not authenticate.
    const res = await POST(req({ body: { message: { chat: { id: 555 }, text: 'hi' } }, secretHeader: 'other-tenant-secret' }), ctx('acme'))

    expect(res.status).toBe(401)
    expect(askSelena).not.toHaveBeenCalled()
  })
})
