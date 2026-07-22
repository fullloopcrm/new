import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/nycmaid/sms'
import { smsAdmins } from '@/lib/nycmaid/admin-contacts'
import { smsReviewRequest } from '@/lib/nycmaid/sms-templates'

// NYC Maid review engine — tenant-scoped parity port (gated by isNycMaid in the
// telnyx webhook; see feedback_nycmaid_copyover_tenant_scoped). Ported from the
// standalone NYC Maid webhook/telnyx rating flow.
//
// IMPORTANT DIFFERENCE vs standalone NYC Maid: FullLoop's 30-min alert already
// sends the client the bill + Stripe pay-link + "reply 1-5" in ONE text, so this
// engine does NOT re-bill (standalone NYC Maid re-billed after the rating reply).
// It only CAPTURES the rating and GENERATES the review ask — no billing math,
// so no money-bug surface.
//
// $10 written-review credit ONLY — the $25 video-review option was removed per
// Jeff (2026-07-05).
//
// Two entry states, matched off the last outbound sms_log to this phone:
//   1) A 1-5 reply to a rating ask (sms_type 'pre_payment_rating' | 'rating_prompt')
//        → save rating; 5 → Google review link + $10 offer; 1-4 → feedback ask.
//   2) "DONE <link>" / "REVIEWED" / a bare link after a review_request
//        → log the review to client_reviews with a $10 pending credit.
//
// Returns a Response when it handled the message (caller should return it), or
// null to fall through to the generic handler.
export async function handleNycMaidReview(
  { tenantId, from, text }: { tenantId: string; from: string; text: string },
): Promise<Response | null> {
  const rawText = (text || '').trim()
  if (!rawText) return null
  const cleanPhone = String(from).replace(/\D/g, '').slice(-10)
  if (!cleanPhone) return null

  // ── State 2: review submission ("DONE/REVIEWED/POSTED" or a link) ──
  const reviewLink = rawText.match(/https?:\/\/\S+/)?.[0]
  const isDoneReply = /^(done|reviewed|posted)\b/i.test(rawText)
  if (reviewLink || isDoneReply) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: reviewReq } = await supabaseAdmin
      .from('sms_logs')  // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
      .select('booking_id')
      .ilike('recipient', `%${cleanPhone}%`)
      .eq('sms_type', 'review_request')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (reviewReq?.booking_id) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, team_member_id')
        .eq('id', reviewReq.booking_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (booking) {
        // Idempotent — one review credit per booking.
        const { data: existing } = await supabaseAdmin
          .from('client_reviews')
          .select('id')
          .eq('booking_id', booking.id)
          .maybeSingle()
        if (!existing) {
          await supabaseAdmin.from('client_reviews').insert({
            tenant_id: tenantId,
            client_id: booking.client_id,
            booking_id: booking.id,
            team_member_id: booking.team_member_id,
            type: 'text', // $10 written review only ($25 video removed)
            credit_amount: 10,
            proof_url: reviewLink || null,
            status: 'pending',
          })
        }
        await sendSMS(
          from,
          `Amazing — thank you! We've logged your review; your $10 credit will be applied. We appreciate you! 😊`,
          { skipConsent: true, smsType: 'review_credit_ack', bookingId: booking.id },
        ).catch(() => {})
        await smsAdmins(
          `✓ Review submitted — $10 credit pending. Booking ${booking.id.slice(0, 8)}.${reviewLink ? ` Link: ${reviewLink}` : ''}`,
        ).catch(() => {})
        return NextResponse.json({ ok: true, action: 'review_submitted' })
      }
    }
  }

  // ── State 1: 1-5 reply to a rating ask ──
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: prompt } = await supabaseAdmin
    .from('sms_logs')  // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
    .select('booking_id, sms_type')
    .ilike('recipient', `%${cleanPhone}%`)
    .in('sms_type', ['pre_payment_rating', 'rating_prompt'])
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!prompt?.booking_id) return null

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, team_member_id, team_members!bookings_team_member_id_fkey(name)')
    .eq('id', prompt.booking_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!booking) return null

  const cleanerName = (booking.team_members as unknown as { name?: string } | null)?.name || 'your cleaner'
  const cleanerFirst = cleanerName.split(' ')[0]

  // Strict: the message must BE the rating, not merely contain a digit.
  // Accepts "5", "5!", "5/5", "5 stars", "5⭐". Rejects "I had 2 cleaners".
  const cleaned = rawText.replace(/[.!?,]+$/, '')
  const m = cleaned.match(/^([1-5])(?:\s*\/\s*5)?(?:\s*(?:stars?|⭐+))?$/i)
  const num = m ? Number(m[1]) : null

  const { data: existing } = await supabaseAdmin
    .from('ratings')
    .select('service_rating, feedback')
    .eq('booking_id', booking.id)
    .maybeSingle()

  if (!existing) {
    if (num != null) {
      await supabaseAdmin.from('ratings').insert({
        tenant_id: tenantId,
        booking_id: booking.id,
        client_id: booking.client_id,
        team_member_id: booking.team_member_id,
        service_rating: num,
        cleaner_rating: num, // single-question flow: one rating reflects both
      })
      if (num >= 4) {
        await sendSMS(from, smsReviewRequest(cleanerName), {
          skipConsent: true,
          smsType: 'review_request',
          bookingId: booking.id,
        }).catch(() => {})
        await smsAdmins(`★ ${num}/5 ${cleanerFirst} — review link sent`).catch(() => {})
      } else {
        await sendSMS(
          from,
          `Thanks for the rating. What could we have done better? Any feedback helps us improve.`,
          { skipConsent: true, smsType: 'rating_followup', bookingId: booking.id },
        ).catch(() => {})
        await smsAdmins(`★ ${num}/5 ${cleanerFirst} — feedback requested`).catch(() => {})
        if (num <= 2) {
          await supabaseAdmin
            .from('notifications')
            .insert({
              tenant_id: tenantId,
              type: 'review_received',
              title: `Low rating: ${num}/5 (${cleanerFirst})`,
              message: `Booking ${booking.id.slice(0, 8)} rated ${num}/5 — follow up recommended.`,
              booking_id: booking.id,
            })
            .then(() => {}, () => {})
        }
      }
      return NextResponse.json({ ok: true, action: 'rating_captured', rating: num })
    }

    // Non-numeric reply to a rating ask → store as feedback only, no follow-up.
    await supabaseAdmin.from('ratings').insert({
      tenant_id: tenantId,
      booking_id: booking.id,
      client_id: booking.client_id,
      team_member_id: booking.team_member_id,
      feedback: rawText.slice(0, 500) || null,
    })
    await smsAdmins(`Feedback for ${cleanerFirst} (no numeric rating) — "${rawText.slice(0, 200)}"`).catch(() => {})
    return NextResponse.json({ ok: true, action: 'feedback_captured' })
  }

  // Step 2: a <5 rating exists with no feedback yet → this reply IS the feedback.
  if (existing.service_rating != null && existing.service_rating < 5 && !existing.feedback) {
    const fb = rawText.slice(0, 500) || null
    await supabaseAdmin.from('ratings').update({ feedback: fb }).eq('booking_id', booking.id)
    await sendSMS(from, `Thanks — recorded. We'll review and follow up if needed.`, {
      skipConsent: true,
      smsType: 'rating_thanks',
      bookingId: booking.id,
    }).catch(() => {})
    await smsAdmins(`★ ${existing.service_rating}/5 ${cleanerFirst}${fb ? ` — "${fb}"` : ''}`).catch(() => {})
    return NextResponse.json({ ok: true, action: 'feedback_saved' })
  }

  return null
}
