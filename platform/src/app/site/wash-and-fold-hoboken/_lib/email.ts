import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY?.replace(/\s/g, ''))

// Emails sent TO these domains are admin emails — don't BCC owner on those
const ADMIN_DOMAINS = ['thenycmaid.com', 'thenycmaid.gmail.com']

function isAdminEmail(email: string): boolean {
  return ADMIN_DOMAINS.some(d => email.toLowerCase().endsWith(`@${d}`) || email.toLowerCase().includes('thenycmaid'))
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: any[], options?: { bcc?: string | string[]; skipOwnerBcc?: boolean }) {
  const maxRetries = 3
  const delays = [1000, 2000, 4000]

  // Auto-BCC owner on all outbound emails to clients/cleaners (not admin-to-admin)
  let bcc = options?.bcc
  if (!options?.skipOwnerBcc && !isAdminEmail(to)) {
    const ownerBcc = process.env.OWNER_BCC_EMAIL
    if (ownerBcc) {
      const existing = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []
      bcc = [...existing, ownerBcc]
    }
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'The NYC Maid <hi@thenycmaid.com>',
        to,
        subject,
        html,
        attachments,
        ...(bcc ? { bcc } : {}),
      })
      if (error) {
        // Don't retry validation errors (bad email, etc)
        if (error.message?.includes('validation') || error.message?.includes('invalid')) {
          console.error('Email validation error:', error)
          return { success: false, error }
        }
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, delays[attempt]))
          continue
        }
        console.error('Email error after retries:', error)
        return { success: false, error }
      }
      return { success: true, data }
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delays[attempt]))
        continue
      }
      console.error('Email exception after retries:', err)
      return { success: false, error: err }
    }
  }
  return { success: false, error: 'Max retries exceeded' }
}
