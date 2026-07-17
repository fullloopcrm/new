// Per-tenant brand strings for client-facing messaging (SMS + email).
//
// Why this exists: maid-brand tenants (nycmaid, the-florida-maid) share the
// same rich "cleaning" copy, but each must speak in its OWN name, phone, and
// links — they share Telnyx/Resend infra but are distinct brands. Rather than
// hardcode "The NYC Maid" / its phone / its URLs in the templates, the templates
// take a TenantBrand and the resolver builds one per tenant from its DB row.
//
// Non-cleaning tenants don't use this — they keep the neutral shared templates.

import { getPrimaryTenantDomain } from '../domains'

export type TenantBrand = {
  /** Display name used as the SMS/email sender prefix, e.g. "The NYC Maid". */
  name: string
  /** Human-formatted support phone, e.g. "(646) 490-0130". Empty string if unset. */
  phone: string
  /** Bare site host without scheme, e.g. "thenycmaid.com". */
  site: string
  /** Public booking/portal URL without scheme, e.g. "thenycmaid.com/book". */
  bookUrl: string
  /** Google review link, or null when the tenant has no place id configured. */
  reviewUrl: string | null
  /** Default hourly rate fallback when a booking has none. */
  defaultRate: number
}

type TenantRow = {
  id?: string | null
  name?: string | null
  phone?: string | null
  website_url?: string | null
  domain?: string | null
  domain_name?: string | null
  google_place_id?: string | null
  slug?: string | null
}

/** Format a stored phone (E.164 or digits) as "(xxx) xxx-xxxx" for display. */
function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (ten.length !== 10) return raw // leave untouched if it isn't a US 10-digit
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

/** Strip scheme + trailing slash so links read like nycmaid's "thenycmaid.com/book". */
function bareHost(url: string | null | undefined): string {
  return (url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

export async function tenantBrand(tenant: TenantRow): Promise<TenantBrand> {
  // tenant_domains PRIMARY row wins over the legacy tenants.domain/website_url
  // columns, same precedence as getAgentConfig()/buildBrandOverride() in
  // selena/agent(-config-loader).ts. Previously read website_url/domain only
  // and never consulted tenant_domains — a cleaning tenant whose custom
  // domain lives only in tenant_domains (added via admin/websites, which
  // never touches tenants.domain or website_url) got an empty `site` (silently
  // dropping the SMS "tap to confirm" link, see sms-cleaning.ts) and the
  // literal string "the booking link we sent you" instead of a real URL in
  // every booking-confirmed/cancelled/rescheduled/rebook SMS.
  const primaryDomain = tenant.id ? await getPrimaryTenantDomain(tenant.id) : null
  const domain = primaryDomain || tenant.domain || tenant.domain_name || null
  const host = bareHost(domain ? `https://${domain}` : tenant.website_url)
  return {
    name: tenant.name || 'Your service',
    phone: formatPhone(tenant.phone),
    site: host,
    bookUrl: host ? `${host}/book` : 'the booking link we sent you',
    reviewUrl: tenant.google_place_id
      ? `https://search.google.com/local/writereview?placeid=${tenant.google_place_id}`
      : null,
    defaultRate: 0,
  }
}
