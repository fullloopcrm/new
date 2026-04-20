/**
 * External monitoring endpoint for Selena. Bearer-keyed (ELCHAPO_MONITOR_KEY)
 * so ops monitoring tools can scrape stats without holding an admin session.
 * Multi-tenant: accepts ?tenant=<id-or-slug>. If omitted, returns platform-wide
 * numbers (summed across tenants).
 *
 * GET — conversations + stats + recent errors.
 * POST { conversationId, tenantId } — messages for one conversation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function authorized(request: NextRequest): boolean {
  const expected = process.env.ELCHAPO_MONITOR_KEY
  if (!expected) return false
  const key = request.headers.get('x-monitor-key') || request.nextUrl.searchParams.get('key')
  return key === expected
}

async function resolveTenantId(param: string | null): Promise<string | null> {
  if (!param) return null
  const isUUID = /^[0-9a-f]{8}-/.test(param)
  const { data } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq(isUUID ? 'id' : 'slug', param)
    .maybeSingle()
  return data?.id || null
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tenantParam = request.nextUrl.searchParams.get('tenant')
    const since = request.nextUrl.searchParams.get('since')
    const tenantId = await resolveTenantId(tenantParam)
    if (tenantParam && !tenantId) {
      return NextResponse.json({ error: 'Unknown tenant' }, { status: 404 })
    }

    let convoQuery = supabaseAdmin
      .from('sms_conversations')
      .select('id, tenant_id, phone, name, state, outcome, summary, booking_checklist, created_at, updated_at, completed_at, expired')
      .not('booking_checklist', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(30)
    if (tenantId) convoQuery = convoQuery.eq('tenant_id', tenantId)
    if (since) convoQuery = convoQuery.gte('updated_at', since)
    const { data: conversations, error: convoErr } = await convoQuery
    if (convoErr) throw convoErr

    const countOutcome = async (outcome?: string) => {
      let q = supabaseAdmin
        .from('sms_conversations')
        .select('*', { count: 'exact', head: true })
        .not('booking_checklist', 'is', null)
      if (tenantId) q = q.eq('tenant_id', tenantId)
      if (outcome) q = q.eq('outcome', outcome)
      const { count } = await q
      return count ?? 0
    }

    const [total, booked, abandoned, escalated] = await Promise.all([
      countOutcome(),
      countOutcome('booked'),
      countOutcome('abandoned'),
      countOutcome('escalated'),
    ])

    let errorQuery = supabaseAdmin
      .from('notifications')
      .select('id, type, title, message, created_at, tenant_id')
      .in('type', ['selena_error', 'escalation', 'review_received'])
      .order('created_at', { ascending: false })
      .limit(20)
    if (tenantId) errorQuery = errorQuery.eq('tenant_id', tenantId)
    const { data: errors } = await errorQuery

    return NextResponse.json({
      conversations: conversations || [],
      stats: { total, booked, abandoned, escalated },
      errors: errors || [],
      tenantId,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { conversationId, tenantId: tenantParam } = await request.json()
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
    }

    // Verify convo belongs to the claimed tenant (if one is given).
    if (tenantParam) {
      const tenantId = await resolveTenantId(String(tenantParam))
      if (!tenantId) return NextResponse.json({ error: 'Unknown tenant' }, { status: 404 })
      const { data: convo } = await supabaseAdmin
        .from('sms_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: messages, error } = await supabaseAdmin
      .from('sms_conversation_messages')
      .select('direction, message, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ messages: messages || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
