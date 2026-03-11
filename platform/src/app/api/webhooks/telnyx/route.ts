import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { askSelena } from '@/lib/selena'
import { getSettings } from '@/lib/settings'

export const maxDuration = 60

// Handle inbound SMS + delivery status from Telnyx
export async function POST(request: Request) {
  const body = await request.json()
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

    // Find tenant by their Telnyx phone number
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, telnyx_api_key, telnyx_phone')
      .eq('telnyx_phone', to)
      .single()

    if (!tenant) {
      return NextResponse.json({ received: true })
    }

    const tenantId = tenant.id
    const normalizedText = text.trim().toUpperCase()

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
          .gte('start_time', new Date().toISOString())
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
          .gte('start_time', new Date().toISOString())
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
              await supabaseAdmin.from('sms_conversation_messages').insert({
                conversation_id: convo.id,
                direction: 'inbound',
                message: text,
              })

              // Send greeting
              const firstName = clientName?.split(' ')[0]
              const greeting = clientExists && firstName
                ? `Hola ${firstName}! Happy to hear from you again. How are you?`
                : (settings.chatbot_greeting || 'Hi! Thank you for reaching out. How are you?')

              await sendSMS({ to: from, body: greeting, telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone }).catch(() => {})

              // Log outbound greeting
              await supabaseAdmin.from('sms_conversation_messages').insert({
                conversation_id: convo.id,
                direction: 'outbound',
                message: greeting,
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

          // Ongoing conversation — log inbound and route to AI
          await supabaseAdmin.from('sms_conversation_messages').insert({
            conversation_id: convo.id,
            direction: 'inbound',
            message: text,
          })

          // Load transcript for AI context
          const { data: transcriptRows } = await supabaseAdmin
            .from('sms_conversation_messages')
            .select('direction, message')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: true })
            .limit(30)

          const transcript = (transcriptRows || []).map(row => ({
            role: (row.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: row.message,
          }))

          // Call Selena AI
          const aiResult = await askSelena(
            tenantId,
            text,
            convo.id,
            transcript,
            cleanPhone,
            clientExists,
            clientName,
          )

          if (aiResult?.text) {
            // Send AI response
            await sendSMS({
              to: from,
              body: aiResult.text,
              telnyxApiKey: tenant.telnyx_api_key,
              telnyxPhone: tenant.telnyx_phone,
            })

            // Log outbound to conversation
            await supabaseAdmin.from('sms_conversation_messages').insert({
              conversation_id: convo.id,
              direction: 'outbound',
              message: aiResult.text,
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

              // If client was just created by chatbot, backfill prior messages
              if (aiResult.clientCreated && !client) {
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
