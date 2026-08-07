import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Matches an inbound SMS to a pending admin->client feedback reply thread
// (started from /dashboard/clients/feedback's "Reply" button) and appends it
// as a note on the client_feedback row. Global, tenant-scoped — every tenant
// gets this once the reply button ships. Returns a Response when handled, or
// null to fall through to the next handler.
//
// This comment used to say "rating engine already ran first" — false. The
// real call order in webhooks/telnyx/route.ts runs this BEFORE the rating
// engine (nycmaid/review-engine.ts, review-engine.ts). A client with ANY
// pending admin-reply thread in the last 30 days permanently hijacks every
// numeric reply they ever send — including replies to the 30-min "how'd we
// do? 1-5" ask — so they never get billed or asked for a review. Reproduced
// live 2026-08-06: a single stale thread from 2026-07-25 silently swallowed
// every rating reply on that phone for 12 days straight. Rather than
// reorder the whole webhook (large, fragile diff), this now explicitly
// checks for an in-flight rating conversation and defers to it — matching
// what the original comment always claimed happened.
const REPLY_WINDOW_DAYS = 30
const RATING_ASK_WINDOW_HOURS = 24
const BILL_OFFER_WINDOW_HOURS = 2

async function hasActiveRatingConversation(from: string): Promise<boolean> {
  const cleanPhone = String(from).replace(/\D/g, '').slice(-10)
  if (!cleanPhone) return false
  const ratingAskSince = new Date(Date.now() - RATING_ASK_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const billOfferSince = new Date(Date.now() - BILL_OFFER_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('sms_logs')
    .select('id, sms_type, created_at')
    .ilike('recipient', `%${cleanPhone}%`)
    .in('sms_type', ['pre_payment_rating', 'rating_thanks_45'])
    .or(`and(sms_type.eq.pre_payment_rating,created_at.gte.${ratingAskSince}),and(sms_type.eq.rating_thanks_45,created_at.gte.${billOfferSince})`)
    .limit(1)
  return !!(data && data.length > 0)
}

export async function handleFeedbackReply(
  { tenantId, from, text }: { tenantId: string; from: string; text: string },
): Promise<Response | null> {
  const rawText = (text || '').trim()
  if (!rawText) return null

  if (await hasActiveRatingConversation(from)) return null

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('phone', from)
    .maybeSingle()
  if (!client) return null

  const windowStart = new Date(Date.now() - REPLY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: pending } = await supabaseAdmin
    .from('client_feedback')
    .select('id, notes')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .not('reply_requested_at', 'is', null)
    .gte('reply_requested_at', windowStart)
    .order('reply_requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!pending) return null

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const noteLine = `[${client.name || 'Client'} reply, ${timestamp}] ${rawText}`
  const updatedNotes = pending.notes ? `${pending.notes}\n${noteLine}` : noteLine

  await supabaseAdmin
    .from('client_feedback')
    .update({ notes: updatedNotes })
    .eq('id', pending.id)

  await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type: 'feedback_reply',
    title: `Feedback reply: ${client.name || 'Client'}`,
    message: rawText.slice(0, 500),
    metadata: { client_id: client.id, feedback_id: pending.id, phone: from },
  }).then(() => {}, () => {})

  return NextResponse.json({ received: true, action: 'feedback_reply_captured' })
}
