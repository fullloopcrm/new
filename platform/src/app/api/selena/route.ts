import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

const CHECKLIST_FIELDS = ['service_type', 'bedrooms', 'bathrooms', 'rate', 'day', 'time', 'name', 'phone', 'address', 'email']

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { searchParams } = new URL(req.url)
    const convoId = searchParams.get('convoId')

    if (convoId) {
      const { data: messages } = await supabaseAdmin
        .from('sms_conversation_messages')
        .select('direction, message, created_at')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true })
      return NextResponse.json({ messages: messages || [] })
    }

    const { data: allConvos } = await supabaseAdmin
      .from('sms_conversations')
      .select('id, phone, name, client_id, state, created_at, updated_at, completed_at, expired, outcome, summary, booking_checklist, booking_id')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(100)

    const conversations = (allConvos || []).slice(0, 20)
    const all = allConvos || []

    let confirmed = 0, abandoned = 0, active = 0, totalRating = 0, ratingCount = 0, escalations = 0
    const byChannel: Record<string, number> = { sms: 0, web: 0, other: 0 }
    const byStatus: Record<string, number> = {}
    const missingFields: Record<string, number> = {}
    const checklistCounts: number[] = []

    for (const c of all) {
      const cl = c.booking_checklist || {}
      const status = (cl.status as string) || (c.expired ? 'expired' : 'unknown')

      if (c.outcome === 'booked' || status === 'confirmed' || status === 'closed') confirmed++
      else if (c.expired || c.outcome === 'abandoned') abandoned++
      else if (!c.completed_at && !c.expired) active++

      if (cl.rating && typeof cl.rating === 'number') { totalRating += cl.rating; ratingCount++ }

      const channel = cl.channel || (c.phone?.startsWith('web-') ? 'web' : 'sms')
      if (channel === 'sms') byChannel.sms++
      else if (channel === 'web') byChannel.web++
      else byChannel.other++

      byStatus[status] = (byStatus[status] || 0) + 1

      let filled = 0
      for (const f of CHECKLIST_FIELDS) {
        if (cl[f] !== null && cl[f] !== undefined) filled++
        else missingFields[f] = (missingFields[f] || 0) + 1
      }
      checklistCounts.push(filled)

      if (c.outcome === 'escalated' || c.summary?.includes('escalat')) escalations++
    }

    let totalMessages = 0
    for (const c of conversations.slice(0, 10)) {
      const { count } = await supabaseAdmin
        .from('sms_conversation_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
      totalMessages += count || 0
    }

    const { data: errorLog } = await supabaseAdmin
      .from('notifications')
      .select('id, type, title, message, created_at')
      .eq('tenant_id', tenantId)
      .or('type.eq.selena_error,type.eq.escalation')
      .order('created_at', { ascending: false })
      .limit(50)

    const stats = {
      total: all.length, confirmed, abandoned, active,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : null, ratingCount,
      avgMessages: conversations.length > 0 ? Math.round(totalMessages / Math.min(conversations.length, 10)) : 0,
      avgChecklist: checklistCounts.length > 0 ? checklistCounts.reduce((a, b) => a + b, 0) / checklistCounts.length : 0,
      byChannel, byStatus, missingFields, escalations,
    }

    return NextResponse.json({ conversations, stats, errorLog: errorLog || [] })
  } catch (err) {
    console.error('Selena API error:', err)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
