import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { sendTenantTelegram } from '@/lib/notify'

// Rating capture for the combined 30-min-alert bill+rating text (route.ts).
// Payment is NEVER gated by any of this — the pay link already went out
// unconditionally in that same text. This only handles what happens after
// the client replies with a rating (2026-08-07, Jeff):
//   1-3 → Telegram alert to the admin, no automated reply to the client.
//   4-5 → stamps ratings.review_offer_due_at = now + 10 min. A separate cron
//         (cron/review-offer) sends the "$20 off, leave a Google review"
//         text once that time passes and marks review_offer_sent_at — kept
//         out of this request/response cycle entirely.
//
// Matched off the most recent '30min_payment' sms_log to this phone for this
// tenant (that's the only outbound text a rating reply could be responding
// to now that billing and rating share one message).
//
// Returns a Response when it handled the message (caller should return it), or
// null to fall through to the generic handler.
const REVIEW_OFFER_DELAY_MS = 10 * 60 * 1000

export async function handleReviewRating(
  { tenantId, from, text }: { tenantId: string; from: string; text: string },
): Promise<Response | null> {
  const rawText = (text || '').trim()
  if (!rawText) return null
  const cleanPhone = String(from).replace(/\D/g, '').slice(-10)
  if (!cleanPhone) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, telnyx_api_key, telnyx_phone, telegram_bot_token, telegram_chat_id')
    .eq('id', tenantId)
    .single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) return null

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: prompt } = await supabaseAdmin
    .from('sms_logs')
    .select('booking_id')
    .eq('tenant_id', tenantId)
    .ilike('recipient', `%${cleanPhone}%`)
    .eq('sms_type', '30min_payment')
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!prompt?.booking_id) return null

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, team_member_id, clients(name, phone), team_members!bookings_team_member_id_fkey(name)')
    .eq('id', prompt.booking_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!booking) return null

  const teamMemberName = (booking.team_members as unknown as { name?: string } | null)?.name || 'your team member'
  const teamMemberFirst = teamMemberName.split(' ')[0]
  const client = booking.clients as unknown as { name?: string; phone?: string } | null
  const clientName = client?.name || 'the client'
  const clientPhone = client?.phone || from

  // Leading-digit match: catches "5", "5!", "5/5", "5 stars", "5⭐️ amazing!",
  // "5. She was great!" — anything real clients actually type, as long as the
  // digit is the first thing in the reply (so "I had 2 cleaners" and "Paid"
  // don't false-match).
  const cleaned = rawText.replace(/^[\s"']+/, '')
  const m = cleaned.match(/^([1-5])\b/)
  const num = m ? Number(m[1]) : null

  const { data: existing } = await supabaseAdmin
    .from('ratings')
    .select('service_rating, feedback')
    .eq('booking_id', booking.id)
    .maybeSingle()

  if (!existing) {
    if (num != null) {
      const reviewOfferDueAt = num >= 4 ? new Date(Date.now() + REVIEW_OFFER_DELAY_MS).toISOString() : null
      await supabaseAdmin.from('ratings').insert({
        tenant_id: tenantId,
        booking_id: booking.id,
        client_id: booking.client_id,
        team_member_id: booking.team_member_id,
        service_rating: num,
        cleaner_rating: num,
        review_offer_due_at: reviewOfferDueAt,
      })
      await supabaseAdmin.from('client_feedback').insert({
        tenant_id: tenantId,
        client_id: booking.client_id,
        source: 'sms_rating',
        category: 'client',
        message: `Rating: ${num}/5 for ${teamMemberFirst}`,
        is_anonymous: false,
      }).then(() => {}, () => {})

      if (num >= 4) {
        // Review-offer text is sent later by cron/review-offer, not here.
        sendTenantTelegram(
          tenantId,
          { telegram_bot_token: tenant.telegram_bot_token as string | null, telegram_chat_id: tenant.telegram_chat_id as string | null },
          `★ ${num}/5 ${teamMemberFirst} — ${clientName}. Review offer will send in 10 min.`,
        ).catch(() => {})
      } else {
        // 1-3: Telegram alert to admin, no automated reply to the client.
        sendTenantTelegram(
          tenantId,
          { telegram_bot_token: tenant.telegram_bot_token as string | null, telegram_chat_id: tenant.telegram_chat_id as string | null },
          `⚠️ ${num}/5 ${teamMemberFirst} — ${clientName} (${clientPhone}). Low rating on booking ${booking.id}. Take over the conversation.`,
        ).catch(() => {})
        if (num <= 2) {
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'review_received',
            title: `Low rating: ${num}/5 (${teamMemberFirst})`,
            message: `Booking ${booking.id.slice(0, 8)} rated ${num}/5 — follow up recommended.`,
            booking_id: booking.id,
          }).then(() => {}, () => {})
        }
      }
      return NextResponse.json({ ok: true, action: 'rating_captured', rating: num })
    }

    // Non-numeric reply to a rating ask → store as feedback only.
    await supabaseAdmin.from('ratings').insert({
      tenant_id: tenantId,
      booking_id: booking.id,
      client_id: booking.client_id,
      team_member_id: booking.team_member_id,
      feedback: rawText.slice(0, 500) || null,
    })
    await supabaseAdmin.from('client_feedback').insert({
      tenant_id: tenantId,
      client_id: booking.client_id,
      source: 'sms_rating',
      category: 'client',
      message: rawText.slice(0, 2000),
      is_anonymous: false,
    }).then(() => {}, () => {})
    sendTenantTelegram(
      tenantId,
      { telegram_bot_token: tenant.telegram_bot_token as string | null, telegram_chat_id: tenant.telegram_chat_id as string | null },
      `Feedback for ${teamMemberFirst} (no numeric rating) — "${rawText.slice(0, 200)}"`,
    ).catch(() => {})
    return NextResponse.json({ ok: true, action: 'feedback_captured' })
  }

  // A <5 rating exists with no feedback yet → this reply IS the feedback.
  if (existing.service_rating != null && existing.service_rating < 5 && !existing.feedback) {
    const fb = rawText.slice(0, 500) || null
    await supabaseAdmin.from('ratings').update({ feedback: fb }).eq('booking_id', booking.id)
    await supabaseAdmin.from('client_feedback').insert({
      tenant_id: tenantId,
      client_id: booking.client_id,
      source: 'sms_rating',
      category: 'client',
      message: `Rating: ${existing.service_rating}/5 for ${teamMemberFirst}${fb ? ` — "${fb}"` : ''}`,
      is_anonymous: false,
    }).then(() => {}, () => {})
    await sendSMS({
      to: from,
      body: `Thanks — recorded. We'll review and follow up if needed.`,
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    }).catch(() => {})
    sendTenantTelegram(
      tenantId,
      { telegram_bot_token: tenant.telegram_bot_token as string | null, telegram_chat_id: tenant.telegram_chat_id as string | null },
      `★ ${existing.service_rating}/5 ${teamMemberFirst}${fb ? ` — "${fb}"` : ''}`,
    ).catch(() => {})
    return NextResponse.json({ ok: true, action: 'feedback_saved' })
  }

  return null
}
