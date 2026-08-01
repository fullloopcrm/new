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
import { askSelena as askYinez } from '@/lib/selena/agent'
import { getSettings } from '@/lib/settings'
import { verifyTelnyx } from '@/lib/webhook-verify'
import { isNycMaid, NYCMAID_TENANT_ID } from '@/lib/nycmaid/tenant'
import { handleNycMaidReview } from '@/lib/nycmaid/review-engine'
import { handleReviewRating } from '@/lib/review-engine'
import { handleFeedbackReply } from '@/lib/feedback-reply'
import { insertConversationMessage } from '@/lib/sms-messages'
import { getTenantTimezone } from '@/lib/tenant-time'
import { nowNaiveET } from '@/lib/recurring'
import { sendTenantTelegram } from '@/lib/notify'
import { trackError } from '@/lib/error-tracking'

export const maxDuration = 60

// NYC Maid's branded number, (212) 202-8400, forwards to the registered
// Telnyx mainline for voice; (212) 202-9030 is the paired forward leg. Telnyx
// echoes inbound SMS sent directly to either forward leg with the ORIGINAL
// dialed number in `payload.to`, not the mainline — so a plain telnyx_phone
// lookup never matches and real client texts sent to the branded number were
// silently dropped (confirmed live 2026-07-27: 17 distinct real senders in 5
// days). Outbound replies are unaffected — sendSMS() always sends from the
// tenant's registered telnyx_phone (the mainline), never these aliases.
const TENANT_PHONE_ALIASES: Record<string, string> = {
  '+12122028400': NYCMAID_TENANT_ID,
  '+12122029030': NYCMAID_TENANT_ID,
}

// Handle inbound SMS + delivery status from Telnyx
export async function POST(request: Request) {
  const rawBody = await request.text()

  // Signature verification (skip only when explicitly disabled for local dev).
  if (process.env.TELNYX_WEBHOOK_VERIFY !== 'off') {
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
      .select('id, name, telnyx_api_key, telnyx_phone, owner_phone, timezone, telegram_bot_token, telegram_chat_id')
      .eq('telnyx_phone', to)
      .order('id', { ascending: true })
      .limit(2)

    if (tenantMatches && tenantMatches.length > 1) {
      console.error(`[telnyx] telnyx_phone ${to} matches ${tenantMatches.length} tenants — dedupe needed; routing to ${tenantMatches[0].name}`)
    }
    let tenant = tenantMatches?.[0] || null

    if (!tenant && TENANT_PHONE_ALIASES[to]) {
      const { data: aliasTenant } = await supabaseAdmin
        .from('tenants')
        .select('id, name, telnyx_api_key, telnyx_phone, owner_phone, timezone, telegram_bot_token, telegram_chat_id')
        .eq('id', TENANT_PHONE_ALIASES[to])
        .maybeSingle()
      // Telnyx's forward-leg setup on these aliases echoes the tenant's OWN
      // outbound SMS (e.g. an internal ops alert sent from the mainline) back
      // as a second inbound event between the alias legs — `from` being the
      // tenant's own mainline or either alias number means this is that echo,
      // not a real customer. Confirmed live 2026-07-28: an internal "30-Min
      // Heads Up" ops alert got fed to Yinez as if a client sent it, and she
      // tried to act on it. Drop these; only accept a genuine outside sender.
      const isSelfEcho = !!aliasTenant && (from === aliasTenant.telnyx_phone || from in TENANT_PHONE_ALIASES)
      tenant = (!isSelfEcho && aliasTenant) || null
    }

    if (!tenant) {
      return NextResponse.json({ received: true })
    }

    const tenantId = tenant.id
    const normalizedText = text.trim().toUpperCase()

    // FEEDBACK REPLY — checked before the owner-chat branch below. It's a
    // no-op unless this exact phone number has a genuinely pending feedback
    // reply thread (handleFeedbackReply requires a client match AND a recent
    // reply_requested_at), so this can't change behavior for any normal
    // owner text. Without this ordering, a phone number that happens to be
    // BOTH the tenant's registered owner_phone and a client's phone (e.g. an
    // owner testing with their own number as a client record) always gets
    // routed to the owner<->admin chat below, and a genuine client reply on
    // that number can never reach client_feedback.notes — reproduced live
    // 2026-07-25 testing the feedback-reply feature.
    const feedbackReply = await handleFeedbackReply({ tenantId, from, text })
    if (feedbackReply) return feedbackReply

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
        .limit(1)
        .maybeSingle()

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
        .limit(1)
        .maybeSingle()

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
        .limit(1)
        .maybeSingle()

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
        .limit(1)
        .maybeSingle()

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
          const noteText = `[Auto] Confirmed via SMS on ${new Date().toLocaleDateString('en-US', { timeZone: getTenantTimezone(tenant) })}`
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
        .limit(1)
        .maybeSingle()

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

          const confirmNote = `[Auto] Team confirmed by ${member.name} via SMS on ${new Date().toLocaleDateString('en-US', { timeZone: getTenantTimezone(tenant) })}`
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
        .limit(1)
        .maybeSingle()

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
          const ratingNote = `[RATING:${rating}] by ${ratingClient.name} on ${new Date().toLocaleDateString('en-US', { timeZone: getTenantTimezone(tenant) })}`
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
    // Last-10-digit tolerant match, not exact .eq('phone', from) — `from`
    // arrives E.164 ("+19292846130") but clients/team_members/applications
    // phone columns are inconsistently stored with or without the country
    // code. An exact match silently missed real matches (e.g. an active
    // team member texting in got treated as a brand-new lead purely because
    // her stored phone lacked the "+1"), which is what created bogus
    // duplicate "client" rows for people already in the system.
    const inboundLast10 = from.replace(/\D/g, '').slice(-10)

    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .ilike('phone', `%${inboundLast10}%`)
      .limit(1)
      .maybeSingle()

    const { data: member } = await supabaseAdmin
      .from('team_members')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .ilike('phone', `%${inboundLast10}%`)
      .limit(1)
      .maybeSingle()

    // A job applicant texting back (e.g. answering a screening question)
    // isn't a sales prospect — recognize them too, alongside client/member,
    // so they don't get funneled into createLeadAndEnterPipeline below as a
    // brand-new lead. Checked across both application tables since which
    // one is live depends on the tenant's industry preset.
    const [{ data: teamApplicant }, { data: cleanerApplicant }] = await Promise.all([
      supabaseAdmin.from('team_applications').select('id, name')
        .eq('tenant_id', tenantId).ilike('phone', `%${inboundLast10}%`).limit(1).maybeSingle(),
      supabaseAdmin.from('cleaner_applications').select('id, name')
        .eq('tenant_id', tenantId).ilike('phone', `%${inboundLast10}%`).limit(1).maybeSingle(),
    ])
    const applicant = teamApplicant || cleanerApplicant

    // An SMS from a phone that matches neither an existing client, team
    // member, nor applicant is a brand-new prospect texting in cold. Before
    // this fix, that case created only the notification below — no client,
    // no portal_lead, no sales deal — so it was invisible to Sales unless an
    // admin happened to notice the alert (2026-07-30 pipeline trace
    // finding). Give it the same real lead record every other intake source
    // gets.
    let newLeadClientId: string | null = null
    if (!client && !member && !applicant) {
      try {
        const { createLeadAndEnterPipeline } = await import('@/lib/lead-intake')
        // No name field — leave it unset (falls back to 'Unknown') rather
        // than stamping the raw phone number as the display name. That
        // literal-phone-as-name was what made these rows unreadable in the
        // client list; the clients-list default view also now hides
        // name==='Unknown' rows so this doesn't clutter it.
        const result = await createLeadAndEnterPipeline(tenantId, {
          phone: from, source: 'sms-inbound',
          notes: `First inbound SMS: ${text.slice(0, 500)}`,
        })
        newLeadClientId = result.clientId
      } catch (leadErr) {
        console.error('[telnyx webhook] inbound-sms lead creation failed:', leadErr)
        await trackError(leadErr, { source: 'webhooks/telnyx:inbound-sms-lead', severity: 'high', tenantId }).catch(() => {})
      }
    }

    const senderName = client?.name || member?.name || applicant?.name || from

    // Create notification for inbound SMS
    const inboundSmsTitle = `SMS from ${senderName}${applicant && !member && !client ? ' (applicant)' : ''}`
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
        client_id: client?.id || newLeadClientId,
        team_member_id: member?.id || null,
        applicant_id: applicant?.id || null,
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
      const noteText = `[SMS ${new Date().toLocaleDateString('en-US', { timeZone: getTenantTimezone(tenant) })}] ${text.slice(0, 200)}`
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
          // replyEnabled gates every OUTBOUND action below (greeting, AI reply,
          // "start over" re-greet) — but conversation creation + inbound
          // logging always runs regardless, because that's what feeds
          // sms_conversation_messages → comhub_messages (see
          // comhub_mirror_sms_message trigger). Before this, a tenant with
          // sms_reply_enabled off would also stop appearing in ComHub — those
          // two concerns were wrongly conflated under one flag. A tenant can
          // now go reply-silent on SMS while every inbound text still lands
          // in ComHub for a human to see and answer.
          const replyEnabled = settings.sms_reply_enabled
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

            if (!replyEnabled) {
              return NextResponse.json({ received: true, action: 'reset_no_reply' })
            }

            // Send fresh greeting
            const greeting = settings.chatbot_greeting || 'Hi! Thank you for reaching out. How are you?'
            await sendSMS({ to: from, body: greeting, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})

            // Create new conversation
            await supabaseAdmin.from('sms_conversations').insert({
              tenant_id: tenantId,
              phone: cleanPhone,
              to_phone: to,
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
            // First message from this phone — always create the conversation
            // and log the inbound message (so it reaches ComHub), regardless
            // of reply settings.
            const { data: newConvo } = await supabaseAdmin.from('sms_conversations').insert({
              tenant_id: tenantId,
              phone: cleanPhone,
              to_phone: to,
              client_id: client?.id || null,
              name: clientName,
              state: 'welcome',
            }).select('id, client_id, name').single()

            if (newConvo) {
              convo = newConvo

              // Log inbound message to conversation
              await insertConversationMessage(
                { conversation_id: convo.id, direction: 'inbound', message: text, to_phone: to },
                { expectedTenantId: tenantId },
              )

              // Tenant rule: if replies are off, or auto_respond_leads is off
              // for an unrecognized sender, do not auto-greet. The inbound
              // message is still logged above (ComHub + client_sms_messages).
              if (replyEnabled && (clientExists || settings.auto_respond_leads)) {
                const firstName = clientName?.split(' ')[0]
                const greeting = clientExists && firstName
                  ? `Hola ${firstName}! Happy to hear from you again. How are you?`
                  : (settings.chatbot_greeting || 'Hi! Thank you for reaching out. How are you?')

                await sendSMS({ to: from, body: greeting, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})

                // Log outbound greeting
                await insertConversationMessage(
                  { conversation_id: convo.id, direction: 'outbound', message: greeting, to_phone: to },
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
            }

            return NextResponse.json({ received: true, action: replyEnabled ? 'chatbot_greeting' : 'logged_no_reply' })
          }

          // Ongoing conversation — always log inbound (feeds ComHub)
          await insertConversationMessage(
            { conversation_id: convo.id, direction: 'inbound', message: text, to_phone: to },
            { expectedTenantId: tenantId },
          )

          if (!replyEnabled) {
            return NextResponse.json({ received: true, action: 'logged_no_reply' })
          }

          // Every tenant runs the shared Yinez core (warm voice, self-book
          // redirect, memory/skills) — NYC Maid via her own verbatim playbook,
          // every other tenant via the config-driven one (resolveBasePlaybook).
          // Pass tenantId explicitly (this webhook already knows it) and the
          // sender phone so Yinez does owner-detection + client lookup.
          const aiResult = await askYinez('sms', text, convo.id, from, undefined, tenantId)

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
              { conversation_id: convo.id, direction: 'outbound', message: aiResult.text, to_phone: to },
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
              // The legacy-engine "just created by chatbot, backfill prior
              // messages" branch was removed here (2026-07-28) — YinezResult
              // never carried that flag, and it's now unreachable for every
              // tenant since all of them run Yinez. Not a functional gap:
              // Yinez's own create_client tool already links the conversation
              // to the new client record at creation time, not after the fact.
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
        await trackError(err, { source: 'webhooks/telnyx/chatbot', tenantId, severity: 'high' }).catch(() => {})
        // Fall through — chatbot failure shouldn't block the webhook
      }
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
