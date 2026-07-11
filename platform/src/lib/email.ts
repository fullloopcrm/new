import { Resend } from 'resend'
import { withRetry } from './retry'
import { decryptSecret } from './secret-crypto'

// Only create default client if a real key is configured
const defaultResend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'placeholder'
  ? new Resend(process.env.RESEND_API_KEY)
  : null

/**
 * Sender identity for a tenant email. Uses the tenant's own verified sender
 * (email_from) when set; otherwise an IDENTIFIED address on the verified
 * fullloopcrm.com apex — "<Tenant Name> <slug@fullloopcrm.com>" — so a
 * platform-sent email always names the tenant, never a bare Full Loop address.
 * Auto-falls off the moment the tenant sets their own email_from.
 */
export function tenantSender(
  tenant: { name?: string | null; slug?: string | null; email_from?: string | null } | null | undefined,
): string {
  if (tenant?.email_from) return tenant.email_from
  const name = (tenant?.name || 'Full Loop CRM').replace(/["<>\r\n]/g, '').trim() || 'Full Loop CRM'
  const local =
    (tenant?.slug || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'no-reply'
  return `${name} <${local}@fullloopcrm.com>`
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  resendApiKey,
  attachments,
}: {
  to: string
  subject: string
  html: string
  from?: string
  resendApiKey?: string | null
  attachments?: { filename: string; content: string | Buffer }[]
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
    const sender = from || 'Full Loop CRM <hello@fullloopcrm.com>'

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
      ...(attachments && attachments.length ? { attachments } : {}),
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
