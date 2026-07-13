import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { tenantDb } from '@/lib/tenant-db'

// POST /api/admin/comhub/voice/cleanup
// Mark stale 'ringing' / 'voicemail' active_call rows as 'ended'.
export async function POST() {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)

  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const { data, error } = await db
    .from('comhub_active_calls')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      hangup_cause: 'cleanup_stale',
    })
    .in('status', ['ringing', 'voicemail'])
    .lt('started_at', cutoff)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, cleared: data?.length ?? 0 })
}
