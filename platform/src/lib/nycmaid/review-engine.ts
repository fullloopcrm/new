import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/nycmaid/sms'
import { smsAdmins } from '@/lib/nycmaid/admin-contacts'
import { sendClientEmail } from '@/lib/nycmaid/client-contacts'
import { clientReviewIncentiveEmail } from '@/lib/email-templates'
import { getCommPolicy, buildTemplateData } from '@/lib/comms-prefs'

// NYC Maid review engine — restores the pre-2026-06 standalone flow that
// actually generated reviews (see fullloop_nycmaid_review_flow_regression_2026_08_05):
// the 30-min alert asks ONLY for a 1-5 rating, nothing else. Billing rides on
// the REPLY to that rating, not the other way around. The FullLoop-port
// version that combined "here's your bill" + "reply 1-5" into one text
// buried the rating ask under a payment demand — clients replied "Paid" to
// the payment ask and the rating question was never answered.
//
// $10 written-review credit ONLY — the $25 video-review option was removed
// per Jeff (2026-07-05); Google review verification wasn't reliable enough
// to support a tiered credit.
//
// State machine, matched off the last outbound sms_log to this phone:
//   1) Reply to 'pre_payment_rating' (the bare "how'd we do? 1-5" ask)
//        → save rating.
//        4-5 → bill + "$10 off if you leave a review" combined in ONE text
//              (sms_type 'rating_thanks_45'), price written to the booking now.
//        1-3 → NO automated reply to the client — admin gets pinged to take
//              over the conversation personally. Billing for 1-3 is a manual
//              admin action (force-resend via the booking edit panel), not
//              automated.
//   2) Reply to 'rating_thanks_45' (the bill + review offer)
//        DONE / a link / a screenshot mention → apply -$10, send the
//              adjusted final bill + pay link, log client_reviews (pending).
//        anything else (declined, silence-then-something, etc.) → send the
//              bill at full price, no discount.
//      Idempotency: if the final bill (sms_type '30min_payment') was already
//      sent for this booking, any further reply just gets a short ack —
//      never re-bills, never re-discounts (this is the exact bug class nycmaid
//      hit standalone: "Cymbre Colon" got billed 3x at climbing totals off
//      repeated replies to the same prompt).
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

  // ── State 2: reply to the "bill + review offer" text ──
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: billPrompt } = await supabaseAdmin
    .from('sms_logs') // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
    .select('booking_id')
    .ilike('recipient', `%${cleanPhone}%`)
    .eq('sms_type', 'rating_thanks_45')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (billPrompt?.booking_id) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, team_member_id, price, payment_link, notes, clients(name, phone)')
      .eq('id', billPrompt.booking_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (booking) {
      // Idempotency — if the final bill already went out for this booking,
      // never re-bill or re-discount off a repeat/late reply.
      const { data: alreadyBilled } = await supabaseAdmin
        .from('sms_logs') // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
        .select('id')
        .eq('booking_id', booking.id)
        .eq('sms_type', '30min_payment')
        .limit(1)
      if (alreadyBilled && alreadyBilled.length > 0) {
        await sendSMS(from, `You're all set — we already sent your balance. Thank you!`, {
          skipConsent: true, smsType: 'bill_already_sent_ack', bookingId: booking.id,
        }).catch(() => {})
        return NextResponse.json({ ok: true, action: 'bill_already_sent' })
      }

      const client = booking.clients as unknown as { name?: string; phone?: string } | null
      const firstName = client?.name?.split(' ')[0] || ''
      const currentPriceCents = (booking.price as number | null) || 0
      const reviewLink = rawText.match(/https?:\/\/\S+/)?.[0]
      const mentionsScreenshot = /screenshot/i.test(rawText)
      const isDoneReply = /^(done|reviewed|posted)\b/i.test(rawText)
      const leftReview = isDoneReply || !!reviewLink || mentionsScreenshot

      let finalPriceCents = currentPriceCents
      if (leftReview) {
        finalPriceCents = Math.max(0, currentPriceCents - 1000)
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
            credit_amount: 10,
            proof_url: reviewLink || null,
            status: 'pending',
          })
        }
      }

      const payLink = booking.payment_link as string | null
      const payLines = payLink
        ? [``, `Pay here: ${payLink}`, `Please pay through this link only — credit/debit card, Cash App, or Apple Pay. We appreciate you!`]
        : []
      const billText = [
        leftReview ? `Amazing, thank you! $10 off applied. Your balance: $${(finalPriceCents / 100).toFixed(2)}` : `Thanks! Your balance: $${(finalPriceCents / 100).toFixed(2)}`,
        ...payLines,
        ``,
        `Reply "paid" once sent.`,
      ].join('\n')

      await sendSMS(from, billText, { skipConsent: true, smsType: '30min_payment', bookingId: booking.id }).catch(() => {})
      await smsAdmins(
        leftReview
          ? `✓ ${firstName || 'Client'}: $10 review discount applied → bill $${(finalPriceCents / 100).toFixed(2)} sent`
          : `${firstName || 'Client'} declined/no review → bill $${(finalPriceCents / 100).toFixed(2)} sent at full price`,
      ).catch(() => {})
      return NextResponse.json({ ok: true, action: leftReview ? 'review_discount_applied' : 'billed_full_price' })
    }
  }

  // ── State 1: reply to the bare "how'd we do? 1-5" ask ──
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: prompt } = await supabaseAdmin
    .from('sms_logs') // tenant-scope-ok: nycmaid-legacy helper; retires with the standalone cutover
    .select('booking_id')
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

  const cleanerName = (booking.team_members as unknown as { name?: string } | null)?.name || 'your cleaner'
  const cleanerFirst = cleanerName.split(' ')[0]
  const client = booking.clients as unknown as { name?: string; phone?: string } | null
  const clientName = client?.name || 'the client'
  const clientPhone = client?.phone || from

  // Leading-digit match: catches "5", "5!", "5/5", "5 stars", "5⭐️ amazing!",
  // "5. She was great!" — anything real clients actually type. Still requires
  // the digit to be the FIRST thing in the reply, so "I had 2 cleaners" and
  // "Paid" (the other thing this same alert used to ask for) don't false-match.
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
        cleaner_rating: num, // single-question flow: one rating reflects both
      })
      // client_feedback is the system-of-record the /dashboard/clients/feedback
      // page reads — the `ratings` insert above alone never surfaced here.
      await supabaseAdmin.from('client_feedback').insert({
        tenant_id: tenantId,
        client_id: booking.client_id,
        source: 'sms_rating',
        category: 'client',
        message: `Rating: ${num}/5 for ${cleanerFirst}`,
        is_anonymous: false,
      }).then(() => {}, () => {})

      if (num >= 4) {
        const priceCents = (booking.price as number | null) || 0
        const reviewSmsUrl = 'https://g.page/r/CSX9IqciUG9SEAE/review'
        const billText = [
          `Thanks! Your balance: $${(priceCents / 100).toFixed(2)}`,
          ``,
          `Want $10 off? Leave us a review and reply DONE (or send a screenshot) — we'll knock $10 off before you pay: ${reviewSmsUrl}`,
          ``,
          `Or reply "no thanks" and we'll send your pay link now.`,
        ].join('\n')
        // Pay link is sent once the client answers the review offer (state 2
        // above, keyed to 'rating_thanks_45'), not here — the balance figure
        // is shown now, the link comes with whichever final total applies.
        await sendSMS(from, billText, { skipConsent: true, smsType: 'rating_thanks_45', bookingId: booking.id }).catch(() => {})

        // Branded email version of the same review-incentive ask, same 4-5
        // star gate — only fires on a good rating.
        if (booking.client_id) {
          try {
            const [{ data: tenantRow }, policy] = await Promise.all([
              supabaseAdmin.from('tenants').select('name, primary_color, logo_url, commission_rate').eq('id', tenantId).single(),
              getCommPolicy(tenantId),
            ])
            if (tenantRow) {
              const base = buildTemplateData(tenantRow, policy)
              await sendClientEmail(
                booking.client_id,
                `5 stars + a thank-you from ${tenantRow.name}`,
                (contact) => clientReviewIncentiveEmail({
                  ...base,
                  clientName: contact.name?.split(' ')[0] || 'there',
                  teamMemberName: cleanerName,
                  incentiveAmount: '10',
                }),
              )
            }
          } catch (emailErr) {
            console.error('Review incentive email error:', emailErr)
          }
        }
        await smsAdmins(`★ ${num}/5 ${cleanerFirst} — balance + review offer sent`).catch(() => {})
      } else {
        // 1-3: no automated reply to the client — hand off to admin. Billing
        // is a manual admin action from here (force-resend on the booking),
        // same as the proven standalone design.
        await smsAdmins(
          `★ ${num}/5 ${cleanerFirst} — ${clientName} (${clientPhone}). Low rating. Booking ${booking.id}. Take over the conversation.`,
        ).catch(() => {})
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
    await supabaseAdmin.from('client_feedback').insert({
      tenant_id: tenantId,
      client_id: booking.client_id,
      source: 'sms_rating',
      category: 'client',
      message: rawText.slice(0, 2000),
      is_anonymous: false,
    }).then(() => {}, () => {})
    await smsAdmins(`Feedback for ${cleanerFirst} (no numeric rating) — "${rawText.slice(0, 200)}"`).catch(() => {})
    return NextResponse.json({ ok: true, action: 'feedback_captured' })
  }

  // Step 2: a <5 rating exists with no feedback yet → this reply IS the feedback.
  if (existing.service_rating != null && existing.service_rating < 5 && !existing.feedback) {
    const fb = rawText.slice(0, 500) || null
    await supabaseAdmin.from('ratings').update({ feedback: fb }).eq('booking_id', booking.id)
    await supabaseAdmin.from('client_feedback').insert({
      tenant_id: tenantId,
      client_id: booking.client_id,
      source: 'sms_rating',
      category: 'client',
      message: `Rating: ${existing.service_rating}/5 for ${cleanerFirst}${fb ? ` — "${fb}"` : ''}`,
      is_anonymous: false,
    }).then(() => {}, () => {})
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
