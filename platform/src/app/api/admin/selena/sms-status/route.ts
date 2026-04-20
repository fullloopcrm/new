/**
 * Selena SMS monitoring — last N outbound messages, filterable by phone.
 * Tenant-scoped. Internal-key OR admin permission auth.
 *
 * Fullloop has no `sms_logs` table yet — data is sourced from
 * sms_conversation_messages (direction='outbound'), joined back to the
 * conversation + client. For non-conversation sends (e.g. reminder crons),
 * logging would need a future sms_logs table.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

async function authorize(req: NextRequest): Promise<{ tenantId: string } | NextResponse> {
  const monitorKey = req.headers.get('x-monitor-key') || req.nextUrl.searchParams.get('key')
  const tenantParam = req.nextUrl.searchParams.get('tenant_id')

  if (monitorKey && process.env.ELCHAPO_MONITOR_KEY && monitorKey === process.env.ELCHAPO_MONITOR_KEY) {
    if (!tenantParam) {
      return NextResponse.json({ error: 'tenant_id query param required for monitor key access' }, { status: 400 })
    }
    return { tenantId: tenantParam }
  }

  const { tenant, error } = await requirePermission('notifications.view')
  if (error) return error
  return { tenantId: tenant.tenantId }
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req)
  if (auth instanceof NextResponse) return auth

  const { tenantId } = auth
  const phone = req.nextUrl.searchParams.get('phone')
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 200)

  let query = supabaseAdmin
    .from('sms_conversation_messages')
    .select('id, conversation_id, message, created_at, sms_conversations!inner(phone, client_id, tenant_id)')
    .eq('direction', 'outbound')
    .eq('sms_conversations.tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (phone) {
    const digits = phone.replace(/\D/g, '').slice(-10)
    query = query.ilike('sms_conversations.phone', `%${digits}%`)
  }

  const { data: logs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    total: logs?.length || 0,
    logs: (logs || []).map(l => {
      const convo = l.sms_conversations as unknown as { phone: string; client_id: string | null } | null
      return {
        id: l.id,
        conversation_id: l.conversation_id,
        recipient: convo?.phone || null,
        client_id: convo?.client_id || null,
        message: l.message,
        sent_at: l.created_at,
      }
    }),
  })
}
