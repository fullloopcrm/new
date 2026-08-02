/**
 * Auto-create + email the signed, no-login onboarding-questionnaire link the
 * moment a tenant is created. Called from every tenant-creation entry point
 * (api/admin/businesses, api/tenants, create-tenant-from-lead, the Stripe
 * checkout webhook) — see call sites for why this isn't folded into
 * provisionTenant() (only 2 of those 4 paths call it today; pre-existing,
 * unrelated to this feature).
 */
import { supabaseAdmin } from './supabase'
import { sendEmail, tenantSender } from './email'
import { signOnboardingToken } from './onboarding-token'
import { expectedOnboardingPin } from './onboarding-pin'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.homeservicesbusinesscrm.com'
}

export function onboardingLinkUrl(tenantId: string, linkVersion: number): string {
  const token = signOnboardingToken(tenantId, linkVersion)
  return `${appUrl()}/onboard/${token}`
}

/**
 * Mint the link for a freshly-created tenant and email it to whichever
 * address is available (owner_email first, falls back to the business
 * email captured at signup). Best-effort — a send failure must never block
 * tenant creation; the link can always be re-copied from
 * admin/tenants/[id].
 */
export async function createAndSendOnboardingLink(tenantId: string): Promise<{ url: string; sent: boolean }> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, slug, email_from, owner_email, email, onboarding_link_version, phone, owner_phone')
    .eq('id', tenantId)
    .single()

  const linkVersion = (tenant?.onboarding_link_version as number) || 1
  const url = onboardingLinkUrl(tenantId, linkVersion)

  const to = (tenant?.owner_email as string) || (tenant?.email as string) || null
  if (!to) return { url, sent: false }

  const pinRequired = tenant ? !!expectedOnboardingPin(tenant) : false

  try {
    await sendEmail({
      to,
      from: tenantSender(tenant),
      subject: 'Finish setting up your Full Loop account',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
          <h2 style="color: #333;">Welcome to Full Loop${tenant?.name ? `, ${tenant.name}` : ''}!</h2>
          <p style="color: #555;">Finish setting up your business profile — it takes a few minutes and you can save and come back anytime.</p>
          <a href="${url}" style="display: inline-block; background: #0d9488; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">Complete your profile</a>
          ${pinRequired ? '<p style="color: #555; font-size: 13px;">When you open it, you\'ll need a PIN — the last 4 digits of the phone number on file for your business.</p>' : ''}
          <p style="color: #999; font-size: 12px;">This link is unique to your business — no password needed. If it wasn't you, ignore this email.</p>
        </div>
      `,
    })
    return { url, sent: true }
  } catch (err) {
    console.error('createAndSendOnboardingLink: send failed', err)
    return { url, sent: false }
  }
}
