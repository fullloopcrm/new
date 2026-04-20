/**
 * Public service types for the calling tenant.
 * Tenant resolved from the x-tenant-id header set by middleware.
 */
import { NextResponse } from 'next/server'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getSettings } from '@/lib/settings'

export async function GET() {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json([])

  const settings = await getSettings(tenant.id)
  const active = (settings.service_types || []).filter(s => s.active !== false)
  return NextResponse.json(active)
}
