/**
 * Owner (tenant) alerts — one call fires a Full-Loop-styled email + an SMS to the
 * business's admins at each pipeline event (lead in, proposal sent, accepted,
 * declined, sold, deposit paid). Same shell/template as customer comms so every
 * message across the platform looks identical, brand-injected per tenant.
 *
 * Best-effort: never throws into the caller — a comms failure must not break the
 * pipeline action that triggered it.
 */
import { supabaseAdmin } from '../supabase'
import { emailAdmins, smsAdmins } from '../admin-contacts'
import { emailShell, smsFormat, type CommsBrand } from './shell'

async function tenantBrand(tenantId: string): Promise<CommsBrand> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('name, phone, email, address, logo_url, primary_color')
    .eq('id', tenantId)
    .single()
  return {
    name: data?.name || 'Your Business',
    phone: data?.phone || null,
    email: data?.email || null,
    address: data?.address || null,
    logoUrl: data?.logo_url || null,
    primaryColor: data?.primary_color || null,
  }
}

export type OwnerAlertInput = {
  tenantId: string
  /** Mono eyebrow, e.g. "New lead". */
  kicker: string
  /** Serif headline, e.g. "Alex Rivera just came in". */
  heading: string
  /** Pre-escaped HTML body (short — this is an internal heads-up). */
  bodyHtml: string
  /** One-line SMS to the admins. Omit to skip the text. */
  sms?: string
  /** Optional deep link into the dashboard. */
  cta?: { label: string; url: string }
  subject: string
}

export async function ownerAlert(input: OwnerAlertInput): Promise<void> {
  try {
    const brand = await tenantBrand(input.tenantId)
    const html = emailShell({
      brand,
      kicker: input.kicker,
      heading: input.heading,
      bodyHtml: input.bodyHtml,
      cta: input.cta,
      preheader: input.subject,
    })
    await emailAdmins(input.tenantId, input.subject, html)
    if (input.sms) {
      await smsAdmins(input.tenantId, smsFormat(brand, input.sms))
    }
  } catch (err) {
    console.error('[ownerAlert] failed:', err)
  }
}
