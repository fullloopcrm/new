import { NextResponse } from 'next/server'
import { requireComhubAccess } from '@/lib/comhub-access'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/admin/comhub/voice/cleanup
// Mark stale 'ringing' / 'voicemail' active_call rows as 'ended'.
export async function POST() {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId

  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('comhub_active_calls')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      hangup_cause: 'cleanup_stale',
    })
    .eq('tenant_id', tenantId)
    .in('status', ['ringing', 'voicemail'])
    .lt('started_at', cutoff)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, cleared: data?.length ?? 0 })
}
