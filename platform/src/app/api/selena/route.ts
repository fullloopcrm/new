import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { EMPTY_CHECKLIST, getClientProfile } from '@/lib/selena'

const CHECKLIST_FIELDS = ['service_type', 'bedrooms', 'bathrooms', 'rate', 'day', 'time', 'name', 'phone', 'address', 'email']

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { searchParams } = new URL(req.url)
    const convoId = searchParams.get('convoId')
    const since = searchParams.get('since')

    if (convoId) {
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
    if (since) query = query.gte('created_at', since)
    const { data: allConvos } = await query
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
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Selena API error:', err)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

// ── Reset a stuck conversation ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { conversationId } = await req.json()
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

    // 1. Load the conversation (scoped to tenant)
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations')
      .select('id, phone, client_id, booking_checklist, tenant_id')
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single()
    if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

    // 2. Expire the stuck conversation
    await supabaseAdmin.from('sms_conversations').update({
      expired: true,
      outcome: 'reset',
      summary: 'Admin reset — conversation was stuck',
      updated_at: new Date().toISOString(),
    }).eq('id', conversationId)

    // 3. If SMS, create a fresh conversation and send recovery text
    const isSMS = convo.phone && !convo.phone.startsWith('web-')
    let newConvoId: string | null = null

    if (isSMS) {
      const cleanPhone = convo.phone.replace(/\D/g, '').slice(-10)

      // Pre-fill from client profile if returning
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

      const { data: newConvo } = await supabaseAdmin.from('sms_conversations')
        .insert({ phone: cleanPhone, state: 'active', client_id: convo.client_id, booking_checklist: prefilled, tenant_id: tenantId })
        .select('id').single()
      newConvoId = newConvo?.id || null

      // Get tenant SMS credentials
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()

      if (tenant?.telnyx_api_key && tenant?.telnyx_phone) {
        const recoveryMsg = "Hey! Sorry about that — we had a hiccup on our end. Let's start fresh. What can I help you with?"
        await sendSMS({
          to: `+1${cleanPhone}`,
          body: recoveryMsg,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })

        // Log the outbound
        if (newConvoId) {
          await supabaseAdmin.from('sms_conversation_messages').insert({
            conversation_id: newConvoId,
            direction: 'outbound',
            message: recoveryMsg,
          })
        }
      }
    }

    return NextResponse.json({ success: true, expired: conversationId, newConversation: newConvoId })
  } catch (err) {
    console.error('Selena reset error:', err)
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
