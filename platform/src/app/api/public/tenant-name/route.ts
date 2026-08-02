import { NextResponse } from 'next/server'
import { getTenantFromHeaders } from '@/lib/tenant-site'

/**
 * The tenant's display name, resolved from the signed x-tenant-id header
 * middleware sets on every tenant domain. Public and unauthenticated on
 * purpose — the name is already shown unauthenticated on the tenant's own
 * marketing site. Exists so pre-login client-component portals (Sales,
 * Referral) can greet with the real business name the same way the
 * server-rendered Team/Client login pages already do.
 */
export async function GET() {
  const tenant = await getTenantFromHeaders()
  return NextResponse.json({ name: tenant?.name || 'Full Loop' })
}
