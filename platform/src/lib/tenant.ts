import { auth } from '@clerk/nextjs/server'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import { IMPERSONATE_COOKIE, verifyImpersonationCookie } from './impersonation'
import { verifyTenantHeaderSig } from './tenant-header-sig'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']

export type Tenant = {
  id: string
  name: string
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

  const { userId } = await auth()
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
  const { userId } = await auth()
  if (userId && SUPER_ADMIN_IDS.includes(userId)) return true

  return false
}

// Get tenant by slug (for subdomain routing)
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  return data
}

// Get tenant by custom domain
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('domain', domain)
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
