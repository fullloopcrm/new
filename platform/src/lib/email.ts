import { Resend } from 'resend'

const defaultResend = new Resend(process.env.RESEND_API_KEY)

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
  const client = resendApiKey ? new Resend(resendApiKey) : defaultResend
  const sender = from || 'Full Loop CRM <noreply@fullloopcrm.com>'

  const { data, error } = await client.emails.send({
    from: sender,
    to,
    subject,
    html,
  })

  if (error) {
    console.error('Email send error:', error)
    throw new Error(error.message)
  }

  return data
}
