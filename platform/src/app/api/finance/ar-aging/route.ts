/**
 * Accounts Receivable aging — unpaid invoices + unpaid completed bookings,
 * bucketed by days past due. Logic lives in src/lib/finance/ar-aging.ts so
 * other surfaces (dashboard homepage, Finance Overview) can share it.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'
import { getArAging } from '@/lib/finance/ar-aging'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const entityId = entityIdFromUrl(new URL(request.url))

    const result = await getArAging(tenantId, entityId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/ar-aging', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
