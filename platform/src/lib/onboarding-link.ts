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
import { alertOwner } from './telegram'
import { emailShell, type CommsBrand } from './messaging/shell'

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
    .select('name, slug, email_from, owner_email, email, onboarding_link_version, phone, owner_phone, address, logo_url, primary_color')
    .eq('id', tenantId)
    .single()

  const linkVersion = (tenant?.onboarding_link_version as number) || 1
  const url = onboardingLinkUrl(tenantId, linkVersion)

  const to = (tenant?.owner_email as string) || (tenant?.email as string) || null
  if (!to) return { url, sent: false }

  const pinRequired = tenant ? !!expectedOnboardingPin(tenant) : false

  const brand: CommsBrand = {
    name: (tenant?.name as string) || 'Your Business',
    phone: (tenant?.phone as string) || null,
    email: (tenant?.email as string) || null,
    address: (tenant?.address as string) || null,
    logoUrl: (tenant?.logo_url as string) || null,
    primaryColor: (tenant?.primary_color as string) || null,
  }

  const bodyHtml = `
    <p style="margin:0 0 16px">Finish setting up your business profile — it takes a few minutes and you can save and come back anytime.</p>
    ${pinRequired ? '<p style="margin:0">When you open it, you\'ll need a PIN — the last 4 digits of the phone number on file for your business.</p>' : ''}
  `

  try {
    await sendEmail({
      to,
      from: tenantSender(tenant),
      subject: 'Finish setting up your Full Loop account',
      html: emailShell({
        brand,
        kicker: 'Welcome to Full Loop',
        heading: tenant?.name ? `Let's get ${tenant.name} set up` : "Let's get your business set up",
        bodyHtml,
        cta: { label: 'Complete your profile', url },
        preheader: 'Finish setting up your business profile — it takes a few minutes.',
      }),
    })
    alertOwner(
      'Onboarding link sent',
      `${(tenant?.name as string) || 'A tenant'} — sent to ${to}\n${appUrl()}/admin/businesses/${tenantId}`,
    ).catch(() => {})
    return { url, sent: true }
  } catch (err) {
    console.error('createAndSendOnboardingLink: send failed', err)
    return { url, sent: false }
  }
}
