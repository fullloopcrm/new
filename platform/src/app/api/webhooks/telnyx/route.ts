import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { askSelena } from '@/lib/selena-legacy'
import { askSelena as askYinez } from '@/lib/selena/agent'
import { getSettings } from '@/lib/settings'
import { verifyTelnyx, isWebhookVerifyDisabled } from '@/lib/webhook-verify'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { handleNycMaidReview } from '@/lib/nycmaid/review-engine'
import { toNaiveET } from '@/lib/dates'

export const maxDuration = 60

// Handle inbound SMS + delivery status from Telnyx
export async function POST(request: Request) {
  const rawBody = await request.text()

  // Signature verification (skip only when explicitly disabled for local dev).
  if (!isWebhookVerifyDisabled(process.env.TELNYX_WEBHOOK_VERIFY)) {
    const result = verifyTelnyx(request.headers, rawBody, process.env.TELNYX_PUBLIC_KEY)
    if (!result.valid) {
      console.warn('[telnyx webhook] rejected:', result.reason)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let body: { data?: { event_type?: string; payload?: any } } // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const event = body?.data

  if (!event) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const eventType = event.event_type

  // ============================================
  // DELIVERY STATUS TRACKING
  // ============================================
  if (eventType === 'message.sent' || eventType === 'message.delivered' || eventType === 'message.failed') {
    const msgId = event.payload?.id
    const status = eventType === 'message.sent' ? 'sent'
      : eventType === 'message.delivered' ? 'delivered'
      : 'failed'

    if (msgId) {
      // Update notification status if we can find by telnyx message ID
      // Store telnyx_message_id in metadata when sending
      await supabaseAdmin
        .from('notifications')
        .update({ status })
        .eq('metadata->>telnyx_message_id', msgId)

      // Update campaign recipient delivery status if this message belongs to a campaign
      const { data: recipient } = await supabaseAdmin
        .from('campaign_recipients')
        .select('id, campaign_id, status')
        .eq('telnyx_message_id', msgId)
        .single()

      if (recipient) {
        const now = new Date().toISOString()
        const updateData: Record<string, string> = { status }
        if (status === 'delivered') {
          updateData.delivered_at = now
        }

        await supabaseAdmin
          .from('campaign_recipients')
          .update(updateData)
          .eq('id', recipient.id)

        // Recount campaign aggregate stats
        const { data: counts } = await supabaseAdmin
          .from('campaign_recipients')
          .select('status')
          .eq('campaign_id', recipient.campaign_id)

        if (counts) {
          const delivered = counts.filter(r => r.status === 'delivered').length
          const failed = counts.filter(r => r.status === 'failed').length

          await supabaseAdmin
            .from('campaigns')
            .update({ delivered_count: delivered, failed_count: failed })
            .eq('id', recipient.campaign_id)
        }
      }
    }

    return NextResponse.json({ received: true })
  }

  // ============================================
  // INBOUND SMS
  // ============================================
  if (eventType === 'message.received') {
    const payload = event.payload
    const from = payload?.from?.phone_number
    const to = payload?.to?.[0]?.phone_number
    const text = payload?.text

    if (!from || !to || !text) {
      return NextResponse.json({ received: true })
    }

    // Find tenant by their Telnyx phone number. Use limit(2), NOT .single():
    // .single() ERRORS when two tenants share a number (mis-seeded row) and the
    // message gets silently dropped — that took SMS down during a cutover test.
    // Pick the first deterministically and log loudly if it's ambiguous.
    const { data: tenantMatches } = await supabaseAdmin
      .from('tenants')
      .select('id, name, telnyx_api_key, telnyx_phone, owner_phone')
      .eq('telnyx_phone', to)
      .order('id', { ascending: true })
      .limit(2)

    if (tenantMatches && tenantMatches.length > 1) {
      console.error(`[telnyx] telnyx_phone ${to} matches ${tenantMatches.length} tenants — dedupe needed; routing to ${tenantMatches[0].name}`)
    }
    const tenant = tenantMatches?.[0] || null

    if (!tenant) {
      return NextResponse.json({ received: true })
    }

    const tenantId = tenant.id
    const normalizedText = text.trim().toUpperCase()

    // Owner inbound — if this SMS is from the tenant's OWNER (not a client), it's
    // a reply in the platform owner<->admin chat, not a booking conversation.
    // Route it to tenant_owner_messages and stop; don't run client/Selena logic.
    const ownerDigits = (tenant.owner_phone || '').replace(/\D/g, '')
    const fromDigits = String(from).replace(/\D/g, '')
    if (ownerDigits.length >= 10 && fromDigits.endsWith(ownerDigits.slice(-10))) {
      await supabaseAdmin.from('tenant_owner_messages').insert({
        tenant_id: tenantId, direction: 'in', channel: 'sms', body: text, sender: 'owner',
      })
      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId, type: 'owner_message', title: `Owner reply — ${tenant.name}`,
        message: text.slice(0, 200), channel: 'system', recipient_type: 'admin',
      })
      return NextResponse.json({ received: true, routed: 'owner_chat' })
    }

    // ============================================
    // STOP/UNSUBSCRIBE — Revoke SMS consent
    // ============================================
    if (['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL'].includes(normalizedText)) {
      // Find client by phone
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', from)
        .single()

      if (client) {
        // Set sms_opt_out on client
        await supabaseAdmin
          .from('clients')
          .update({ sms_consent: false })
          .eq('id', client.id)

        // Notify admin
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'sms_opt_out',
          title: `SMS Opt-Out: ${client.name}`,
          message: `${client.name} (${from}) replied STOP and has been unsubscribed from SMS.`,
          channel: 'in_app',
          metadata: { client_id: client.id, phone: from },
          status: 'sent',
        })
      }

      // Also check team members
      const { data: member } = await supabaseAdmin
        .from('team_members')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', from)
        .single()

      if (member) {
        // Persist the opt-out on the row that payment-processor.ts,
        // notify-team.ts, and notify-team-member.ts actually check
        // (`sms_consent !== false`) before sending. This used to only fire
        // an admin notification -- the outbound confirmation below told the
        // member "you have been unsubscribed" while every future shift
        // assignment/payment SMS kept going out to them regardless.
        await supabaseAdmin
          .from('team_members')
          .update({ sms_consent: false })
          .eq('id', member.id)

        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'sms_opt_out',
          title: `SMS Opt-Out: ${member.name} (Team)`,
          message: `Team member ${member.name} (${from}) replied STOP and has been unsubscribed from SMS.`,
          channel: 'in_app',
          metadata: { team_member_id: member.id, phone: from },
          status: 'sent',
        })
      }

      // Send confirmation per TCPA
      if (tenant.telnyx_api_key && tenant.telnyx_phone) {
        await sendSMS({
          to: from,
          body: `${tenant.name}: You have been unsubscribed and will no longer receive SMS messages. Reply START to re-subscribe.`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
      }

      return NextResponse.json({ received: true, action: 'opt_out' })
    }

    // ============================================
    // START/UNSTOP — Re-enable SMS consent
    // ============================================
    if (['START', 'UNSTOP', 'SUBSCRIBE'].includes(normalizedText)) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', from)
        .single()

      if (client) {
        await supabaseAdmin
          .from('clients')
          .update({ sms_consent: true })
          .eq('id', client.id)

        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'sms_opt_in',
          title: `SMS Re-subscribed: ${client.name}`,
          message: `${client.name} (${from}) replied START and has been re-subscribed to SMS.`,
          channel: 'in_app',
          metadata: { client_id: client.id, phone: from },
          status: 'sent',
        })
      }

      // Mirror the STOP handler above, which does check team members --
      // this branch previously only ever looked at clients, so a team
      // member who'd opted back out and in again stayed opted out forever.
      const { data: member } = await supabaseAdmin
        .from('team_members')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', from)
        .single()

      if (member) {
        await supabaseAdmin
          .from('team_members')
          .update({ sms_consent: true })
          .eq('id', member.id)

        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'sms_opt_in',
          title: `SMS Re-subscribed: ${member.name} (Team)`,
          message: `Team member ${member.name} (${from}) replied START and has been re-subscribed to SMS.`,
          channel: 'in_app',
          metadata: { team_member_id: member.id, phone: from },
          status: 'sent',
        })
      }

      if (tenant.telnyx_api_key && tenant.telnyx_phone) {
        await sendSMS({
          to: from,
          body: `${tenant.name}: You have been re-subscribed to SMS notifications. Reply STOP to opt out.`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
      }

      return NextResponse.json({ received: true, action: 'opt_in' })
    }

    // ============================================
    // FEEDBACK-CAMPAIGN REPLY — ported from nycmaid (client_feedback +
    // campaign_type='feedback' + reply_credit_cents), tenant-scoped.
    // ============================================
    // A client replying to a campaign flagged campaign_type='feedback' gets
    // their message logged to client_feedback (Clients -> Feedback) and the
    // campaign's reply_credit_cents (if any) queued as a pending credit on
    // that row, instead of running the normal rating-intercept/chatbot flow
    // below. Placed after STOP/START so consent handling is never bypassed;
    // before rating/chatbot so a real feedback reply can't be swallowed by
    // either.
    {
      const { data: fbClient } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', from)
        .maybeSingle()

      if (fbClient) {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recip } = await supabaseAdmin
          .from('campaign_recipients')
          .select('campaign_id, created_at, campaigns(campaign_type, reply_credit_cents, name)')
          .eq('tenant_id', tenantId)
          .eq('client_id', fbClient.id)
          .eq('channel', 'sms')
          .in('status', ['sent', 'delivered'])
          .gte('created_at', fourteenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const fbCampaign = recip?.campaigns as unknown as { campaign_type?: string; reply_credit_cents?: number | null; name?: string } | null

        if (recip?.campaign_id && fbCampaign?.campaign_type === 'feedback') {
          const { data: existingFb } = await supabaseAdmin
            .from('client_feedback')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('client_id', fbClient.id)
            .eq('campaign_id', recip.campaign_id)
            .limit(1)
            .maybeSingle()

          if (!existingFb) {
            await supabaseAdmin.from('client_feedback').insert({
              tenant_id: tenantId,
              client_id: fbClient.id,
              campaign_id: recip.campaign_id,
              source: 'sms',
              message: text,
              category: 'client',
              credit_cents: fbCampaign.reply_credit_cents ?? null,
            })

            const creditLine = fbCampaign.reply_credit_cents
              ? ` We've added a $${(fbCampaign.reply_credit_cents / 100).toFixed(0)} credit to your account for your next booking.`
              : ''
            if (tenant.telnyx_api_key && tenant.telnyx_phone) {
              await sendSMS({
                to: from,
                body: `Thank you for the feedback!${creditLine}`,
                telnyxApiKey: tenant.telnyx_api_key,
                telnyxPhone: tenant.telnyx_phone,
              }).catch(() => {})
            }

            await supabaseAdmin.from('notifications').insert({
              tenant_id: tenantId,
              type: 'client_feedback',
              title: `Feedback: ${fbClient.name || from}`,
              message: text.slice(0, 300),
              channel: 'in_app',
              metadata: { client_id: fbClient.id, campaign_id: recip.campaign_id, phone: from },
              status: 'sent',
            })
          } else if (tenant.telnyx_api_key && tenant.telnyx_phone) {
            // Already captured this campaign's feedback — ack without re-crediting.
            await sendSMS({
              to: from,
              body: `Thanks again — we've got your feedback on file!`,
              telnyxApiKey: tenant.telnyx_api_key,
              telnyxPhone: tenant.telnyx_phone,
            }).catch(() => {})
          }

          return NextResponse.json({ received: true, action: 'feedback_captured' })
        }
      }
    }

    // ============================================
    // CONFIRMATION RESPONSES — YES/CONFIRM/OK
    // ============================================
    if (['YES', 'CONFIRM', 'CONFIRMED', 'OK', 'Y', 'SI'].includes(normalizedText)) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', from)
        .single()

      if (client) {
        // Find their next upcoming booking and confirm it
        const { data: nextBooking } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time')
          .eq('tenant_id', tenantId)
          .eq('client_id', client.id)
          .in('status', ['scheduled'])
          // bookings.start_time is naive-ET (no tz); a real-UTC toISOString()
          // lower bound silently excludes tonight's still-upcoming booking
          // during the evening ET window (UTC already on the next calendar
          // day), so a client's "YES" reply finds no booking to confirm.
          .gte('start_time', toNaiveET(new Date()))
          .order('start_time', { ascending: true })
          .limit(1)
          .single()

        let claimedBooking = false
        if (nextBooking) {
          // Atomic claim: the SELECT above filters status IN ('scheduled'),
          // but a Telnyx retry of this webhook (or the client texting YES
          // twice) can both pass that check before either UPDATE commits.
          // Re-check status='scheduled' on the UPDATE itself so only the
          // delivery that actually flips the row proceeds to append the note
          // a second time.
          const { data: claimed } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', nextBooking.id)
            .eq('status', 'scheduled')
            .select('id')
          claimedBooking = !!claimed && claimed.length > 0

          if (claimedBooking) {
            // Add confirmation to client notes
            const noteText = `[Auto] Confirmed via SMS on ${new Date().toLocaleDateString()}`
            const { data: existingClient } = await supabaseAdmin
              .from('clients')
              .select('notes')
              .eq('id', client.id)
              .single()

            const updatedNotes = existingClient?.notes
              ? `${existingClient.notes}\n${noteText}`
              : noteText

            await supabaseAdmin
              .from('clients')
              .update({ notes: updatedNotes })
              .eq('id', client.id)
          }
        }

        // Only fire the booking_confirmed notification when this delivery
        // actually claimed the transition (or there was no booking to claim
        // at all, matching prior behavior) — a losing concurrent delivery
        // must not re-notify for a booking someone else already confirmed.
        if (!nextBooking || claimedBooking) {
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'booking_confirmed',
            title: `Booking Confirmed: ${client.name}`,
            message: `${client.name} confirmed their booking via SMS reply.`,
            channel: 'in_app',
            booking_id: nextBooking?.id || null,
            metadata: { client_id: client.id, phone: from, confirmed_via: 'sms' },
            status: 'sent',
          })
        }

        return NextResponse.json({ received: true, action: 'confirmed' })
      }

      // Check if it's a team member confirming
      const { data: member } = await supabaseAdmin
        .from('team_members')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', from)
        .single()

      if (member) {
        // Find their next unconfirmed job
        const { data: nextJob } = await supabaseAdmin
          .from('bookings')
          .select('id, start_time, clients(name)')
          .eq('tenant_id', tenantId)
          .eq('team_member_id', member.id)
          .in('status', ['scheduled'])
          // see naive-ET note on the client-confirm branch above.
          .gte('start_time', toNaiveET(new Date()))
          .order('start_time', { ascending: true })
          .limit(1)
          .single()

        if (nextJob) {
          // Append confirmation to booking notes
          const { data: existingBooking } = await supabaseAdmin
            .from('bookings')
            .select('notes')
            .eq('id', nextJob.id)
            .single()

          const confirmNote = `[Auto] Team confirmed by ${member.name} via SMS on ${new Date().toLocaleDateString()}`
          const updatedNotes = existingBooking?.notes
            ? `${existingBooking.notes}\n${confirmNote}`
            : confirmNote

          await supabaseAdmin
            .from('bookings')
            .update({ notes: updatedNotes })
            .eq('id', nextJob.id)

          // Store confirmation
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'team_confirmed',
            title: `Team Confirmed: ${member.name}`,
            message: `${member.name} confirmed job for ${(nextJob.clients as unknown as { name: string } | null)?.name || 'client'} via SMS.`,
            channel: 'in_app',
            booking_id: nextJob.id,
            // confirmed_start_time lets the resend cron (cron/confirmations)
            // tell "confirmed" apart from "confirmed a slot that no longer
            // exists" — a reschedule keeps the same booking_id but changes
            // start_time, and this row alone can't otherwise distinguish
            // the two.
            metadata: { team_member_id: member.id, phone: from, confirmed_via: 'sms', confirmed_start_time: nextJob.start_time },
            status: 'sent',
          })
        }

        return NextResponse.json({ received: true, action: 'team_confirmed' })
      }
    }

    // ============================================
    // NYC MAID review engine (tenant-scoped parity — rating capture + review
    // generation). FL bills up front in the 30-min alert, so this does NOT
    // re-bill. $10 written-review credit only. Gated to the NYC Maid tenant.
    // ============================================
    if (isNycMaid(tenantId)) {
      const nmReview = await handleNycMaidReview({ tenantId, from, text })
      if (nmReview) return nmReview
    }

    // ============================================
    // RATING INTERCEPT — single digit 1-5 after follow-up
    // ============================================
    if (/^[1-5]$/.test(text.trim())) {
      const rating = parseInt(text.trim(), 10)

      // Find client by phone
      const { data: ratingClient } = await supabaseAdmin
        .from('clients')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('phone', from)
        .single()

      if (ratingClient) {
        // Find recently completed booking with [FOLLOWUP_SENT] in notes (last 48hrs).
        // POST /api/finance/payroll (bulk payroll) or a manual mark-paid can flip
        // a booking's status straight to 'paid' well within this 48hr window --
        // 'completed' alone silently dropped the lookup, so a client's 1-5 star
        // SMS reply fell through to the generic inbound-SMS branch: no rating
        // stored, no admin low-rating alert, no reply sent. Same root cause as
        // the finance/dashboard status='paid' blind-spot sweep this session.
        const fortyEightHrsAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

        const { data: recentBooking } = await supabaseAdmin
          .from('bookings')
          .select('id, notes')
          .eq('tenant_id', tenantId)
          .eq('client_id', ratingClient.id)
          .in('status', ['completed', 'paid'])
          .gte('check_out_time', fortyEightHrsAgo.toISOString())
          .like('notes', '%[FOLLOWUP_SENT]%')
          .order('check_out_time', { ascending: false })
          .limit(1)
          .single()

        if (recentBooking) {
          // Store rating in booking notes
          const ratingNote = `[RATING:${rating}] by ${ratingClient.name} on ${new Date().toLocaleDateString()}`
          const updatedNotes = recentBooking.notes
            ? `${recentBooking.notes}\n${ratingNote}`
            : ratingNote

          await supabaseAdmin
            .from('bookings')
            .update({ notes: updatedNotes })
            .eq('id', recentBooking.id)

          // Log inbound SMS
          await supabaseAdmin.from('client_sms_messages').insert({
            tenant_id: tenantId,
            client_id: ratingClient.id,
            direction: 'inbound',
            message: text,
          })

          // Respond based on rating
          let replyMsg = ''
          if (rating === 5) {
            replyMsg = `Thank you so much, ${ratingClient.name?.split(' ')[0]}! We're thrilled you had a great experience! Would you mind leaving us a Google review? It really helps us out! \u{1F64F}`
          } else if (rating >= 3) {
            replyMsg = `Thanks for the feedback, ${ratingClient.name?.split(' ')[0]}! We appreciate you sharing.`
          } else {
            replyMsg = `We're sorry to hear that, ${ratingClient.name?.split(' ')[0]}. Your feedback has been shared with our team and we'll work to do better.`

            // Notify admin about low rating
            await supabaseAdmin.from('notifications').insert({
              tenant_id: tenantId,
              type: 'review_received',
              title: `Low Rating: ${ratingClient.name} (${rating}/5)`,
              message: `${ratingClient.name} rated their experience ${rating}/5. Follow up recommended.`,
              channel: 'in_app',
              booking_id: recentBooking.id,
              metadata: { client_id: ratingClient.id, rating, phone: from },
              status: 'sent',
            })
          }

          if (replyMsg && tenant.telnyx_api_key && tenant.telnyx_phone) {
            await sendSMS({
              to: from,
              body: replyMsg,
              telnyxApiKey: tenant.telnyx_api_key,
              telnyxPhone: tenant.telnyx_phone,
            })

            // Log outbound to client transcript
            await supabaseAdmin.from('client_sms_messages').insert({
              tenant_id: tenantId,
              client_id: ratingClient.id,
              direction: 'outbound',
              message: replyMsg,
            })
          }

          // Log rating notification
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenantId,
            type: 'review_received',
            title: `Rating: ${ratingClient.name} (${rating}/5)`,
            message: `${ratingClient.name} rated their experience ${rating}/5`,
            channel: 'in_app',
            booking_id: recentBooking.id,
            metadata: { client_id: ratingClient.id, rating, phone: from },
            status: 'sent',
          })

          return NextResponse.json({ received: true, action: 'rating_captured', rating })
        }
      }
    }

    // ============================================
    // GENERAL INBOUND SMS — Log, notify admin, chatbot
    // ============================================
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('phone', from)
      .single()

    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('phone', from)
      .single()

    const senderName = client?.name || member?.name || from

    // Create notification for inbound SMS
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'sms_received',
      title: `SMS from ${senderName}`,
      message: text.slice(0, 500),
      channel: 'in_app',
      metadata: {
        from_phone: from,
        to_phone: to,
        client_id: client?.id || null,
        team_member_id: member?.id || null,
        sender_name: senderName,
      },
      status: 'sent',
    })

    // If from a client, add to their notes
    if (client) {
      const noteText = `[SMS ${new Date().toLocaleDateString()}] ${text.slice(0, 200)}`
      const { data: existingClient } = await supabaseAdmin
        .from('clients')
        .select('notes')
        .eq('id', client.id)
        .single()

      const updatedNotes = existingClient?.notes
        ? `${existingClient.notes}\n${noteText}`
        : noteText

      await supabaseAdmin
        .from('clients')
        .update({ notes: updatedNotes })
        .eq('id', client.id)
    }

    // Log inbound message to client_sms_messages for transcript
    if (client) {
      await supabaseAdmin.from('client_sms_messages').insert({
        tenant_id: tenantId,
        client_id: client.id,
        direction: 'inbound',
        message: text,
      })
    }

    // ============================================
    // AI CHATBOT — Route to Selena if enabled
    // ============================================
    // Skip chatbot for team members (they're staff, not customers)
    if (!member && tenant.telnyx_api_key && tenant.telnyx_phone) {
      try {
        const settings = await getSettings(tenantId)
        if (settings.chatbot_enabled) {
          const cleanPhone = from.replace(/\D/g, '').slice(-10)

          // Handle "START OVER" / "RESET" — expire active conversation
          if (['START OVER', 'RESET', 'NEW'].includes(normalizedText)) {
            await supabaseAdmin
              .from('sms_conversations')
              .update({ expired: true })
              .eq('tenant_id', tenantId)
              .eq('phone', cleanPhone)
              .is('completed_at', null)
              .eq('expired', false)

            // Send fresh greeting
            const greeting = settings.chatbot_greeting || 'Hi! Thank you for reaching out. How are you?'
            await sendSMS({ to: from, body: greeting, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})

            // Create new conversation
            await supabaseAdmin.from('sms_conversations').insert({
              tenant_id: tenantId,
              phone: cleanPhone,
              state: 'welcome',
            })

            return NextResponse.json({ received: true, action: 'chatbot_reset' })
          }

          // Find or create active conversation
          let { data: convo } = await supabaseAdmin
            .from('sms_conversations')
            .select('id, client_id, name')
            .eq('tenant_id', tenantId)
            .eq('phone', cleanPhone)
            .is('completed_at', null)
            .eq('expired', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const clientExists = !!client
          const clientName = client?.name || convo?.name || null

          if (!convo) {
            // Tenant rule: if auto_respond_leads is off, do not auto-greet
            // unrecognized senders. The inbound message is still logged to
            // client_sms_messages above for admin review.
            if (!clientExists && !settings.auto_respond_leads) {
              return NextResponse.json({ received: true, action: 'auto_respond_leads_disabled' })
            }
            // First message from this phone — create conversation and send greeting
            const { data: newConvo } = await supabaseAdmin.from('sms_conversations').insert({
              tenant_id: tenantId,
              phone: cleanPhone,
              client_id: client?.id || null,
              name: clientName,
              state: 'welcome',
            }).select('id, client_id, name').single()

            if (newConvo) {
              convo = newConvo

              // Log inbound message to conversation. tenant_id stamped
              // explicitly — an unstamped insert falls back to
              // sms_conversation_messages' column DEFAULT ('nycmaid'), same
              // P2 write-side gap fixed on the chat/yinez/admin-chat/selena
              // siblings (deploy-prep/idor-remediation-status.md).
              await supabaseAdmin.from('sms_conversation_messages').insert({
                conversation_id: convo.id,
                direction: 'inbound',
                message: text,
                tenant_id: tenantId,
              })

              // Send greeting
              const firstName = clientName?.split(' ')[0]
              const greeting = clientExists && firstName
                ? `Hola ${firstName}! Happy to hear from you again. How are you?`
                : (settings.chatbot_greeting || 'Hi! Thank you for reaching out. How are you?')

              await sendSMS({ to: from, body: greeting, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})

              // Log outbound greeting — tenant_id stamped, same reasoning as the inbound insert above.
              await supabaseAdmin.from('sms_conversation_messages').insert({
                conversation_id: convo.id,
                direction: 'outbound',
                message: greeting,
                tenant_id: tenantId,
              })

              // Log to client transcript if client exists
              if (client) {
                await supabaseAdmin.from('client_sms_messages').insert({
                  tenant_id: tenantId,
                  client_id: client.id,
                  direction: 'outbound',
                  message: greeting,
                })
              }
            }

            return NextResponse.json({ received: true, action: 'chatbot_greeting' })
          }

          // Ongoing conversation — log inbound and route to AI. tenant_id
          // stamped, same reasoning as the new-conversation inbound insert above.
          await supabaseAdmin.from('sms_conversation_messages').insert({
            conversation_id: convo.id,
            direction: 'inbound',
            message: text,
            tenant_id: tenantId,
          })

          // NYC Maid runs the REAL Yinez agent (warm voice, self-book redirect,
          // memory/skills). Other tenants stay on the legacy engine. Pass the
          // sender phone so Yinez does owner-detection + client lookup.
          const aiResult = isNycMaid(tenantId)
            ? await askYinez('sms', text, convo.id, from)
            : await askSelena(tenantId, 'sms', text, convo.id)

          // Prevent silent failure — if Selena returns nothing, send a fallback
          if (aiResult && !aiResult.text) {
            aiResult.text = "Sorry, nothing came through on my end! Could you resend that? \u{1F60A}"
          }

          if (aiResult?.text) {
            // Send AI response
            await sendSMS({
              to: from,
              body: aiResult.text,
              telnyxApiKey: tenant.telnyx_api_key,
              telnyxPhone: tenant.telnyx_phone,
            })

            // Log outbound to conversation — tenant_id stamped, same reasoning as above.
            await supabaseAdmin.from('sms_conversation_messages').insert({
              conversation_id: convo.id,
              direction: 'outbound',
              message: aiResult.text,
              tenant_id: tenantId,
            })

            // Log to client transcript
            const clientId = client?.id || convo.client_id
            if (clientId) {
              await supabaseAdmin.from('client_sms_messages').insert({
                tenant_id: tenantId,
                client_id: clientId,
                direction: 'outbound',
                message: aiResult.text,
              })

              // If client was just created by chatbot, backfill prior messages.
              // clientCreated exists only on the legacy engine's result; the
              // Yinez engine (YinezResult) doesn't set it, so guard with `in`.
              if ('clientCreated' in aiResult && aiResult.clientCreated && !client) {
                const { data: priorMsgs } = await supabaseAdmin
                  .from('sms_conversation_messages')
                  .select('direction, message, created_at')
                  .eq('conversation_id', convo.id)
                  .order('created_at', { ascending: true })

                if (priorMsgs) {
                  const backfill = priorMsgs.slice(0, -1).map(m => ({
                    tenant_id: tenantId,
                    client_id: clientId,
                    direction: m.direction,
                    message: m.message,
                  }))
                  if (backfill.length > 0) {
                    await supabaseAdmin.from('client_sms_messages').insert(backfill)
                  }
                }
              }
            }

            // If booking was created, mark conversation complete and notify admin
            if (aiResult.bookingCreated) {
              await supabaseAdmin.from('sms_conversations')
                .update({ completed_at: new Date().toISOString() })
                .eq('id', convo.id)

              const bookingClientName = clientName || 'New client'
              await supabaseAdmin.from('notifications').insert({
                tenant_id: tenantId,
                type: 'booking_created',
                title: `New SMS Booking: ${bookingClientName}`,
                message: `${bookingClientName} booked via AI chatbot`,
                channel: 'in_app',
                status: 'sent',
              })
            }
          }

          return NextResponse.json({ received: true, action: 'chatbot' })
        }
      } catch (err) {
        console.error('Chatbot error:', err)
        // Fall through — chatbot failure shouldn't block the webhook
      }
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
