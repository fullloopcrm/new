import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { smsAdmins } from '@/lib/admin-contacts'
import { getSettings } from '@/lib/settings'

// Global rating + review-incentive engine — generalized version of NYC
// Maid's own (src/lib/nycmaid/review-engine.ts). Restores the pre-2026-06
// flow that actually generated reviews (see
// fullloop_nycmaid_review_flow_regression_2026_08_05): the 30-min alert asks
// ONLY for a 1-5 rating, nothing else. Billing rides on the REPLY to that
// rating, not the other way around — the prior combined "here's your bill +
// reply 1-5" text buried the rating question under a payment demand and
// clients just replied "Paid".
//
// State machine, matched off the last outbound sms_log to this phone for
// this tenant:
//   1) Reply to 'pre_payment_rating' (the bare "how'd we do? 1-5" ask)
//        → save rating.
//        4-5 → bill + "$<credit> off if you leave a review" combined in ONE
//              text (sms_type 'rating_thanks_45'), price written to the
//              booking now.
//        1-3 → NO automated reply to the client — admin gets pinged to take
//              over personally. Billing for 1-3 is a manual admin action.
//   2) Reply to 'rating_thanks_45' (the bill + review offer)
//        DONE / a link / a screenshot mention → apply -$<credit>, send the
//              adjusted final bill + pay link, log client_reviews (pending).
//        anything else → send the bill at full price, no discount.
//      Idempotency: once the final bill (sms_type '30min_payment') has been
//      sent for a booking, any further reply just gets a short ack — never
//      re-bills, never re-discounts.
//
// Returns a Response when it handled the message (caller should return it), or
// null to fall through to the generic handler.
const REVIEW_CREDIT_DOLLARS = 10
const REVIEW_CREDIT_CENTS = REVIEW_CREDIT_DOLLARS * 100

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

  // ── State 2: reply to the "bill + review offer" text ──
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: billPrompt } = await supabaseAdmin
    .from('sms_logs')
    .select('booking_id')
    .eq('tenant_id', tenantId)
    .ilike('recipient', `%${cleanPhone}%`)
    .eq('sms_type', 'rating_thanks_45')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (billPrompt?.booking_id) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, team_member_id, price, payment_link, clients(name)')
      .eq('id', billPrompt.booking_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (booking) {
      const { data: alreadyBilled } = await supabaseAdmin
        .from('sms_logs')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('sms_type', '30min_payment')
        .limit(1)
      if (alreadyBilled && alreadyBilled.length > 0) {
        await sendSMS({
          to: from,
          body: `You're all set — we already sent your balance. Thank you!`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        }).catch(() => {})
        return NextResponse.json({ ok: true, action: 'bill_already_sent' })
      }

      const client = booking.clients as unknown as { name?: string } | null
      const firstName = client?.name?.split(' ')[0] || ''
      const currentPriceCents = (booking.price as number | null) || 0
      const reviewLink = rawText.match(/https?:\/\/\S+/)?.[0]
      const mentionsScreenshot = /screenshot/i.test(rawText)
      const isDoneReply = /^(done|reviewed|posted)\b/i.test(rawText)
      const leftReview = isDoneReply || !!reviewLink || mentionsScreenshot

      let finalPriceCents = currentPriceCents
      if (leftReview) {
        finalPriceCents = Math.max(0, currentPriceCents - REVIEW_CREDIT_CENTS)
        await supabaseAdmin.from('bookings').update({ price: finalPriceCents }).eq('id', booking.id).then(() => {}, () => {})
        const { data: existingReview } = await supabaseAdmin
          .from('client_reviews')
          .select('id')
          .eq('booking_id', booking.id)
          .maybeSingle()
        if (!existingReview) {
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
      }

      const payLink = booking.payment_link as string | null
      const payLines = payLink ? [``, `Pay here: ${payLink}`] : []
      const billText = [
        leftReview ? `Amazing, thank you! $${REVIEW_CREDIT_DOLLARS} off applied. Your balance: $${(finalPriceCents / 100).toFixed(2)}` : `Thanks! Your balance: $${(finalPriceCents / 100).toFixed(2)}`,
        ...payLines,
        ``,
        `Reply "paid" once sent.`,
      ].join('\n')

      await sendSMS({ to: from, body: billText, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})
      await supabaseAdmin.from('sms_logs').insert({
        tenant_id: tenantId, booking_id: booking.id, sms_type: '30min_payment', recipient: cleanPhone, status: 'sent',
      }).then(() => {}, () => {})
      await smsAdmins(
        tenantId,
        leftReview
          ? `✓ ${firstName || 'Client'}: $${REVIEW_CREDIT_DOLLARS} review discount applied → bill $${(finalPriceCents / 100).toFixed(2)} sent`
          : `${firstName || 'Client'} declined/no review → bill $${(finalPriceCents / 100).toFixed(2)} sent at full price`,
      ).catch(() => {})
      return NextResponse.json({ ok: true, action: leftReview ? 'review_discount_applied' : 'billed_full_price' })
    }
  }

  // ── State 1: reply to the bare "how'd we do? 1-5" ask ──
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: prompt } = await supabaseAdmin
    .from('sms_logs')
    .select('booking_id')
    .eq('tenant_id', tenantId)
    .ilike('recipient', `%${cleanPhone}%`)
    .eq('sms_type', 'pre_payment_rating')
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!prompt?.booking_id) return null

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, client_id, team_member_id, price, payment_link, clients(name, phone), team_members!bookings_team_member_id_fkey(name)')
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
        const priceCents = (booking.price as number | null) || 0
        const billText = [
          `Thanks! Your balance: $${(priceCents / 100).toFixed(2)}`,
          ``,
          `Want $${REVIEW_CREDIT_DOLLARS} off? Leave ${bizName} a review and reply DONE (or send a screenshot) — we'll knock $${REVIEW_CREDIT_DOLLARS} off before you pay: ${url}`,
          ``,
          `Or reply "no thanks" and we'll send your pay link now.`,
        ].join('\n')
        await sendSMS({ to: from, body: billText, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})
        await supabaseAdmin.from('sms_logs').insert({
          tenant_id: tenantId, booking_id: booking.id, sms_type: 'rating_thanks_45', recipient: cleanPhone, status: 'sent',
        }).then(() => {}, () => {})
        await smsAdmins(tenantId, `★ ${num}/5 ${teamMemberFirst} — balance + review offer sent`).catch(() => {})
      } else {
        // 1-3: no automated reply to the client — hand off to admin. Billing
        // for these is a manual admin action from here.
        await smsAdmins(
          tenantId,
          `★ ${num}/5 ${teamMemberFirst} — ${clientName} (${clientPhone}). Low rating. Booking ${booking.id}. Take over the conversation.`,
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
