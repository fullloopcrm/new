import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// GET /api/mobile/comhub/activity — mobile-scoped equivalent of the existing
// /api/audit route (same table, same auth). NOTE: this is the tenant's
// general audit trail (action/entity_type/details on audit_logs), not
// SMS/email delivery-failure events specifically — no such tracked concept
// exists in the backend today (checked: nothing writes a delivery-failed
// audit_logs row, and comhub_messages has no delivery-status column). The
// app's mock fixture for this screen assumes a `delivery_failed`-shaped
// feed; this route intentionally returns the real, honest shape instead of
// forcing audit_logs rows into that mock's fields. Screen needs a matching
// adjustment, or Activity needs to be redefined as delivery-failure
// tracking specifically (new instrumentation, not yet built) — Jeff's call.
export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(req: NextRequest) {
  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 50, 200)

  const { data, error } = await tenantDb(tenantId)
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })

  const events = (data || []).map(row => ({
    id: row.id,
    type: row.action,
    entity_type: row.entity_type,
    occurred_at: row.created_at,
    details: row.details,
  }))

  return NextResponse.json({ events })
})
