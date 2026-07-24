// tenantDb triage (P1/W2 c): N/A for this whole file. The delivery-status
// branch resolves rows by Telnyx's own message id (cross-tenant lookup —
// there is no tenantId yet). The inbound-SMS branch resolves tenant by
// telnyx_phone lookup mid-handler, same pattern already marked
// `tenant-scope-ok: webhook resolves tenant from the verified event payload`
// on telegram/route.ts + telegram/[tenant]/route.ts + telnyx-voice/route.ts;
// every write below that point already carries an explicit
// tenant_id/tenantId filter or stamp.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { askSelena } from '@/lib/selena-legacy'
import { askSelena as askYinez } from '@/lib/selena/agent'
import { getSettings } from '@/lib/settings'
import { verifyTelnyx } from '@/lib/webhook-verify'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { handleNycMaidReview } from '@/lib/nycmaid/review-engine'
import { handleReviewRating } from '@/lib/review-engine'
import { insertConversationMessage } from '@/lib/sms-messages'
import { nowNaiveET } from '@/lib/recurring'
import { sendTenantTelegram } from '@/lib/notify'

export const maxDuration = 60

// Handle inbound SMS + delivery status from Telnyx
export async function POST(request: Request) {
  const rawBody = await request.text()

  // Temporary trace (2026-07-23): unconditional, before any logic — proves
  // whether Telnyx's webhook request reaches this route at all. Every other
  // branch in this file has been traced and produced nothing for real
  // inbound replies; this is the last possible silent-drop point. Remove
  // once inbound handling is confirmed working end-to-end.
  await supabaseAdmin.from('notifications').insert({
    tenant_id: '00000000-0000-0000-0000-000000000001',
    type: 'comms_fail',
    title: 'Telnyx webhook POST received',
    message: `headers=${JSON.stringify(Object.fromEntries(request.headers.entries())).slice(0, 500)} body=${rawBody.slice(0, 300)}`,
  }).then(() => {}, () => {})

  // Signature verification (skip only when explicitly disabled for local dev).
  if (process.env.TELNYX_WEBHOOK_VERIFY !== 'off') {
    const result = verifyTelnyx(request.headers, rawBody, process.env.TELNYX_PUBLIC_KEY)
    if (!result.valid) {
      console.warn('[telnyx webhook] rejected:', result.reason)
      // Temporary trace (2026-07-23): inbound SMS replies have zero DB
      // footprint anywhere (sms_logs, client_sms_messages, notifications) —
      // this 401 is the prime suspect since it returns before any write.
      // Remove once root cause is confirmed.
      await supabaseAdmin.from('notifications').insert({
        tenant_id: '00000000-0000-0000-0000-000000000001',
        type: 'comms_fail',
        title: 'Inbound Telnyx webhook rejected',
        message: `reason=${result.reason} body_snippet=${rawBody.slice(0, 300)}`,
      }).then(() => {}, () => {})
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
      // Temporary trace (2026-07-23): this branch silently drops the whole
      // message with zero DB footprint if Telnyx's real payload shape
      // doesn't match what's destructured above. Logging the raw payload
      // until inbound-reply handling is confirmed working end-to-end.
      await supabaseAdmin.from('notifications').insert({
        tenant_id: '00000000-0000-0000-0000-000000000001',
        type: 'comms_fail',
        title: 'Inbound Telnyx webhook missing from/to/text',
        message: `from=${from} to=${to} text=${text} payload=${JSON.stringify(payload).slice(0, 500)}`,
      }).then(() => {}, () => {})
      return NextResponse.json({ received: true })
    }

    // Find tenant by their Telnyx phone number. Use limit(2), NOT .single():
    // .single() ERRORS when two tenants share a number (mis-seeded row) and the
    // message gets silently dropped — that took SMS down during a cutover test.
    // Pick the first deterministically and log loudly if it's ambiguous.
    const { data: tenantMatches } = await supabaseAdmin
      .from('tenants')
      .select('id, name, telnyx_api_key, telnyx_phone, owner_phone, telegram_bot_token, telegram_chat_id')
      .eq('telnyx_phone', to)
      .order('id', { ascending: true })
      .limit(2)

    if (tenantMatches && tenantMatches.length > 1) {
      console.error(`[telnyx] telnyx_phone ${to} matches ${tenantMatches.length} tenants — dedupe needed; routing to ${tenantMatches[0].name}`)
    }
    const tenant = tenantMatches?.[0] || null

    if (!tenant) {
      // Temporary trace (2026-07-23): silent drop if `to` doesn't exactly
      // match any tenant's telnyx_phone.
      await supabaseAdmin.from('notifications').insert({
        tenant_id: '00000000-0000-0000-0000-000000000001',
        type: 'comms_fail',
        title: 'Inbound Telnyx webhook — no tenant matched',
        message: `to=${to} from=${from}`,
      }).then(() => {}, () => {})
      return NextResponse.json({ received: true })
    }

    const tenantId = tenant.id
    const normalizedText = text.trim().toUpperCase()

    // Owner inbound — if this SMS is from the tenant's OWNER (not a client), it's
    // a reply in the platform owner<->admin chat, not a booking conversation.
    // Route it to tenant_owner_messages and stop; don't run client/Selena logic.
    const ownerDigits = (tenant.owner_phone || '').replace(/\D/g, '')
    const fromDigits = String(from).replace(/\D/g, '')
    // Temporary trace (2026-07-23): confirms tenant resolution + owner-match
    // evaluation right before the branch that decides where this message goes.
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'comms_fail',
      title: 'Inbound Telnyx webhook — tenant resolved',
      message: `tenant=${tenant.name} from=${from} to=${to} text=${text} ownerPhoneOnFile=${tenant.owner_phone} ownerMatch=${ownerDigits.length >= 10 && fromDigits.endsWith(ownerDigits.slice(-10))}`,
    }).then(() => {}, () => {})
    if (ownerDigits.length >= 10 && fromDigits.endsWith(ownerDigits.slice(-10))) {
      await supabaseAdmin.from('tenant_owner_messages').insert({
        tenant_id: tenantId, direction: 'in', channel: 'sms', body: text, sender: 'owner',
      })
      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId, type: 'owner_message', title: `Owner reply — ${tenant.name}`,
        message: text.slice(0, 200), channel: 'system', recipient_type: 'admin',
      })
      // Telegram echo — dropped in the FL port (this webhook never called
      // notify()/sendTenantTelegram at all, only wrote the in-app row above).
      sendTenantTelegram(tenantId, tenant, `Jeff texted: ${text}`).catch((err) =>
        console.error('[telnyx webhook] owner-text telegram send failed:', err))
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
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenantId,
          type: 'sms_opt_out',
          title: `SMS Opt-Out: ${member.name} (Team)`,
          message: `Team member ${member.name} (${from}) replied STOP.`,
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
          // start_time is naive ET — a real-instant boundary here made SMS
          // auto-confirm silently fail to find this-morning's booking for
          // hours after it had actually started (same bug as
          // cron/no-show-check).
          .gte('start_time', `${nowNaiveET()}Z`)
          .order('start_time', { ascending: true })
          .limit(1)
          .single()

        if (nextBooking) {
          await supabaseAdmin
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', nextBooking.id)

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
          // start_time is naive ET — a real-instant boundary here made SMS
          // auto-confirm silently fail to find this-morning's booking for
          // hours after it had actually started (same bug as
          // cron/no-show-check).
          .gte('start_time', `${nowNaiveET()}Z`)
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
            metadata: { team_member_id: member.id, phone: from, confirmed_via: 'sms' },
            status: 'sent',
          })
        }

        return NextResponse.json({ received: true, action: 'team_confirmed' })
      }
    }

    // ============================================
    // REVIEW ENGINE — rating capture off the 30-min alert's "reply 1-5" ask,
    // and (on a 4-5) a review-incentive offer. NYC Maid keeps its own
    // hand-tuned copy (video-review option, referral plug) via the dedicated
    // nycmaid engine; every other tenant gets the generic core version using
    // their own Google review link + business name. Global process, personal
    // copy/link — see feedback_fullloop_review_engine_globalized.
    // ============================================
    if (isNycMaid(tenantId)) {
      const nmReview = await handleNycMaidReview({ tenantId, from, text })
      if (nmReview) return nmReview
    } else {
      const review = await handleReviewRating({ tenantId, from, text })
      if (review) return review
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
        // Find recently completed booking with [FOLLOWUP_SENT] in notes (last 48hrs)
        const fortyEightHrsAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

        const { data: recentBooking } = await supabaseAdmin
          .from('bookings')
          .select('id, notes')
          .eq('tenant_id', tenantId)
          .eq('client_id', ratingClient.id)
          .eq('status', 'completed')
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
            const lowRatingTitle = `Low Rating: ${ratingClient.name} (${rating}/5)`
            const lowRatingMsg = `${ratingClient.name} rated their experience ${rating}/5. Follow up recommended.`
            await supabaseAdmin.from('notifications').insert({
              tenant_id: tenantId,
              type: 'review_received',
              title: lowRatingTitle,
              message: lowRatingMsg,
              channel: 'in_app',
              booking_id: recentBooking.id,
              metadata: { client_id: ratingClient.id, rating, phone: from },
              status: 'sent',
            })
            // Telegram alert — dropped in the FL port (direct DB insert above
            // never called notify()/sendTenantTelegram, so low ratings never
            // reached Telegram despite 'review_received' being a wired type).
            sendTenantTelegram(tenantId, tenant, `${lowRatingTitle}\n\n${lowRatingMsg}`).catch((err) =>
              console.error('[telnyx webhook] low-rating telegram send failed:', err))
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
    const inboundSmsTitle = `SMS from ${senderName}`
    const inboundSmsMsg = text.slice(0, 500)
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'sms_received',
      title: inboundSmsTitle,
      message: inboundSmsMsg,
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
    // Telegram alert — dropped in the FL port. nycmaid-only for now (matches
    // its pre-cutover behavior); other tenants would fall back to the shared
    // platform owner chat here since most don't have their own bot configured
    // yet, flooding it with every tenant's routine client texts — needs its
    // own review before going global.
    if (isNycMaid(tenantId)) {
      sendTenantTelegram(tenantId, tenant, `${inboundSmsTitle}\n\n${inboundSmsMsg}`).catch((err) =>
        console.error('[telnyx webhook] inbound-sms telegram send failed:', err))
    }

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

              // Log inbound message to conversation
              await insertConversationMessage(
                { conversation_id: convo.id, direction: 'inbound', message: text },
                { expectedTenantId: tenantId },
              )

              // Send greeting
              const firstName = clientName?.split(' ')[0]
              const greeting = clientExists && firstName
                ? `Hola ${firstName}! Happy to hear from you again. How are you?`
                : (settings.chatbot_greeting || 'Hi! Thank you for reaching out. How are you?')

              await sendSMS({ to: from, body: greeting, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})

              // Log outbound greeting
              await insertConversationMessage(
                { conversation_id: convo.id, direction: 'outbound', message: greeting },
                { expectedTenantId: tenantId },
              )

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

          // Ongoing conversation — log inbound and route to AI
          await insertConversationMessage(
            { conversation_id: convo.id, direction: 'inbound', message: text },
            { expectedTenantId: tenantId },
          )

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

            // Log outbound to conversation
            await insertConversationMessage(
              { conversation_id: convo.id, direction: 'outbound', message: aiResult.text },
              { expectedTenantId: tenantId },
            )

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
              const smsBookingTitle = `New SMS Booking: ${bookingClientName}`
              const smsBookingMsg = `${bookingClientName} booked via AI chatbot`
              await supabaseAdmin.from('notifications').insert({
                tenant_id: tenantId,
                type: 'booking_created',
                title: smsBookingTitle,
                message: smsBookingMsg,
                channel: 'in_app',
                status: 'sent',
              })
              // Telegram alert — dropped in the FL port (direct DB insert
              // above never called notify()/sendTenantTelegram).
              sendTenantTelegram(tenantId, tenant, `${smsBookingTitle}\n\n${smsBookingMsg}`).catch((err) =>
                console.error('[telnyx webhook] sms-booking telegram send failed:', err))
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
