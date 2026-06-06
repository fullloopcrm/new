import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { getActiveAdminMemberId } from '@/lib/admin-member'
import { supabaseAdmin } from '@/lib/supabase'

type RingStrategy = 'browser_only' | 'cell_only' | 'browser_then_cell' | 'simultaneous'
type CallerIdMode = 'show_customer' | 'show_business'

const RING_STRATEGIES: RingStrategy[] = ['browser_only', 'cell_only', 'browser_then_cell', 'simultaneous']
const CALLER_ID_MODES: CallerIdMode[] = ['show_customer', 'show_business']

const DEFAULT_SETTINGS = {
  ring_strategy: 'browser_then_cell' as RingStrategy,
  caller_id_mode: 'show_customer' as CallerIdMode,
  auto_record: true,
  auto_transcribe: true,
  fallback_cell_phone: null,
  do_not_disturb_until: null,
}

// GET /api/admin/comhub/voice/settings — current admin's voice settings.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const adminId = await getActiveAdminMemberId(tenantId)
  if (!adminId) return NextResponse.json({ settings: DEFAULT_SETTINGS })

  const { data } = await supabaseAdmin
    .from('comhub_admin_voice_settings')
    .select('ring_strategy, caller_id_mode, auto_record, auto_transcribe, fallback_cell_phone, do_not_disturb_until')
    .eq('admin_id', adminId)
    .single()
  return NextResponse.json({ settings: data ?? DEFAULT_SETTINGS })
}

// PUT /api/admin/comhub/voice/settings — upsert.
export async function PUT(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const adminId = await getActiveAdminMemberId(tenantId)
  if (!adminId) return NextResponse.json({ error: 'no tenant member found' }, { status: 412 })

  const body = (await req.json().catch(() => null)) as {
    ring_strategy?: string
    caller_id_mode?: string
    auto_record?: boolean
    auto_transcribe?: boolean
    fallback_cell_phone?: string | null
    do_not_disturb_until?: string | null
  } | null
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.ring_strategy && (RING_STRATEGIES as string[]).includes(body.ring_strategy)) {
    update.ring_strategy = body.ring_strategy
  }
  if (body.caller_id_mode && (CALLER_ID_MODES as string[]).includes(body.caller_id_mode)) {
    update.caller_id_mode = body.caller_id_mode
  }
  if (typeof body.auto_record === 'boolean') update.auto_record = body.auto_record
  if (typeof body.auto_transcribe === 'boolean') update.auto_transcribe = body.auto_transcribe
  if (body.fallback_cell_phone !== undefined) update.fallback_cell_phone = body.fallback_cell_phone
  if (body.do_not_disturb_until !== undefined) update.do_not_disturb_until = body.do_not_disturb_until

  const { data, error } = await supabaseAdmin
    .from('comhub_admin_voice_settings')
    .upsert({ tenant_id: tenantId, admin_id: adminId, ...update }, { onConflict: 'admin_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
