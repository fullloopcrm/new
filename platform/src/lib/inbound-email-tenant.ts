import { supabaseAdmin } from './supabase'
import { getTenantByDomain } from './tenant-lookup'
import { escapeLikeValue } from './postgrest-safe'

/**
 * Tenant resolution for INBOUND email (Resend "email.received").
 *
 * The inbound webhook used to insert into `inbound_emails` with NO tenant_id,
 * i.e. an UNSCOPED global row — a cross-tenant leak (any admin inbox reading the
 * table would see every tenant's inbound mail). This resolves the tenant from
 * the recipient (To) address the same way the rest of the app trusts a tenant's
 * email identity: the address they send FROM (`email_from`), their verified
 * sending domain (`resend_domain`), and finally the custom-domain resolver
 * (`getTenantByDomain`, which honors `tenants.domain` + `tenant_domains`).
 *
 * This is the email analog of the SMS path, which routes inbound Telnyx messages
 * by matching the destination number against `tenants.telnyx_phone`.
 *
 * Fail-closed: returns null when nothing resolves so the caller can DROP the
 * message rather than write an unscoped row.
 */

/**
 * Extract bare, lowercased email addresses from a To-header value that may carry
 * display names and multiple comma-separated recipients, e.g.
 *   `"Support <hello@acme.com>, billing@acme.com"` -> ['hello@acme.com', 'billing@acme.com']
 */
export function parseRecipientAddresses(toAddress: string | null | undefined): string[] {
  if (!toAddress) return []
  return toAddress
    .split(',')
    .map((part) => {
      const angle = part.match(/<([^>]+)>/)
      return (angle ? angle[1] : part).trim().toLowerCase()
    })
    .filter((a) => a.includes('@'))
}

/** Domain portion of an email address, lowercased, or null if malformed. */
export function emailDomain(address: string): string | null {
  const at = address.lastIndexOf('@')
  if (at < 0) return null
  const dom = address.slice(at + 1).trim().toLowerCase()
  return dom || null
}

async function firstMatch(column: 'email_from' | 'resend_domain', value: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .ilike(column, escapeLikeValue(value))
    .order('id', { ascending: true })
    .limit(2)

  if (!data || data.length === 0) return null
  if (data.length > 1) {
    // Mirror the telnyx path: pick deterministically, log loudly on ambiguity.
    console.error(
      `[resend inbound] ${column} "${value}" matches ${data.length} tenants — dedupe needed; routing to ${data[0].name}`,
    )
  }
  return data[0].id as string
}

/**
 * Resolve the tenant id that owns an inbound email's recipient address.
 * Returns null when no tenant can be determined (caller must fail closed).
 */
export async function resolveTenantIdForInboundEmail(
  toAddress: string | null | undefined,
): Promise<string | null> {
  const addresses = parseRecipientAddresses(toAddress)
  if (addresses.length === 0) return null

  for (const address of addresses) {
    // 1. Exact match on the tenant's From address (where replies land).
    const byFrom = await firstMatch('email_from', address)
    if (byFrom) return byFrom

    const domain = emailDomain(address)
    if (!domain) continue

    // 2. Match the tenant's verified sending domain.
    const byResend = await firstMatch('resend_domain', domain)
    if (byResend) return byResend

    // 3. Fall back to the trusted custom-domain resolver
    //    (tenants.domain + tenant_domains).
    const byDomain = await getTenantByDomain(domain)
    if (byDomain) return byDomain.id
  }

  return null
}
