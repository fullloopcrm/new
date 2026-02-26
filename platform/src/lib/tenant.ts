import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from './supabase'

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
  resend_api_key: string | null
  telnyx_api_key: string | null
  telnyx_phone: string | null
  stripe_account_id: string | null
  google_place_id: string | null
}

// Get the current tenant for the logged-in user (server-side)
export async function getCurrentTenant(): Promise<Tenant | null> {
  const { userId } = await auth()
  if (!userId) return null

  // Look up which tenant this Clerk user belongs to
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
    .eq('status', 'active')
    .single()

  return tenant
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
