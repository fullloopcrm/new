import { Resend } from 'resend'
import { withRetry } from './retry'

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
  // Determine which client to use — fail fast if no key available
  const client = resendApiKey
    ? new Resend(resendApiKey)
    : defaultResend

  if (!client) {
    throw new Error('Email not configured — no Resend API key available')
  }

  return withRetry(async () => {
    const sender = from || 'Full Loop CRM <noreply@fullloopcrm.com>'

    const { data, error } = await client.emails.send({
      from: sender,
      to,
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
