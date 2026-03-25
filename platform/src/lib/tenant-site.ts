import { headers } from 'next/headers'
import { supabaseAdmin } from './supabase'

export async function getTenantFromHeaders() {
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  if (!tenantId) return null

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()
  return data
}

export async function getTenantServices(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('service_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('sort_order')
  return data || []
}

export async function getTenantTeamCount(tenantId: string) {
  const { count } = await supabaseAdmin
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
  return count || 0
}

export async function getTenantAreas(tenantId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('selena_config')
    .eq('id', tenantId)
    .single()
  return (data?.selena_config as any)?.service_areas || []
}

export function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function fromSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function getTenantReviews(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('google_reviews')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data || []
}
