import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { tenantDb } from '@/lib/tenant-db'

// GET /api/admin/comhub/voice/active — active calls for current tenant.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)

  const { data, error } = await db
    .from('comhub_active_calls')
    .select(
      'id, customer_call_id, admin_call_id, thread_id, contact_id, ' +
        'customer_phone, admin_phone, direction, status, hold, muted, ' +
        'started_at, answered_at, duration_secs',
    )
    .in('status', ['ringing', 'bridged', 'voicemail'])
    .order('started_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ active_calls: data ?? [] })
}
