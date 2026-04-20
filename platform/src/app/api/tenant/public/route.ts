/**
 * Public tenant info — safe fields only.
 * Used by public pages (e.g. /portal/collect) that need tenant branding
 * on the client without leaking API keys or internal config.
 */
import { NextResponse } from 'next/server'
import { getTenantFromHeaders } from '@/lib/tenant-site'

export async function GET() {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  return NextResponse.json({
    name: tenant.name,
    primary_color: tenant.primary_color || null,
    logo_url: tenant.logo_url || null,
    domain: tenant.domain || null,
    privacy_url: tenant.privacy_url || null,
    terms_url: tenant.terms_url || null,
    tagline: tenant.tagline || null,
  })
}
