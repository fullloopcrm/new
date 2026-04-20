/**
 * Legacy one-shot — nycmaid's SMS migration helper. Obsolete on fullloop
 * (data is migrated at tenant onboarding time, not via this path).
 * Kept as a tenant-scoped no-op for URL parity.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'

export async function POST() {
  const { error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  return NextResponse.json({
    success: true,
    migrated: 0,
    note: 'This endpoint is a compatibility shim. Fullloop handles SMS migration at tenant onboarding.',
  })
}
