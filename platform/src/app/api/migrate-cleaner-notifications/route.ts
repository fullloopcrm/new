/**
 * Legacy one-shot — nycmaid's cleaner-notifications migration helper.
 * Obsolete on fullloop (team_notifications table exists from migration 007).
 * Compatibility shim only.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'

export async function POST() {
  const { error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  return NextResponse.json({
    success: true,
    migrated: 0,
    note: 'This endpoint is a compatibility shim. Fullloop uses team_notifications (migration 007).',
  })
}
