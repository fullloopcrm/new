// Telnyx SMS via REST API (no SDK needed)

import { withRetry } from './retry'

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
  return withRetry(async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

    try {
      const res = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${telnyxApiKey}`,
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
  }, { maxAttempts: 3, baseDelayMs: 2000 })
}
