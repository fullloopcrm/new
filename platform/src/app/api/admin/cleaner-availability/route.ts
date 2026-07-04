import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { checkCleanerAvailability } from '@/lib/nycmaid/availability'

export async function GET(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  // Resolve the operator's tenant — cleaner availability MUST be tenant-scoped,
  // otherwise it reads every tenant's cleaners/bookings (cross-tenant leak).
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time') || '09:00'
  const duration = Math.min(Math.max(parseInt(searchParams.get('duration') || '2') || 2, 1), 8)
  const excludeBooking = searchParams.get('exclude_booking') || undefined

  if (!date) {
    return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  }

  const cleaners = await checkCleanerAvailability(ctx.tenantId, date, startTime, duration, excludeBooking)
  return NextResponse.json({ cleaners })
}
