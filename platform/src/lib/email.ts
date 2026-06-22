import { Resend } from 'resend'
import { withRetry } from './retry'
import { decryptSecret } from './secret-crypto'

// Only create default client if a real key is configured
const defaultResend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function sendEmail({
  to,
  subject,
  html,
  from,
  resendApiKey,
}: {
  to: string
  subject: string
  html: string
  from?: string
  resendApiKey?: string | null
}) {
  // Determine which client to use — fail fast if no key available.
  // Per-tenant keys are stored encrypted; decryptSecret() passes plaintext through.
  const client = resendApiKey
    ? new Resend(decryptSecret(resendApiKey))
    : defaultResend

  if (!client) {
    throw new Error('Email not configured — no Resend API key available')
  }

  return withRetry(async () => {
    const sender = from || 'Full Loop CRM <noreply@fullloopcrm.com>'

    // Trim recipients defensively — env vars and form input can carry stray
    // whitespace/newlines (e.g. ADMIN_NOTIFICATION_EMAIL="...\n"), which Resend
    // rejects as an invalid address and silently breaks notifications.
    const recipients = (Array.isArray(to) ? to : [to])
      .map((addr) => addr.trim())
      .filter(Boolean)

    const { data, error } = await client.emails.send({
      from: sender,
      to: recipients,
      subject,
      html,
    })

    if (error) {
      // Don't retry validation errors (bad email, unsubscribed, etc)
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('validation') || msg.includes('unsubscribed') || msg.includes('not allowed')) {
        throw new Error(`400 ${error.message}`)
      }
      throw new Error(error.message)
    }

    return data
  }, { maxAttempts: 3, baseDelayMs: 2000 })
}
