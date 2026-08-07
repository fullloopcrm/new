import { NextResponse } from 'next/server'
import { requireComhubAccess } from '@/lib/comhub-access'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/admin/comhub/voice/active — active calls for current tenant.
export async function GET() {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId

  const { data, error } = await supabaseAdmin
    .from('comhub_active_calls')
    .select(
      'id, customer_call_id, admin_call_id, thread_id, contact_id, ' +
        'customer_phone, admin_phone, direction, status, hold, muted, ' +
        'started_at, answered_at, duration_secs',
    )
    .eq('tenant_id', tenantId)
    .in('status', ['ringing', 'bridged', 'voicemail'])
    .order('started_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ active_calls: data ?? [] })
}
