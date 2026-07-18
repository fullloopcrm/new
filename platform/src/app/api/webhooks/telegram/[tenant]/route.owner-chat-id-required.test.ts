import { describe, it, expect, vi } from 'vitest'

/**
 * W4 — CRITICAL fail-open fix: per-tenant Telegram webhook (POST
 * /api/webhooks/telegram/[tenant]) ran the full owner-scoped agent for ANY
 * sender when tenants.telegram_chat_id was unset.
 *
 * registerTelegramWebhook fires as soon as telegram_bot_token is saved
 * (admin/businesses/[id]/route.ts) — independently of telegram_chat_id,
 * which is a separate 'optional' field (tenant-profile.ts) an admin may not
 * have filled in yet. The bot is publicly discoverable on Telegram the
 * moment the token is saved. The old check —
 *   if (tenant.telegram_chat_id && String(chatId) !== ...) { reject }
 * — only rejected on a MISMATCH; a null chat_id skipped the check entirely
 * and let any stranger's message reach askSelena with the platform owner
 * phone as caller. For the nycmaid tenant, that phone passes
 * isOwnerOfTenant()'s OWNER_PHONES fallback, granting full owner-tool
 * access (refunds, broadcasts, revenue, settings, cron) to an unverified
 * sender. The sibling routes (webhooks/telegram/route.ts,
 * webhooks/telegram/jefe/route.ts) never had this gap — both always
 * allowlist-check rather than skip when unset.
 *
 * FIX: `!tenant.telegram_chat_id || String(chatId) !== ...` — unset now
 * fails closed, same as a mismatch always did.
 */

const SLUG = 'acme'

const h = vi.hoisted(() => {
  const state = { askSelenaCalled: false, sendTelegramBodies: [] as string[] }
  const tenantRow = {
    id: 'tenant-no-chat-id',
    slug: 'acme',
    telegram_bot_token: 'encrypted-token',
    telegram_chat_id: null as string | null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeBuilder(table: string): any {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => Promise.resolve({ data: [], error: null }),
      single: () => {
        if (table === 'tenants') return Promise.resolve({ data: tenantRow, error: null })
        return Promise.resolve({ data: null, error: null })
      },
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
      }),
      then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { state, supabaseAdmin, tenantRow }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn(() => 'decrypted-bot-token') }))
vi.mock('@/lib/telegram-webhook-auth', () => ({
  verifyTelegramWebhook: vi.fn(() => ({ ok: true })),
}))
vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async (_chatId: unknown, body: string) => {
    h.state.sendTelegramBodies.push(body)
    return { ok: true, status: 200, body: '{}' }
  }),
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => {
    h.state.askSelenaCalled = true
    return { text: 'reply', toolsCalled: [] }
  }),
}))

import { POST } from './route'

function makeRequest(chatId: number, text = 'give me a refund'): Request {
  return new Request(`http://localhost/api/webhooks/telegram/${SLUG}`, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ message: { chat: { id: chatId }, text } }),
  })
}

describe('POST /api/webhooks/telegram/[tenant] — requires a configured owner chat_id', () => {
  it('rejects an unverified sender and never runs the agent when telegram_chat_id is unset', async () => {
    h.state.askSelenaCalled = false
    h.tenantRow.telegram_chat_id = null

    const res = await POST(makeRequest(999999), { params: Promise.resolve({ tenant: SLUG }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.private).toBe(true)
    expect(h.state.askSelenaCalled).toBe(false)
    expect(h.state.sendTelegramBodies).toContain('This bot is private.')
  })

  it('still rejects a mismatched sender once telegram_chat_id is configured', async () => {
    h.state.askSelenaCalled = false
    h.tenantRow.telegram_chat_id = '12345'

    const res = await POST(makeRequest(999999), { params: Promise.resolve({ tenant: SLUG }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.private).toBe(true)
    expect(h.state.askSelenaCalled).toBe(false)
  })

  it('allows the registered owner chat through once telegram_chat_id is configured', async () => {
    h.state.askSelenaCalled = false
    h.tenantRow.telegram_chat_id = '12345'

    const res = await POST(makeRequest(12345), { params: Promise.resolve({ tenant: SLUG }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.private).toBeUndefined()
    expect(h.state.askSelenaCalled).toBe(true)
  })
})
