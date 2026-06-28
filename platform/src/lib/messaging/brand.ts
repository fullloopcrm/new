// Per-tenant brand strings for client-facing messaging (SMS + email).
//
// Why this exists: maid-brand tenants (nycmaid, the-florida-maid) share the
// same rich "cleaning" copy, but each must speak in its OWN name, phone, and
// links — they share Telnyx/Resend infra but are distinct brands. Rather than
// hardcode "The NYC Maid" / its phone / its URLs in the templates, the templates
// take a TenantBrand and the resolver builds one per tenant from its DB row.
//
// Non-cleaning tenants don't use this — they keep the neutral shared templates.

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
function bareHost(url: string | null | undefined, fallbackDomain: string | null | undefined): string {
  const src = url || (fallbackDomain ? `https://${fallbackDomain}` : '')
  return src.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

export function tenantBrand(tenant: TenantRow): TenantBrand {
  const host = bareHost(tenant.website_url, tenant.domain || tenant.domain_name)
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
