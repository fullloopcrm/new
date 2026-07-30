/**
 * Sends the tenant owner their PIN-login credentials the moment a PIN-based
 * owner account is created (activate-tenant.ts, create-tenant-from-lead.ts).
 * Previously the plaintext PIN was only returned in the API response for an
 * admin to relay manually — a real gap, same shape as the onboarding-link
 * gap this session started with. Shared here so both creation paths that
 * mint a PIN owner send the same email instead of drifting.
 */
import { sendEmail, tenantSender } from './email'
import { escapeHtml, safeUrl } from './escape-html'

export async function sendOwnerLoginEmail(params: {
  tenantName: string
  slug: string
  ownerEmail: string | null | undefined
  ownerPin: string
}): Promise<{ sent: boolean }> {
  const { tenantName, slug, ownerEmail, ownerPin } = params
  if (!ownerEmail) return { sent: false }

  const loginUrl = `https://${slug}.fullloopcrm.com/fullloop`
  const safeTenantName = escapeHtml(tenantName)
  const safeLoginUrl = safeUrl(loginUrl)
  const safePin = escapeHtml(ownerPin)

  try {
    await sendEmail({
      to: ownerEmail,
      from: tenantSender({ name: tenantName, slug }),
      subject: `Your Full Loop login for ${tenantName}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
          <h2 style="color: #333;">${safeTenantName} is live on Full Loop</h2>
          <p style="color: #555;">Sign in with your PIN — no password to remember.</p>
          <a href="${safeLoginUrl}" style="display: inline-block; background: #0d9488; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 12px 0;">${escapeHtml(loginUrl)}</a>
          <p style="color: #333; font-size: 20px; font-weight: 700; letter-spacing: 2px; margin: 16px 0;">${safePin}</p>
          <p style="color: #999; font-size: 12px;">Keep this PIN private. You can change it after you sign in.</p>
        </div>
      `,
    })
    return { sent: true }
  } catch (err) {
    console.error('sendOwnerLoginEmail failed', err)
    return { sent: false }
  }
}
