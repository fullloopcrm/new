/**
 * WITNESS TEST — documents CURRENT (weak) behavior, not desired behavior.
 *
 * Auth gap: the PER-TENANT Telegram webhook
 * (`webhooks/telegram/[tenant]/route.ts`) authenticates inbound updates ONLY by
 * comparing the body-supplied `message.chat.id` against `tenants.telegram_chat_id`
 * — and that comparison is GUARDED by a truthiness check:
 *
 *     if (tenant.telegram_chat_id && String(chatId) !== String(tenant.telegram_chat_id)) { reject }
 *
 * When `telegram_chat_id` is NULL (a tenant that has provisioned a bot token but
 * has not yet registered its owner chat — the default state right after setup),
 * the `&&` short-circuits and the reject branch is SKIPPED ENTIRELY. There is no
 * `X-Telegram-Bot-Api-Secret-Token` verification anywhere in this route (grep
 * `secret.token` / `x-telegram`: none), so a request in that state has NO auth
 * gate of any kind.
 *
 * Consequence: anyone who knows a victim tenant's slug (it is in the public
 * webhook URL `/api/webhooks/telegram/<slug>` and often the tenant's own domain)
 * can POST a forged update with an ARBITRARY `chat.id` and drive that tenant's
 * Selena/Jefe agent. Worse than the global-owner-bot gap
 * (`telegram-auth-bypass.witness.test.ts`): this route calls `askSelena(...)`
 * with `ownerPhone()` (see route header comment "reaching this bot ... IS the
 * auth"), so the forged request unlocks OWNER-level agent tools (DB read/write,
 * outbound messaging) on the victim tenant — with no chat_id to guess.
 *
 * These assertions describe TODAY's behavior. They should start FAILING once the
 * route verifies a per-tenant `X-Telegram-Bot-Api-Secret-Token` (fail-closed)
 * rather than relying on an optional body-supplied chat_id.
 *
 * Distinct from `telegram-auth-bypass.witness.test.ts` (the GLOBAL owner bot,
 * `telegram/route.ts`) and `telegram-idempotency.witness.test.ts` (replay
 * dedupe). No route edits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { sendTelegram, askSelena, decryptSecret } = vi.hoisted(() => ({
  sendTelegram: vi.fn().mockResolvedValue({ ok: true, status: 200, body: '' }),
  askSelena: vi.fn().mockResolvedValue({ text: 'ok', toolsCalled: [] }),
  decryptSecret: vi.fn().mockReturnValue('decrypted-bot-token'),
}))

vi.mock('@/lib/telegram', () => ({ sendTelegram }))
vi.mock('@/lib/selena/agent', () => ({ askSelena }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret }))

// Chainable + thenable Supabase stub.
//   loadTenantBot: `.from('tenants').select().eq('slug').single()` — `.single()`
//     resolves to a tenant whose `telegram_chat_id` is NULL (the vulnerable
//     state) but which HAS a bot token (so the route proceeds past the early
//     `no_bot_token` skip).
//   convo lookup: `.select().eq().eq().order().limit()` awaited (thenable) →
//     returns one existing convo, so the insert branch is skipped.
//   message inserts: `.insert().then()` — no-op.
vi.mock('@/lib/supabase', () => {
  const qb: Record<string, unknown> = {}
  const chain = () => qb
  Object.assign(qb, {
    select: chain,
    eq: chain,
    order: chain,
    limit: chain,
    insert: chain,
    single: () =>
      Promise.resolve({
        data: {
          id: 'tenant-witness-1',
          slug: 'victim',
          telegram_bot_token: 'enc-token',
          telegram_chat_id: null, // ← unregistered owner chat = no gate
        },
        error: null,
      }),
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [{ id: 'convo-witness-1' }], error: null }).then(res, rej),
  })
  return { supabaseAdmin: { from: () => qb } }
})

import { POST } from './telegram/[tenant]/route'

let nextUpdateId = 1

function forgedUpdate(
  chatId: string,
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost/api/webhooks/telegram/victim', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    // update_id is a required field on every real Telegram update; the dedupe
    // claim fails closed without one, so each forged request needs a fresh id.
    body: JSON.stringify({ update_id: nextUpdateId++, message: { chat: { id: chatId }, text: 'run a report' } }),
  })
}

const ctx = { params: Promise.resolve({ tenant: 'victim' }) }

describe('per-tenant telegram webhook auth (WITNESS: null telegram_chat_id = no gate)', () => {
  beforeEach(() => {
    sendTelegram.mockClear()
    askSelena.mockClear()
  })

  it('NULL CHAT_ID BYPASS: an attacker-chosen chat_id drives the victim tenant agent — no secret token, no registered chat', async () => {
    // Arbitrary attacker chat id; NO X-Telegram-Bot-Api-Secret-Token header.
    const res = await POST(forgedUpdate('660066'), ctx)
    expect(res.status).toBe(200)
    // Reaching askSelena proves the request passed with ZERO authentication:
    // telegram_chat_id is null so the only gate short-circuits away.
    expect(askSelena).toHaveBeenCalledTimes(1)
  })

  it('SECRET-TOKEN HEADER IS IGNORED: a wrong secret token still reaches the agent', async () => {
    const res = await POST(
      forgedUpdate('771177', { 'x-telegram-bot-api-secret-token': 'totally-wrong-secret' }),
      ctx,
    )
    expect(res.status).toBe(200)
    // A fail-closed gate would 401 on a wrong/absent secret token regardless of
    // body content. It doesn't — the header is never read.
    expect(askSelena).toHaveBeenCalledTimes(1)
  })
})
