import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { smsAdmins } from '@/lib/admin-contacts'
import { smsReviewRequest } from '@/lib/sms-templates'
import { getSettings } from '@/lib/settings'

// Global rating + review-incentive engine — the core of NYC Maid's review
// flow (src/lib/nycmaid/review-engine.ts), generalized for every tenant.
// The 1-5 rating ASK is already global (team-portal/15min-alert sends "how'd
// we do? reply 1-5" to every tenant's client); this is what was missing —
// capturing the reply and, on a 4-5, offering a review-credit using THIS
// tenant's own Google review link and business name. NYC Maid keeps its own
// hand-tuned copy (video-review option, referral-program plug) via the
// separate nycmaid engine; this generic version is the plain core: rating →
// (if good) review ask + $10 credit, or (if not) a feedback ask.
//
// Same two entry states as the nycmaid engine, matched off the last outbound
// sms_log to this phone for this tenant:
//   1) A 1-5 reply to a rating ask (sms_type 'pre_payment_rating' | 'rating_prompt')
//        → save rating; 4-5 → review link + $10 offer; 1-3 → feedback ask.
//   2) "DONE <link>" / "REVIEWED" / a bare link after a review_request
//        → log the review to client_reviews with a $10 pending credit.
//
// Returns a Response when it handled the message (caller should return it), or
// null to fall through to the generic handler.
const REVIEW_CREDIT_DOLLARS = 10

export async function handleReviewRating(
  { tenantId, from, text }: { tenantId: string; from: string; text: string },
): Promise<Response | null> {
  const rawText = (text || '').trim()
  if (!rawText) return null
  const cleanPhone = String(from).replace(/\D/g, '').slice(-10)
  if (!cleanPhone) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, telnyx_api_key, telnyx_phone, domain, slug')
    .eq('id', tenantId)
    .single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) return null
  const bizName = tenant.name || 'We'

  const reviewUrl = async () => {
    const settings = await getSettings(tenantId)
    return settings.google_review_link
      || (tenant.domain
        ? `https://${tenant.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/reviews/submit`
        : `https://${tenant.slug}.homeservicesbusinesscrm.com/reviews/submit`)
  }

  // ── State 2: review submission ("DONE/REVIEWED/POSTED" or a link) ──
  const reviewLink = rawText.match(/https?:\/\/\S+/)?.[0]
  const isDoneReply = /^(done|reviewed|posted)\b/i.test(rawText)
  if (reviewLink || isDoneReply) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: reviewReq } = await supabaseAdmin
      .from('sms_logs')
      .select('booking_id')
      .eq('tenant_id', tenantId)
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
            type: 'text',
            credit_amount: REVIEW_CREDIT_DOLLARS,
            proof_url: reviewLink || null,
            status: 'pending',
          })
        }
        await sendSMS({
          to: from,
          body: `Amazing — thank you! We've logged your review; your $${REVIEW_CREDIT_DOLLARS} credit will be applied. We appreciate you!`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(() => {})
        await smsAdmins(
          tenantId,
          `✓ Review submitted — $${REVIEW_CREDIT_DOLLARS} credit pending. Booking ${booking.id.slice(0, 8)}.${reviewLink ? ` Link: ${reviewLink}` : ''}`,
        ).catch(() => {})
        return NextResponse.json({ ok: true, action: 'review_submitted' })
      }
    }
  }

  // ── State 1: 1-5 reply to a rating ask ──
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: prompt } = await supabaseAdmin
    .from('sms_logs')
    .select('booking_id, sms_type')
    .eq('tenant_id', tenantId)
    .ilike('recipient', `%${cleanPhone}%`)
    .in('sms_type', ['pre_payment_rating', 'rating_prompt', '15min_warning'])
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

  const teamMemberName = (booking.team_members as unknown as { name?: string } | null)?.name || 'your team member'
  const teamMemberFirst = teamMemberName.split(' ')[0]

  // Strict: the message must BE the rating, not merely contain a digit.
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
        cleaner_rating: num,
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
        const url = await reviewUrl()
        await sendSMS({
          to: from,
          body: smsReviewRequest(bizName, teamMemberFirst, url, `We'll take $${REVIEW_CREDIT_DOLLARS} off your next visit for a written review.`),
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(() => {})
        await smsAdmins(tenantId, `★ ${num}/5 ${teamMemberFirst} — review link sent`).catch(() => {})
      } else {
        await sendSMS({
          to: from,
          body: `Thanks for the rating. What could we have done better? Any feedback helps us improve.`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(() => {})
        await smsAdmins(tenantId, `★ ${num}/5 ${teamMemberFirst} — feedback requested`).catch(() => {})
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
    await smsAdmins(tenantId, `Feedback for ${teamMemberFirst} (no numeric rating) — "${rawText.slice(0, 200)}"`).catch(() => {})
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
    await smsAdmins(tenantId, `★ ${existing.service_rating}/5 ${teamMemberFirst}${fb ? ` — "${fb}"` : ''}`).catch(() => {})
    return NextResponse.json({ ok: true, action: 'feedback_saved' })
  }

  return null
}
