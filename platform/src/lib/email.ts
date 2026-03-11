import { Resend } from 'resend'
import { withRetry } from './retry'

const defaultResend = new Resend(process.env.RESEND_API_KEY || 'placeholder')

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
  return withRetry(async () => {
    const client = resendApiKey ? new Resend(resendApiKey) : defaultResend
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
