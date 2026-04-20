/**
 * Selena admin dashboard: conversations list + aggregate stats.
 * Tenant-scoped. Ported from nycmaid.
 *
 * GET ?convoId=... returns messages for that conversation.
 * GET ?since=... filters stats window.
 * POST resets a stuck conversation — marks expired and (for SMS) kicks off a
 * fresh conversation with a recovery message.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { EMPTY_CHECKLIST, getClientProfile } from '@/lib/selena'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

const CHECKLIST_FIELDS = ['name', 'phone', 'service_type', 'bedrooms', 'bathrooms', 'rate', 'day', 'time', 'address', 'email']

interface ConvoRow {
  id: string
  phone: string | null
  name: string | null
  client_id: string | null
  state: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  expired: boolean | null
  outcome: string | null
  summary: string | null
  booking_checklist: Record<string, unknown> | null
  booking_id: string | null
}

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { searchParams } = new URL(req.url)
    const convoId = searchParams.get('convoId')
    const since = searchParams.get('since')

    if (convoId) {
      // Tenant-verify: only return messages for convos owned by this tenant.
      const { data: convo } = await supabaseAdmin
        .from('sms_conversations')
        .select('id')
        .eq('id', convoId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!convo) return NextResponse.json({ messages: [] })

      const { data: messages } = await supabaseAdmin
        .from('sms_conversation_messages')
        .select('direction, message, created_at')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true })
      return NextResponse.json({ messages: messages || [] })
    }

    let query = supabaseAdmin
      .from('sms_conversations')
      .select('id, phone, name, client_id, state, created_at, updated_at, completed_at, expired, outcome, summary, booking_checklist, booking_id')
      .eq('tenant_id', tenantId)
      .not('booking_checklist', 'is', null)
    if (since) query = query.gte('created_at', since)

    const { data: allConvosRaw } = await query.order('updated_at', { ascending: false }).limit(100)
    const all = (allConvosRaw as ConvoRow[] | null) || []
    const conversations = all.slice(0, 20)

    let confirmed = 0, abandoned = 0, active = 0, leadsCapture = 0, totalRating = 0, ratingCount = 0, escalations = 0
    const byChannel: Record<string, number> = { sms: 0, web: 0, other: 0 }
    const byStatus: Record<string, number> = {}
    const missingFields: Record<string, number> = {}
    const checklistCounts: number[] = []
    const funnel: Record<string, number> = Object.fromEntries([...CHECKLIST_FIELDS, 'recap', 'booked'].map(f => [f, 0]))

    for (const c of all) {
      const cl = c.booking_checklist || {}
      const status = (cl.status as string) || (c.expired ? 'expired' : 'unknown')

      if (c.outcome === 'booked' || status === 'confirmed' || status === 'closed') confirmed++
      else if (c.expired || c.outcome === 'abandoned') abandoned++
      else if (!c.completed_at && !c.expired) active++

      if (typeof cl.rating === 'number') {
        totalRating += cl.rating as number
        ratingCount++
      }

      const channel = (cl.channel as string | undefined) || (c.phone?.startsWith('web-') ? 'web' : 'sms')
      byChannel[channel === 'sms' || channel === 'web' ? channel : 'other']++
      byStatus[status] = (byStatus[status] || 0) + 1

      let filled = 0
      for (const f of CHECKLIST_FIELDS) {
        if (cl[f] !== null && cl[f] !== undefined) { filled++; funnel[f]++ }
        else missingFields[f] = (missingFields[f] || 0) + 1
      }
      if (['recap', 'confirmed', 'closed', 'rating'].includes(status)) funnel['recap']++
      if (c.outcome === 'booked' || status === 'confirmed' || status === 'closed') funnel['booked']++
      checklistCounts.push(filled)

      if (cl.name && cl.phone && c.outcome !== 'booked' && !['confirmed', 'closed'].includes(status)) leadsCapture++
      if (c.outcome === 'escalated' || c.summary?.includes('escalat')) escalations++
    }

    let totalMessages = 0
    for (const c of conversations) {
      const { count } = await supabaseAdmin
        .from('sms_conversation_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
      totalMessages += count || 0
    }

    const stats = {
      total: all.length,
      confirmed,
      abandoned,
      active,
      leadsCapture,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : null,
      ratingCount,
      avgMessages: conversations.length > 0 ? Math.round(totalMessages / conversations.length) : 0,
      avgChecklist: checklistCounts.length > 0 ? checklistCounts.reduce((a, b) => a + b, 0) / checklistCounts.length : 0,
      byChannel,
      byStatus,
      missingFields,
      funnel,
      escalations,
    }

    const { data: errorLog } = await supabaseAdmin
      .from('notifications')
      .select('id, type, title, message, created_at')
      .eq('tenant_id', tenantId)
      .or('type.eq.selena_error,type.eq.escalation')
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ conversations, stats, errorLog: errorLog || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/admin/selena error:', err)
    return NextResponse.json({ error: 'Failed to fetch Selena stats' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { conversationId } = await req.json()
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

    const { data: convo } = await supabaseAdmin
      .from('sms_conversations')
      .select('id, phone, client_id, booking_checklist')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single()
    if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    await supabaseAdmin
      .from('sms_conversations')
      .update({
        expired: true,
        outcome: 'reset',
        summary: 'Admin reset — conversation was stuck',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)

    const phone = (convo.phone as string | null) || ''
    const isSMS = phone && !phone.startsWith('web-')
    let newConvoId: string | null = null

    if (isSMS) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10)
      const prefilled: Record<string, unknown> = { ...EMPTY_CHECKLIST, status: 'collecting', phone: `+1${cleanPhone}`, channel: 'sms' }

      if (convo.client_id) {
        try {
          const profile = JSON.parse(await getClientProfile(tenantId, cleanPhone))
          if (profile.name) prefilled.name = profile.name
          if (profile.address) prefilled.address = profile.address
          if (profile.email) prefilled.email = profile.email
          if (profile.last_rate) prefilled.rate = profile.last_rate
        } catch {}
      }

      const { data: newConvo } = await supabaseAdmin.from('sms_conversations').insert({
        tenant_id: tenantId,
        phone: cleanPhone,
        state: 'active',
        client_id: convo.client_id,
        booking_checklist: prefilled,
      }).select('id').single()
      newConvoId = (newConvo?.id as string | null) || null

      // Fetch tenant Telnyx creds for recovery SMS.
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()

      const recoveryText = "Hey! Sorry about that — we had a hiccup on our end. Let's start fresh. What can I help you with? 😊"
      if (tenant?.telnyx_api_key && tenant.telnyx_phone) {
        await sendSMS({
          to: `+1${cleanPhone}`,
          body: recoveryText,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(err => console.error('[selena reset] SMS failed:', err))
      }

      if (newConvoId) {
        await supabaseAdmin.from('sms_conversation_messages').insert({
          conversation_id: newConvoId,
          direction: 'outbound',
          message: recoveryText,
        })
      }
    }

    return NextResponse.json({ success: true, expired: conversationId, newConversation: newConvoId })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/admin/selena error:', err)
    return NextResponse.json({ error: 'Failed to reset conversation' }, { status: 500 })
  }
}
