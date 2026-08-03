// Telnyx SMS via REST API (no SDK needed)

import { withRetry } from './retry'
import { decryptSecret } from './secret-crypto'

// Normalize to E.164 (+1XXXXXXXXXX) at the send boundary, same spirit as
// decrypting the API key here rather than trusting every call site. Most
// callers pass a raw DB value (clients.phone etc.) with no country code —
// Telnyx's Messaging API rejects a bare 10-digit number with
// "The 'to' address should be a single valid number", which surfaced as a
// real, reproduced outage for nycmaid post-cutover (2026-07-22): every
// client-facing SMS call site in this codebase passes the unformatted DB
// value, and nycmaid's new (post-cutover) Telnyx number/profile — unlike
// the old standalone one — enforces strict E.164. Fixing it once here
// covers every call site instead of patching ~50 individually. Idempotent:
// an already-E.164 number round-trips unchanged.
function normalizeToE164(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return input.startsWith('+') ? input : `+${digits || input}`
}

// Telnyx error 40328: a long concatenated SMS exceeds the carrier's allowed
// part count (their own docs say to send it as MMS instead). Their API
// auto-detects SMS vs MMS off the `media_urls` field, and — per Telnyx
// support — an EMPTY `media_urls: []` is enough to force MMS mode even with
// no actual attachment, which has no such part-count ceiling. Detected by
// error code rather than message text, since Telnyx's wording isn't a
// stable contract.
const SMS_PART_LIMIT_ERROR_CODE = '40328'

async function postMessage(apiKey: string, payload: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout
  try {
    return await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function sendSMS({
  to,
  body,
  telnyxApiKey,
  telnyxPhone,
  mediaUrls,
}: {
  to: string
  body: string
  telnyxApiKey: string
  telnyxPhone: string
  mediaUrls?: string[]
}) {
  // Per-tenant keys are stored encrypted at rest; decrypt at the send boundary.
  // decryptSecret() passes plaintext/legacy values through unchanged.
  const apiKey = decryptSecret(telnyxApiKey)
  const toE164 = normalizeToE164(to)
  return withRetry(async () => {
    const basePayload = { from: telnyxPhone, to: toE164, text: body }
    const hasMedia = !!mediaUrls && mediaUrls.length > 0
    const res = await postMessage(apiKey, hasMedia ? { ...basePayload, media_urls: mediaUrls } : basePayload)

    if (res.ok) return res.json()

    const err = await res.json().catch(() => ({}))
    const errBody = err as Record<string, unknown>
    const errors = Array.isArray(errBody?.errors) ? errBody.errors : []
    const firstError = (errors[0] as Record<string, unknown>) || {}
    const detail = firstError.detail || ''
    const code = String(firstError.code || '')

    // A plain-text message too long for SMS parts — retry once, forced into
    // MMS mode, rather than surfacing a "can't send" error for something
    // that's really just a length limit on the wrong message type.
    if (!hasMedia && code === SMS_PART_LIMIT_ERROR_CODE) {
      const retryRes = await postMessage(apiKey, { ...basePayload, media_urls: [] })
      if (retryRes.ok) return retryRes.json()
      const retryErr = await retryRes.json().catch(() => ({}))
      const retryErrors = Array.isArray((retryErr as Record<string, unknown>)?.errors) ? (retryErr as Record<string, unknown>).errors as unknown[] : []
      const retryDetail = (retryErrors[0] as Record<string, unknown>)?.detail || ''
      throw new Error(`SMS failed: ${retryRes.status}${retryDetail ? ` — ${retryDetail}` : ''}`)
    }

    throw new Error(`SMS failed: ${res.status}${detail ? ` — ${detail}` : ''}`)
  }, { maxAttempts: 3, baseDelayMs: 2000 })
}
