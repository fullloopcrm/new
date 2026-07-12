// Telnyx SMS via REST API (no SDK needed)

import { randomUUID } from 'crypto'
import { withRetry } from './retry'
import { decryptSecret } from './secret-crypto'

/**
 * True when `fetch()` failed because OUR OWN timeout aborted it — meaning we
 * never saw a response and don't know whether Telnyx already received and
 * queued the message. Telnyx's send-message API has no documented client
 * idempotency key, so (unlike sendEmail's Resend idempotencyKey, which is
 * provider-verified) retrying here is NOT provably safe. Treating this as
 * non-retryable is what actually prevents a duplicate text — the
 * Idempotency-Key header below is sent defensively in case Telnyx honors it,
 * but that support is unconfirmed and must not be relied on alone.
 */
function isAmbiguousTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
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
  // One key for this logical send, reused across every retry attempt.
  const idempotencyKey = randomUUID()

  return withRetry(async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
      const res = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from: telnyxPhone,
          to,
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
  }, { maxAttempts: 3, baseDelayMs: 2000, isRetryable: (error) => !isAmbiguousTimeout(error) })
}
