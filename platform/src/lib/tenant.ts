import { getOwnerUserId } from '@/lib/owner-session'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import { IMPERSONATE_COOKIE, verifyImpersonationCookie } from './impersonation'
import { verifyTenantHeaderSig } from './tenant-header-sig'
import { tenantServesSite } from './tenant-status'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']

export type Tenant = {
  id: string
  name: string
  agent_name: string | null
  slug: string
  domain: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  timezone: string
  industry: string
  status: string
  zip_code: string | null
  team_size: string
  business_hours: string | null
  address: string | null
  tagline: string | null
  website_url: string | null
  plan: string
  setup_dismissed: boolean
  owner_name: string | null
  owner_email: string | null
  owner_phone: string | null
  admin_notes: string | null
  last_active_at: string | null
  billing_status: string
  monthly_rate: number
  setup_fee: number
  setup_fee_paid_at: string | null
  payment_method: string | null
  resend_api_key: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  stripe_api_key: string | null
  stripe_account_id: string | null
  anthropic_api_key: string | null
  resend_domain: string | null
  email_from: string | null
  google_place_id: string | null
  gmail_account: string | null
  domain_name: string | null
  dns_configured: boolean
  email_domain_verified: boolean
  sms_number: string | null
  website_published: boolean
  website_content: Record<string, unknown>
  setup_progress: Record<string, boolean>
  selena_config: Record<string, unknown> | null
}

// Check for admin PIN impersonation (no Clerk needed)
async function getAdminImpersonatedTenant(): Promise<Tenant | null> {
  const cookieStore = await cookies()
  const impersonateId = verifyImpersonationCookie(cookieStore.get(IMPERSONATE_COOKIE)?.value)
  const adminToken = cookieStore.get('admin_token')?.value

  if (!impersonateId || !adminToken) return null
  if (!verifyAdminToken(adminToken)) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', impersonateId)
    .single()

  return tenant
}

// Check if current user is super admin impersonating a tenant (Clerk-based)
async function getClerkImpersonatedTenant(userId: string): Promise<Tenant | null> {
  if (!SUPER_ADMIN_IDS.includes(userId)) return null

  const cookieStore = await cookies()
  const impersonateId = verifyImpersonationCookie(cookieStore.get(IMPERSONATE_COOKIE)?.value)
  if (!impersonateId) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', impersonateId)
    .single()

  return tenant
}

// Get the current tenant for the logged-in user (server-side)
// Resolve the tenant from the signed x-tenant-id header that middleware
// injects on tenant custom-domain / subdomain requests. Verifying the sig
// means only middleware (which holds the secret) could have set it, so a
// raw caller cannot forge tenant context. This is what scopes a tenant
// domain's /admin (rewritten to /dashboard) to that one tenant.
async function getHeaderTenant(): Promise<Tenant | null> {
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  const sig = h.get('x-tenant-sig')
  if (!tenantId || !verifyTenantHeaderSig(tenantId, sig)) return null

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  return data
}

export async function getCurrentTenant(): Promise<Tenant | null> {
  // Tenant custom-domain / subdomain context (signed header from middleware)
  const headerTenant = await getHeaderTenant()
  if (headerTenant) return headerTenant

  // Admin PIN impersonation — no Clerk needed
  const adminImpersonated = await getAdminImpersonatedTenant()
  if (adminImpersonated) return adminImpersonated

  const userId = await getOwnerUserId()
  if (!userId) return null

  // Clerk super admin impersonation
  const clerkImpersonated = await getClerkImpersonatedTenant(userId)
  if (clerkImpersonated) return clerkImpersonated

  // Normal flow: look up which tenant this Clerk user belongs to
  const { data: membership } = await supabaseAdmin
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('clerk_user_id', userId)
    .single()

  if (!membership) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', membership.tenant_id)
    .single()

  // Real (non-impersonated) owner login only — admin PIN and Clerk
  // super-admin impersonation above intentionally skip this gate so support
  // can still reach a suspended/cancelled/deleted tenant's dashboard. A
  // suspended/cancelled/deleted tenant's own site already goes dark
  // (tenantServesSite gates middleware + the ingest routes); without this
  // check its OWNER could still log in via the main host and run the CRM
  // (send campaigns, take payments) indefinitely after being cut off
  // everywhere else that enforces the same status.
  if (!tenant || !tenantServesSite(tenant.status)) return null

  return tenant
}

// Check if current session is an impersonation
export async function isImpersonating(): Promise<boolean> {
  const cookieStore = await cookies()
  const impersonateId = verifyImpersonationCookie(cookieStore.get(IMPERSONATE_COOKIE)?.value)
  if (!impersonateId) return false

  // Admin PIN impersonation
  const adminToken = cookieStore.get('admin_token')?.value
  if (adminToken && verifyAdminToken(adminToken)) return true

  // Clerk super admin impersonation
  const userId = await getOwnerUserId()
  if (userId && SUPER_ADMIN_IDS.includes(userId)) return true

  return false
}

// Get tenant by slug (for subdomain routing)
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  // Lowercase — slugs are always generated lowercase (slugify()/toSlug() in
  // every tenant-creation path), so a mixed-case lookup (e.g. a caller-
  // supplied slug from a partner API) would otherwise silently miss a real
  // tenant. Matches this resolver's own getTenantByDomain normalization.
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('slug', slug.toLowerCase())
    .eq('status', 'active')
    .single()

  return data
}

// Get tenant by custom domain.
//
// Reconciled to the SAME resolution contract as the middleware resolver in
// ./tenant-lookup.ts (see P1-SCHEMA-SPEC.md) so both agree on which tenant a
// host maps to:
//   1. tenant_domains FIRST — match the request host to a tenant_id (the P1
//      source of truth for host routing). select('*') is migration-safe: it
//      surfaces the new P1 columns once W1's migration lands and simply omits
//      them beforehand, so the query never breaks against the un-migrated DB.
//   2. tenants.domain FALLBACK — used only when no active tenant_domains row
//      exists for the host. Retained (NOT dropped) per the P1 spec.
//
// Cross-tenant safety: a matched tenant_domains row is authoritative. If its
// tenant_id fails to resolve (dangling pointer, or the tenant is not active),
// return null rather than falling through to tenants.domain — falling through
// could serve the host as a DIFFERENT tenant (the brand-swap failure mode).
//
// TRANSITION ASSERT-AND-REFUSE guard (identical to tenant-lookup's): while both
// sources are live, a tenant_domains match to tenant A is cross-checked against
// the legacy tenants.domain row for the same host. If legacy maps the host to a
// DIFFERENT tenant B, refuse — log a greppable `TENANT_DIVERGENCE host=<h>
// td=<A> legacy=<B>` line and throw, rather than silently pick one. Proceed
// with the tenant_domains-first result ONLY when legacy agrees or has no row.
// Remove this guard once tenants.domain is retired.
//
// This resolver keeps tenant.ts's own contract: it returns the FULL Tenant row
// and only ever resolves ACTIVE tenants (the id/domain loads filter status).
// The legacy divergence cross-check is status-agnostic (mirrors tenant-lookup)
// so a stale/inactive legacy row still trips the guard.
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  // Lowercase THEN strip www. so www.<host> / WWW.<HOST> / <host> all resolve
  // identically (matches tenant-lookup's normalization — otherwise the two
  // resolvers would diverge on mixed-case or www hosts). Order matters: the
  // www. regex is case-sensitive, so lowercasing first is required for a
  // mixed-case "WWW." prefix to strip at all.
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '')

  // 1. tenant_domains FIRST (host -> tenant_id).
  //
  // maybeSingle() (not single()), and the error is checked explicitly —
  // mirrors tenant-lookup.ts's fix. This query's `error` used to be
  // discarded (only `data` was destructured), so ANY failure here — not just
  // the expected "0 rows, host not yet migrated" case — looked identical to
  // "no tenant_domains row" and fell straight through to the tenants.domain
  // fallback below, completely skipping the TRANSITION divergence guard (it
  // only runs inside `if (domainRow?.tenant_id)`). tenant_domains.domain IS
  // unique at the DB level (migrations/043_tenant_domains.sql), so
  // maybeSingle() erroring here can only mean a genuine query failure, never
  // row-count ambiguity — safe to always fail closed on it.
  const { data: domainRow, error: domainRowError } = await supabaseAdmin
    .from('tenant_domains')
    .select('*')
    .eq('domain', cleanDomain)
    .eq('active', true)
    .maybeSingle()

  if (domainRowError) {
    console.error(
      `TENANT_DOMAINS_LOOKUP_ERROR host=${cleanDomain} error=${domainRowError.message}`,
    )
    throw new Error(
      `TENANT_DOMAINS_LOOKUP_ERROR host=${cleanDomain} error=${domainRowError.message}`,
    )
  }

  if (domainRow?.tenant_id) {
    const { data: t } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', domainRow.tenant_id)
      .eq('status', 'active')
      .single()

    if (t) {
      // TRANSITION ASSERT-AND-REFUSE: cross-check the legacy tenants.domain row
      // for this host. If it maps the SAME host to a DIFFERENT tenant, refuse.
      //
      // maybeSingle() (not single()): tenants.domain carries NO unique
      // constraint at the DB level (unlike tenant_domains.domain — see
      // supabase/schema.sql vs migrations/043_tenant_domains.sql), so two
      // legacy rows can genuinely share a host. single() surfaces that as an
      // error with data:null, indistinguishable once destructured from "no
      // legacy row" — silently disabling this guard on exactly the input (an
      // ambiguous legacy table) it exists to catch. maybeSingle() still errors
      // on 2+ rows, but we check for it explicitly instead of discarding it.
      const { data: legacy, error: legacyError } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('domain', cleanDomain)
        .maybeSingle()

      if (legacyError) {
        console.error(
          `TENANT_DIVERGENCE_AMBIGUOUS host=${cleanDomain} td=${t.id} legacy_error=${legacyError.message}`,
        )
        throw new Error(
          `TENANT_DIVERGENCE_AMBIGUOUS host=${cleanDomain} td=${t.id} legacy_error=${legacyError.message}`,
        )
      }

      if (legacy && legacy.id !== t.id) {
        console.error(`TENANT_DIVERGENCE host=${cleanDomain} td=${t.id} legacy=${legacy.id}`)
        throw new Error(
          `TENANT_DIVERGENCE host=${cleanDomain} td=${t.id} legacy=${legacy.id}`,
        )
      }

      return t
    }

    // Dangling / inactive tenant_domains pointer: do NOT fall through to
    // tenants.domain — that could serve the host as a different tenant.
    return null
  }

  // 2. Fallback: tenants.domain (legacy source of truth, retained per P1 spec).
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('domain', cleanDomain)
    .eq('status', 'active')
    .single()

  return data
}

// Fallback tenant resolver for code paths that don't have a conversation/host
// context (e.g. agent fallback path in src/lib/yinez/agent.ts). Throws when
// no tenant can be inferred — that's the correct multi-tenant behavior over
// silently leaking across tenants.
export async function getCurrentTenantId(): Promise<string> {
  const t = await getCurrentTenant()
  if (!t) throw new Error('No tenant context — cannot resolve tenant id')
  return t.id
}
