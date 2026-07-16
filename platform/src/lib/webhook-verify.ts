/**
 * Webhook signature verification — zero-dep, production-safe.
 *
 * Supported providers:
 *   - Svix (Clerk, Resend): HMAC-SHA256 over `id.timestamp.body`, secret `whsec_...`
 *   - Telnyx: Ed25519 over `timestamp|body`, public key base64-encoded
 *   - Telegram: `X-Telegram-Bot-Api-Secret-Token` header set via setWebhook
 *
 * All helpers return { valid: boolean, reason?: string }. Never throws on signature
 * problems — caller decides the HTTP response.
 */
import { createHmac, timingSafeEqual, verify as cryptoVerify, createPublicKey } from 'node:crypto'

const FIVE_MIN_MS = 5 * 60 * 1000

export interface VerifyResult {
  valid: boolean
  reason?: string
}

/**
 * Verify a Svix-signed webhook (used by Clerk, Resend).
 * Required headers: svix-id, svix-timestamp, svix-signature.
 * Secret format: `whsec_<base64>`.
 */
export function verifySvix(
  headers: Headers,
  rawBody: string,
  secret: string | undefined
): VerifyResult {
  if (!secret) return { valid: false, reason: 'secret not configured' }

  const id = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signatureHeader = headers.get('svix-signature')

  if (!id || !timestamp || !signatureHeader) {
    return { valid: false, reason: 'missing svix headers' }
  }

  const timestampMs = Number.parseInt(timestamp, 10) * 1000
  if (!Number.isFinite(timestampMs)) {
    return { valid: false, reason: 'bad timestamp' }
  }
  if (Math.abs(Date.now() - timestampMs) > FIVE_MIN_MS) {
    return { valid: false, reason: 'timestamp out of window' }
  }

  const secretBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice('whsec_'.length), 'base64')
    : Buffer.from(secret, 'utf8')

  const signedPayload = `${id}.${timestamp}.${rawBody}`
  const expected = createHmac('sha256', secretBytes).update(signedPayload).digest('base64')

  // Header format: "v1,sig1 v1,sig2" — any valid signature accepts.
  const signatures = signatureHeader.split(' ').map(s => s.split(',')[1]).filter(Boolean)
  const expectedBuf = Buffer.from(expected, 'base64')
  for (const sig of signatures) {
    try {
      const sigBuf = Buffer.from(sig, 'base64')
      if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
        return { valid: true }
      }
    } catch {
      // skip malformed entry
    }
  }

  return { valid: false, reason: 'signature mismatch' }
}

/**
 * Verify a Telnyx-signed webhook.
 * Required headers: telnyx-signature-ed25519, telnyx-timestamp.
 * publicKey is the raw base64 public key from the Telnyx portal (no PEM header).
 */
export function verifyTelnyx(
  headers: Headers,
  rawBody: string,
  publicKey: string | undefined
): VerifyResult {
  if (!publicKey) return { valid: false, reason: 'public key not configured' }

  const signature = headers.get('telnyx-signature-ed25519')
  const timestamp = headers.get('telnyx-timestamp')
  if (!signature || !timestamp) {
    return { valid: false, reason: 'missing telnyx headers' }
  }

  const timestampMs = Number.parseInt(timestamp, 10) * 1000
  if (!Number.isFinite(timestampMs)) {
    return { valid: false, reason: 'bad timestamp' }
  }
  if (Math.abs(Date.now() - timestampMs) > FIVE_MIN_MS) {
    return { valid: false, reason: 'timestamp out of window' }
  }

  const signedPayload = Buffer.from(`${timestamp}|${rawBody}`, 'utf8')
  const sigBytes = Buffer.from(signature, 'base64')

  // Raw 32-byte Ed25519 public key → DER-wrapped SPKI for Node.
  const keyBytes = Buffer.from(publicKey, 'base64')
  const spkiPrefix = Buffer.from([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
  ])
  const spki = Buffer.concat([spkiPrefix, keyBytes])

  try {
    const key = createPublicKey({ key: spki, format: 'der', type: 'spki' })
    const ok = cryptoVerify(null, signedPayload, key, sigBytes)
    return ok ? { valid: true } : { valid: false, reason: 'signature mismatch' }
  } catch (err) {
    return { valid: false, reason: `verify error: ${err instanceof Error ? err.message : 'unknown'}` }
  }
}

/**
 * Verify a Telegram webhook's `X-Telegram-Bot-Api-Secret-Token` header
 * (https://core.telegram.org/bots/api#setwebhook — `secret_token`).
 *
 * Telegram does not sign webhook bodies at all; the ONLY origin proof it
 * offers is echoing back a secret you registered via setWebhook. Without
 * this check, anyone who finds the webhook URL can POST a forged update
 * body (including a guessed/leaked chat_id) and the route has no way to
 * tell it apart from a real Telegram delivery.
 *
 * Fail-CLOSED in every case, including when expectedSecret is unset — an
 * unconfigured secret means the endpoint's only "auth" is a body-supplied
 * chat_id (not a secret, forgeable), and these bots can trigger the
 * Selena/Jefe agent with owner-tier tools. Callers must configure a secret
 * via BotFather/setWebhook's secret_token param (and the matching env var /
 * tenant column) before the webhook will accept traffic.
 */
export function verifyTelegramSecretToken(
  headers: Headers,
  expectedSecret: string | undefined
): VerifyResult {
  if (!expectedSecret) return { valid: false, reason: 'secret not configured' }

  const provided = headers.get('x-telegram-bot-api-secret-token')
  if (!provided) return { valid: false, reason: 'missing secret token header' }

  const providedBuf = Buffer.from(provided, 'utf8')
  const expectedBuf = Buffer.from(expectedSecret, 'utf8')
  if (providedBuf.length !== expectedBuf.length) return { valid: false, reason: 'secret mismatch' }

  return timingSafeEqual(providedBuf, expectedBuf) ? { valid: true } : { valid: false, reason: 'secret mismatch' }
}
