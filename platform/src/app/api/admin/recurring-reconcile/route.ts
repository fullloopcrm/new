import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { reconcileRecurringSchedules } from '@/lib/recurring-reconcile'

// Read-only drift check between recurring_schedules config and the actual
// generated bookings for this tenant. Never mutates anything.
export async function GET(request: Request) {
  const { tenant, error } = await requirePermission('schedules.view')
  if (error) return error

  const windowParam = new URL(request.url).searchParams.get('window_days')
  const windowDays = windowParam ? Math.max(1, Math.min(180, parseInt(windowParam, 10) || 60)) : 60

  const report = await reconcileRecurringSchedules(tenant.tenantId, windowDays)
  return NextResponse.json(report)
}
