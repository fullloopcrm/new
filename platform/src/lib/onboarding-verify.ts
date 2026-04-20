/**
 * Live verification of tenant onboarding checklist items.
 *
 * Each check returns { ok, detail } — ok=true means the external state
 * matches what the checklist claims. Runs real DNS lookups, HTTPS fetches,
 * and vendor API calls. No side effects.
 *
 * Used by /api/admin/businesses/[id]/verify-checklist to replace
 * manual checkboxes with automated verification.
 */
import Stripe from 'stripe'
import { promises as dnsPromises } from 'dns'

export interface CheckResult {
  ok: boolean
  detail: string
}

// ─── DNS & SSL ─────────────────────────────────────────────

export async function verifyDnsA(domain: string): Promise<CheckResult> {
  if (!domain) return { ok: false, detail: 'No domain set' }
  try {
    const records = await dnsPromises.resolve4(domain)
    // Vercel's standard A record is 76.76.21.21
    if (records.includes('76.76.21.21')) {
      return { ok: true, detail: `A → 76.76.21.21` }
    }
    return { ok: false, detail: `A records: ${records.join(', ')} (expected 76.76.21.21)` }
  } catch (e) {
    return { ok: false, detail: `DNS A lookup failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

export async function verifyDnsCname(domain: string): Promise<CheckResult> {
  if (!domain) return { ok: false, detail: 'No domain set' }
  try {
    const records = await dnsPromises.resolveCname(`www.${domain}`)
    // Accept any Vercel DNS target — cname.vercel-dns.com, *.vercel-dns-NNN.com,
    // alias.vercel.app, etc.
    if (records.some(r => /vercel-dns|vercel\.app/.test(r))) {
      return { ok: true, detail: `www CNAME → ${records[0]}` }
    }
    return { ok: false, detail: `www CNAME: ${records.join(', ')}` }
  } catch (e) {
    return { ok: false, detail: `www CNAME not found: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

export async function verifyDnsMx(domain: string): Promise<CheckResult> {
  if (!domain) return { ok: false, detail: 'No domain set' }
  try {
    const mx = await dnsPromises.resolveMx(domain)
    if (mx.length > 0) {
      return { ok: true, detail: `MX: ${mx.map(m => m.exchange).join(', ')}` }
    }
    return { ok: false, detail: 'No MX records found' }
  } catch (e) {
    return { ok: false, detail: `MX lookup failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

export async function verifySsl(domain: string): Promise<CheckResult> {
  if (!domain) return { ok: false, detail: 'No domain set' }
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`https://${domain}/`, { method: 'HEAD', signal: controller.signal })
    clearTimeout(timeout)
    if (res.status < 500) {
      return { ok: true, detail: `HTTPS ${res.status}` }
    }
    return { ok: false, detail: `HTTPS returned ${res.status}` }
  } catch (e) {
    return { ok: false, detail: `HTTPS fetch failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

// ─── Resend ─────────────────────────────────────────────

export async function verifyResendDomain(resendApiKey: string, resendDomain: string): Promise<CheckResult> {
  if (!resendApiKey) return { ok: false, detail: 'No Resend API key' }
  if (!resendDomain) return { ok: false, detail: 'No Resend domain configured' }
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    })
    if (!res.ok) {
      return { ok: false, detail: `Resend API ${res.status}` }
    }
    const data = await res.json() as { data?: Array<{ name: string; status: string }> }
    const domain = data.data?.find(d => d.name === resendDomain)
    if (!domain) {
      return { ok: false, detail: `Domain ${resendDomain} not in Resend account` }
    }
    if (domain.status === 'verified') {
      return { ok: true, detail: `${resendDomain} verified in Resend` }
    }
    return { ok: false, detail: `Resend status: ${domain.status}` }
  } catch (e) {
    return { ok: false, detail: `Resend lookup failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

// ─── Telnyx ─────────────────────────────────────────────

export async function verifyTelnyxNumber(telnyxApiKey: string, telnyxPhone: string): Promise<CheckResult> {
  if (!telnyxApiKey) return { ok: false, detail: 'No Telnyx API key' }
  if (!telnyxPhone) return { ok: false, detail: 'No Telnyx phone configured' }
  try {
    const url = `https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${encodeURIComponent(telnyxPhone)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${telnyxApiKey}` },
    })
    if (!res.ok) {
      return { ok: false, detail: `Telnyx API ${res.status}` }
    }
    const data = await res.json() as { data?: Array<{ phone_number: string; status: string; messaging_profile_id: string | null }> }
    const num = data.data?.[0]
    if (!num) {
      return { ok: false, detail: `${telnyxPhone} not found in Telnyx account` }
    }
    const hasMessagingProfile = !!num.messaging_profile_id
    if (num.status === 'active' && hasMessagingProfile) {
      return { ok: true, detail: `${telnyxPhone} active, messaging profile attached` }
    }
    return {
      ok: false,
      detail: `${telnyxPhone} status=${num.status}${hasMessagingProfile ? '' : ', no messaging profile'}`,
    }
  } catch (e) {
    return { ok: false, detail: `Telnyx lookup failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

// ─── Stripe ─────────────────────────────────────────────

export async function verifyStripeAccount(stripeApiKey: string, accountId?: string | null): Promise<CheckResult> {
  if (!stripeApiKey) return { ok: false, detail: 'No Stripe secret key' }
  try {
    const stripe = new Stripe(stripeApiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
    if (accountId) {
      const acct = await stripe.accounts.retrieve(accountId)
      const chargesOk = acct.charges_enabled
      const payoutsOk = acct.payouts_enabled
      if (chargesOk && payoutsOk) {
        return { ok: true, detail: `Stripe Connect account ${accountId} active (charges + payouts)` }
      }
      return {
        ok: false,
        detail: `Stripe account ${accountId}: charges=${chargesOk}, payouts=${payoutsOk}`,
      }
    }
    // No Connect account ID — just validate the key by fetching balance.
    const balance = await stripe.balance.retrieve()
    return { ok: true, detail: `Stripe key valid (balance available: ${balance.available.length} currencies)` }
  } catch (e) {
    return { ok: false, detail: `Stripe lookup failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

export async function verifyStripeWebhook(stripeApiKey: string, expectedUrl: string): Promise<CheckResult> {
  if (!stripeApiKey) return { ok: false, detail: 'No Stripe secret key' }
  try {
    const stripe = new Stripe(stripeApiKey, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
    const match = endpoints.data.find(e => e.url === expectedUrl && e.status === 'enabled')
    if (match) {
      return { ok: true, detail: `Webhook ${expectedUrl} enabled` }
    }
    return {
      ok: false,
      detail: `No enabled webhook at ${expectedUrl} (found ${endpoints.data.length} endpoints)`,
    }
  } catch (e) {
    return { ok: false, detail: `Stripe webhook lookup failed: ${e instanceof Error ? e.message : 'unknown'}` }
  }
}

// ─── Batch runner ─────────────────────────────────────────────

export interface TenantForVerify {
  id: string
  domain?: string | null
  resend_api_key?: string | null
  resend_domain?: string | null
  telnyx_api_key?: string | null
  telnyx_phone?: string | null
  stripe_api_key?: string | null
  stripe_account_id?: string | null
}

export async function runAllChecks(tenant: TenantForVerify, appUrl: string) {
  const d = tenant.domain || ''
  const results = await Promise.allSettled([
    verifyDnsA(d),
    verifyDnsCname(d),
    verifyDnsMx(d),
    verifySsl(d),
    verifyResendDomain(tenant.resend_api_key || '', tenant.resend_domain || ''),
    verifyTelnyxNumber(tenant.telnyx_api_key || '', tenant.telnyx_phone || ''),
    verifyStripeAccount(tenant.stripe_api_key || '', tenant.stripe_account_id),
    verifyStripeWebhook(tenant.stripe_api_key || '', `${appUrl}/api/webhooks/stripe`),
  ])

  const unwrap = (r: PromiseSettledResult<CheckResult>): CheckResult =>
    r.status === 'fulfilled' ? r.value : { ok: false, detail: `check threw: ${r.reason}` }

  return {
    dns_a: unwrap(results[0]),
    dns_cname_www: unwrap(results[1]),
    mx_records: unwrap(results[2]),
    ssl_active: unwrap(results[3]),
    resend_domain_verified: unwrap(results[4]),
    telnyx_number_active: unwrap(results[5]),
    stripe_account: unwrap(results[6]),
    stripe_webhook_configured: unwrap(results[7]),
  }
}
