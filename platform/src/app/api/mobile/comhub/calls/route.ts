import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// GET /api/mobile/comhub/calls — recent call log for the Com Hub Home feed
// and Keypad's recents. Reads comhub_active_calls, the same table
// /api/admin/comhub/voice/active reads for in-progress calls — rows aren't
// deleted when a call ends (voice/cleanup only flips stale ones to
// 'ended'), so it doubles as the call history. 'system' rows (hold/transfer
// bookkeeping, see webhooks/telnyx-voice) aren't real calls and are
// excluded. There's no explicit "missed" status in the schema — a missed
// call is an inbound call that was never answered (answered_at null).
export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET() {
  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

  const { data, error } = await supabaseAdmin
    .from('comhub_active_calls')
    .select('id, contact_id, customer_phone, direction, status, answered_at, started_at, duration_secs')
    .eq('tenant_id', tenantId)
    .neq('direction', 'system')
    .order('started_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const contactIds = [...new Set(rows.map(r => r.contact_id).filter((id): id is string => !!id))]
  const contactsById = new Map<string, { id: string; name: string | null; phone: string | null }>()
  if (contactIds.length > 0) {
    const { data: contacts } = await supabaseAdmin
      .from('comhub_contacts')
      .select('id, name, phone')
      .in('id', contactIds)
    for (const c of contacts || []) contactsById.set(c.id, c)
  }

  const calls = rows.map(r => ({
    id: r.id,
    direction: r.direction === 'inbound' ? 'in' : 'out',
    status: r.direction === 'inbound' && !r.answered_at ? 'missed' : 'answered',
    duration_seconds: r.duration_secs ?? 0,
    occurred_at: r.started_at,
    contact: r.contact_id ? contactsById.get(r.contact_id) ?? null : null,
    from_number: r.contact_id ? undefined : r.customer_phone,
  }))

  return NextResponse.json({ calls })
})
