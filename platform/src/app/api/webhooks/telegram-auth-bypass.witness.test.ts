/**
 * WITNESS TEST — documents CURRENT (weak) behavior, not desired behavior.
 *
 * Auth gap: the platform-owner Telegram webhook (`webhooks/telegram/route.ts`)
 * has NO cryptographic request authentication. Telegram supports a
 * `secret_token` set at `setWebhook` time and echoed back on every update in the
 * `X-Telegram-Bot-Api-Secret-Token` header — the route never reads it (grep for
 * `secret.token` / `x-telegram` across the telegram webhooks: none). The ONLY
 * gate is an allowlist check against `message.chat.id`, a value that comes
 * straight from the attacker-controlled request BODY.
 *
 * Consequence: anyone who knows the owner's numeric chat_id can POST a forged
 * update to the fixed public path `/api/webhooks/telegram` and drive the Selena
 * agent (which holds DB read/write tools). The chat_id is not secret — and this
 * same route's unauthenticated `GET` diagnostic returns `owner_chat_id` in its
 * JSON body, handing an attacker exactly the value the POST gate trusts.
 *
 * These assertions describe TODAY's behavior. They should start FAILING once the
 * route verifies `X-Telegram-Bot-Api-Secret-Token` (fail-closed) instead of, or
 * in addition to, the body-supplied chat_id — see
 * `deploy-prep/webhook-hardening-plan.md`.
 *
 * Distinct from `telegram-idempotency.witness.test.ts` (missing update_id
 * replay dedupe) and `telnyx-voice-failopen.witness.test.ts` (a different
 * provider). No route edits.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Env must be set BEFORE the route module is imported: `ALLOWED_CHAT_IDS` and
// `BOT_TOKEN` are module-load-time constants built from process.env. vi.hoisted
// runs before the (hoisted) import below.
const OWNER_CHAT_ID = '999000999'
vi.hoisted(() => {
  process.env.TELEGRAM_OWNER_CHAT_ID = '999000999'
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
})

// Spies exist before the hoisted vi.mock factories read them.
const { sendTelegram, askSelena } = vi.hoisted(() => ({
  sendTelegram: vi.fn().mockResolvedValue({ ok: true, status: 200, body: '' }),
  askSelena: vi.fn().mockResolvedValue({ text: 'ok', toolsCalled: [] }),
}))

vi.mock('@/lib/telegram', () => ({ sendTelegram }))
vi.mock('@/lib/selena/agent', () => ({ askSelena }))

// Chainable + thenable Supabase stub. The convo lookup
// (`.select().eq().eq().order().limit()` awaited) resolves to an existing convo
// so the insert path is skipped; message inserts (`.insert().then()`) no-op.
vi.mock('@/lib/supabase', () => {
  const qb: Record<string, unknown> = {}
  const chain = () => qb
  Object.assign(qb, {
    select: chain,
    eq: chain,
    order: chain,
    limit: chain,
    insert: chain,
    single: () => Promise.resolve({ data: { id: 'convo-witness-1' }, error: null }),
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [{ id: 'convo-witness-1' }], error: null }).then(res, rej),
  })
  return { supabaseAdmin: { from: () => qb } }
})

import { POST, GET } from './telegram/route'

let nextUpdateId = 1

function forgedUpdate(chatId: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/webhooks/telegram', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    // update_id is a required field on every real Telegram update; the dedupe
    // claim fails closed without one, so each forged request needs a fresh id.
    body: JSON.stringify({ update_id: nextUpdateId++, message: { chat: { id: chatId }, text: 'run a report' } }),
  })
}

describe('telegram owner webhook auth (WITNESS: body-only chat_id, no secret-token verify)', () => {
  beforeEach(() => {
    sendTelegram.mockClear()
    askSelena.mockClear()
  })

  it('BODY-ONLY AUTH: a forged update carrying the owner chat_id drives the agent — no secret token needed', async () => {
    // No X-Telegram-Bot-Api-Secret-Token header at all.
    const res = await POST(forgedUpdate(OWNER_CHAT_ID))
    expect(res.status).toBe(200)
    // Reaching askSelena = the request passed the ONLY gate using nothing but a
    // body-supplied chat_id. This is the bug: no cryptographic auth.
    expect(askSelena).toHaveBeenCalledTimes(1)
  })

  it('SECRET-TOKEN HEADER IS IGNORED: a WRONG secret token still passes when the body chat_id matches', async () => {
    const res = await POST(
      forgedUpdate(OWNER_CHAT_ID, { 'x-telegram-bot-api-secret-token': 'totally-wrong-secret' }),
    )
    expect(res.status).toBe(200)
    // A real fail-closed gate would 401 on a wrong secret token regardless of
    // body content. It doesn't — the header is never read.
    expect(askSelena).toHaveBeenCalledTimes(1)
  })

  it('a non-allowlisted chat_id is softly rejected (200 + "private"), NOT a hard 401 — and never reaches the agent', async () => {
    const res = await POST(forgedUpdate('123456'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.private).toBe(true)
    expect(askSelena).not.toHaveBeenCalled()
    expect(sendTelegram).toHaveBeenCalledWith('123456', 'This bot is private.')
  })

  it('DISCLOSURE CHAIN: the unauthenticated GET diagnostic returns owner_chat_id, feeding the POST gate', async () => {
    const res = await GET()
    const json = await res.json()
    // The value the POST handler trusts is handed out with no auth. An attacker
    // reads it here, then replays it in a forged POST body (tests above).
    expect(json.owner_chat_id).toBe(OWNER_CHAT_ID)
  })
})
