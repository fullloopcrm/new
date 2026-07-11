/**
 * Telegram webhook authenticity — the trust boundary for INBOUND updates.
 *
 * Every inbound Telegram POST carries a body-supplied `message.chat.id`. The
 * webhook routes gate on that chat id (owner chat / tenant chat), but a chat id
 * is NOT a secret — it leaks in group invites, deep links, forwarded messages,
 * and error logs. Anyone who learns the owner's chat id and the (guessable)
 * webhook URL could POST a forged update and drive the OWNER agent (which can
 * read/write tenant data and run owner tools).
 *
 * The real authenticity signal is Telegram's own secret token: when a webhook is
 * registered via `setWebhook(secret_token=...)`, Telegram echoes that value back
 * in the `X-Telegram-Bot-Api-Secret-Token` header on EVERY delivery. A forger
 * who is not Telegram cannot produce it. We verify it FAIL-CLOSED here.
 *
 * Secrets are DERIVED (HMAC) from a single master env `TELEGRAM_WEBHOOK_SECRET`
 * per bot "scope" — no per-tenant column / DB write needed. Registration and
 * verification recompute the same value, so the master secret never leaves the
 * server. Telegram allows 1-256 chars of [A-Za-z0-9_-]; hex output qualifies.
 *
 * FAIL-CLOSED contract:
 *   - master secret unset            -> REJECT (do NOT fall open; a control that
 *                                       silently no-ops when unconfigured is the
 *                                       insecure default this fix exists to kill).
 *   - header missing or mismatched   -> REJECT.
 *   - header matches derived secret  -> OK.
 *
 * DEPLOY DEPENDENCY: after setting TELEGRAM_WEBHOOK_SECRET, every bot's webhook
 * must be (re)registered WITH its scoped secret or Telegram won't send the
 * header and the route will fail-closed. Per-tenant bots re-register on token
 * save (registerTelegramWebhook now passes the secret). The global owner bot and
 * the Jefe bot are env-registered — re-run setWebhook with the scoped secret
 * from `deriveTelegramSecret('platform-owner')` / `deriveTelegramSecret('jefe')`.
 */
import { createHmac, timingSafeEqual } from 'crypto'

export const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token'

function masterSecret(): string {
  return (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim()
}

/** True when the master webhook secret is configured. */
export function telegramWebhookSecretConfigured(): boolean {
  return masterSecret().length > 0
}

/**
 * Derive the per-scope secret token from the master secret. Returns null when
 * the master secret is unset (so callers fail closed). Scope examples:
 *   'platform-owner'      — global owner bot (/api/webhooks/telegram)
 *   'jefe'                — platform GM bot  (/api/webhooks/telegram/jefe)
 *   `tenant:<tenantId>`   — per-tenant bot   (/api/webhooks/telegram/[tenant])
 */
export function deriveTelegramSecret(scope: string): string | null {
  const master = masterSecret()
  if (!master) return null
  return createHmac('sha256', master).update(`telegram-webhook:${scope}`).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  try {
    return timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

export interface TelegramVerifyResult {
  ok: boolean
  reason: 'ok' | 'webhook_secret_unconfigured' | 'missing_secret_token' | 'bad_secret_token'
}

/**
 * Fail-closed verification of the X-Telegram-Bot-Api-Secret-Token header for a
 * given bot scope. See the FAIL-CLOSED contract above.
 */
export function verifyTelegramWebhook(req: Request, scope: string): TelegramVerifyResult {
  const expected = deriveTelegramSecret(scope)
  if (!expected) return { ok: false, reason: 'webhook_secret_unconfigured' }
  const provided = (req.headers.get(TELEGRAM_SECRET_HEADER) || '').trim()
  if (!provided) return { ok: false, reason: 'missing_secret_token' }
  if (!safeEqual(provided, expected)) return { ok: false, reason: 'bad_secret_token' }
  return { ok: true, reason: 'ok' }
}
