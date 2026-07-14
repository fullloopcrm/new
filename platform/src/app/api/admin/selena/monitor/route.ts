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
import { safeEqual } from '@/lib/secret-compare'

function authorized(request: NextRequest): boolean {
  const expected = process.env.ELCHAPO_MONITOR_KEY
  if (!expected) return false
  // Header only — a URL query-param key leaks into access/proxy logs and
  // browser history, unlike a header.
  const key = request.headers.get('x-monitor-key')
  return safeEqual(key, expected)
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

    // Always resolve the conversation's OWN tenant_id, not only when the
    // caller happens to supply a tenantId. The endpoint's auth is a single
    // global ELCHAPO_MONITOR_KEY (GET already returns platform-wide stats by
    // design when no tenant filter is given), so this isn't a privilege
    // escalation — but it makes the ownership check mandatory instead of an
    // easily-omitted opt-in, so a caller's mismatched tenantId claim is
    // always caught rather than silently ignored when left out.
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations')
      .select('id, tenant_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (tenantParam) {
      const claimedTenantId = await resolveTenantId(String(tenantParam))
      if (!claimedTenantId || claimedTenantId !== convo.tenant_id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    // sms_conversation_messages never populates tenant_id (every insert site
    // is `tenant-scope-ok: row-scoped by conversation_id`) — tenantDb() here
    // would silently return zero rows. Scoping is already closed above: this
    // conversationId is confirmed owned by convo.tenant_id before we get here.
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
