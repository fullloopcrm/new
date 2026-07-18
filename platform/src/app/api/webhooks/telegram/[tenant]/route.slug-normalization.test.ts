import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/webhooks/telegram/[tenant] — tenant_slug resolver-twin hardening.
 *
 * Same bug class as the other resolver-twins in this sweep: this route
 * hand-rolls its own `tenants.slug` lookup instead of the shared resolver,
 * so it never inherited the `.toLowerCase()` normalization. The [tenant]
 * path segment is admin-registered (usually already lowercase) but not
 * guaranteed to stay that way, and previously a case mismatch would 401
 * every inbound update for a real, correctly-configured tenant bot.
 */

const askSelena = vi.fn()
vi.mock('@/lib/selena/agent', () => ({ askSelena: (...args: unknown[]) => askSelena(...args) }))
vi.mock('@/lib/telegram', () => ({ sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '' })) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn() }))

let tenantRow: Record<string, unknown> | null = null
let lookupSlugs: string[] = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => {
              lookupSlugs.push(val)
              return {
                maybeSingle: () => Promise.resolve({ data: val === tenantRow?.slug ? tenantRow : null, error: null }),
              }
            },
          }),
        }
      }
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
        select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }),
      }
    },
  },
}))

function req(opts: { secretHeader?: string | null } = {}): Request {
  return {
    json: async () => ({}),
    headers: { get: (name: string) => (name.toLowerCase() === 'x-telegram-bot-api-secret-token' ? (opts.secretHeader ?? null) : null) },
  } as unknown as Request
}

function ctx(tenant: string) {
  return { params: Promise.resolve({ tenant }) }
}

beforeEach(() => {
  vi.resetModules()
  askSelena.mockReset()
  tenantRow = { id: 't1', slug: 'acme', telegram_bot_token: 'plain_bot_token', telegram_chat_id: '555', telegram_webhook_secret: 'acme-secret' }
  lookupSlugs = []
})

describe('telegram per-tenant webhook — [tenant] path slug case normalization', () => {
  it('a mixed-case path segment still resolves to the lowercase-stored tenant', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ secretHeader: 'acme-secret' }), ctx('Acme'))

    // Reaches secret verification (200/skip), not the pre-lookup 401/skip an
    // unresolved tenant would produce — proves the lookup matched despite case.
    expect(res.status).toBe(200)
    expect(lookupSlugs).toContain('acme')
  })
})
