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
    <p style="margin:0 0 16px">We're glad to have you as part of Full Loop — we're excited about what it's going to do for your business.</p>
    <p style="margin:0 0 8px;font-weight:600">A few ways it'll help:</p>
    <ul style="margin:0 0 16px;padding-left:20px">
      <li style="margin-bottom:6px">Your booking site, sales agent, invoicing, scheduling, and reviews all run from one place — a lot of what used to be manual work just runs on its own.</li>
      <li style="margin-bottom:6px">Leads get followed up with automatically, so fewer of them fall through the cracks.</li>
      <li>Your whole operation — team, jobs, payments — lives in one system instead of five disconnected tools.</li>
    </ul>
    <p style="margin:0 0 16px">First step is your business profile — the link below walks you through it. It autosaves as you go, so there's no rush and nothing to lose if you close the tab and come back later. Most businesses take somewhere between 3 and 7 days to get all the way through it, a bit at a time — that's normal, not a deadline.</p>
    <p style="margin:0 0 16px">Once it's fully submitted, we get to work building and setting up your account — that typically takes 15 to 30 days.</p>
    <p style="margin:0 0 8px;font-weight:600">A few things before you start:</p>
    <ul style="margin:0 0 16px;padding-left:20px">
      <li style="margin-bottom:6px">Keep your EIN and legal business address handy — a couple of fields need your real paperwork, not a placeholder.</li>
      <li style="margin-bottom:6px">Everything you fill in goes straight into your live account as you type — this isn't a draft you publish later.</li>
      <li>Questions along the way? Just reply to this email.</li>
    </ul>
    ${pinRequired ? '<p style="margin:0 0 16px">One more thing — when you open the link, you\'ll need a quick PIN: the last 4 digits of the phone number on file for your business.</p>' : ''}
    <p style="margin:0">We look forward to working with you!</p>
  `

  try {
    await sendEmail({
      to,
      from: tenantSender(tenant),
      subject: 'Welcome to Full Loop — let\'s get your business set up',
      html: emailShell({
        brand,
        kicker: 'Welcome to Full Loop',
        heading: tenant?.name ? `Welcome, ${tenant.name}!` : 'Welcome to Full Loop!',
        bodyHtml,
        cta: { label: 'Complete your profile', url },
        preheader: 'Your AI-run CRM is ready to set up — booking site, sales agent, invoicing, and more.',
      }),
    })
    alertOwner(
      'Onboarding link sent',
      `${(tenant?.name as string) || 'A tenant'} — sent to ${to}\n${appUrl()}/admin/businesses/${tenantId}`,
    ).catch(() => {})
    // Stamped so activate-tenant.ts can guard on "already sent once" — this
    // used to only guard on tenant.status === 'active', so a tenant stuck in
    // 'setup' (incomplete profile, failed domain registration) got this
    // "welcome, let's get started" email re-sent on every Activate click.
    await supabaseAdmin.from('tenants').update({ onboarding_link_sent_at: new Date().toISOString() }).eq('id', tenantId)
    return { url, sent: true }
  } catch (err) {
    console.error('createAndSendOnboardingLink: send failed', err)
    return { url, sent: false }
  }
}
