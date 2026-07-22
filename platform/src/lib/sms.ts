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

export async function sendSMS({
  to,
  body,
  telnyxApiKey,
  telnyxPhone,
}: {
  to: string
  body: string
  telnyxApiKey: string
  telnyxPhone: string
}) {
  // Per-tenant keys are stored encrypted at rest; decrypt at the send boundary.
  // decryptSecret() passes plaintext/legacy values through unchanged.
  const apiKey = decryptSecret(telnyxApiKey)
  const toE164 = normalizeToE164(to)
  return withRetry(async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
      const res = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: telnyxPhone,
          to: toE164,
          text: body,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const errBody = err as Record<string, unknown>
        const errors = Array.isArray(errBody?.errors) ? errBody.errors : []
        const detail = (errors[0] as Record<string, unknown>)?.detail || ''
        throw new Error(`SMS failed: ${res.status}${detail ? ` — ${detail}` : ''}`)
      }

      return res.json()
    } finally {
      clearTimeout(timeout)
    }
  }, { maxAttempts: 3, baseDelayMs: 2000 })
}
