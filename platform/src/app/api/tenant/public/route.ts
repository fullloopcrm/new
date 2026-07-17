/**
 * Public tenant info — safe fields only.
 * Used by public pages (e.g. /portal/collect) that need tenant branding
 * on the client without leaking API keys or internal config.
 */
import { NextResponse } from 'next/server'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getPrimaryTenantDomain } from '@/lib/domains'

export async function GET() {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // tenant_domains FIRST, tenants.domain FALLBACK — mirrors tenantSiteUrl()'s
  // resolution order. This field feeds dashboard/users' team-login-link UI,
  // which silently no-ops (renders a placeholder, no error) when domain is
  // null — a tenant_domains-only tenant got no login link at all.
  const domain = (await getPrimaryTenantDomain(tenant.id)) || tenant.domain || null

  return NextResponse.json({
    name: tenant.name,
    primary_color: tenant.primary_color || null,
    logo_url: tenant.logo_url || null,
    domain,
    privacy_url: tenant.privacy_url || null,
    terms_url: tenant.terms_url || null,
    tagline: tenant.tagline || null,
    phone: tenant.phone || null,
    email: tenant.email || null,
    industry: tenant.industry || null,
  })
}
