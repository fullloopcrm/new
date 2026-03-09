import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']
const IMPERSONATE_COOKIE = 'fl_impersonate'

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
  stripe_account_id: string | null
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

// Check if current user is super admin impersonating a tenant
async function getImpersonatedTenant(userId: string): Promise<Tenant | null> {
  if (!SUPER_ADMIN_IDS.includes(userId)) return null

  const cookieStore = await cookies()
  const impersonateId = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (!impersonateId) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', impersonateId)
    .single()

  return tenant
}

// Get the current tenant for the logged-in user (server-side)
export async function getCurrentTenant(): Promise<Tenant | null> {
  const { userId } = await auth()
  if (!userId) return null

  // Check impersonation first
  const impersonated = await getImpersonatedTenant(userId)
  if (impersonated) return impersonated

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
  const { userId } = await auth()
  if (!userId || !SUPER_ADMIN_IDS.includes(userId)) return false

  const cookieStore = await cookies()
  return !!cookieStore.get(IMPERSONATE_COOKIE)?.value
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
