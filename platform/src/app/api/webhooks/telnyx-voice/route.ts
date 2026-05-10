import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/nycmaid/sms'

const TELNYX_API_KEY = (process.env.TELNYX_API_KEY || '').trim()
const TELNYX_VOICE_CONNECTION_ID = (process.env.TELNYX_VOICE_CONNECTION_ID || '').trim()
const TELNYX_FROM_NUMBER = (process.env.TELNYX_FROM_NUMBER || '+18883164019').trim()

// Comma-separated E.164 list. We dial them one at a time, 25s each, until
// someone picks up. If the list is exhausted with no pickup, drop the
// caller into voicemail.
const ADMIN_RING_LIST = (process.env.ADMIN_RING_LIST || process.env.ADMIN_FORWARD_PHONE || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const VOICEMAIL_NOTIFY_PHONE = (process.env.VOICEMAIL_NOTIFY_PHONE || ADMIN_RING_LIST[0] || '').trim()
const ADMIN_LEG_TIMEOUT_SECS = Number(process.env.ADMIN_LEG_TIMEOUT_SECS || '25')
const VOICEMAIL_MAX_LENGTH_SECS = Number(process.env.VOICEMAIL_MAX_LENGTH_SECS || '120')
const MISSED_CALL_SMS_COOLDOWN_MIN = Number(process.env.MISSED_CALL_SMS_COOLDOWN_MIN || '60')

const VOICEMAIL_PROMPT = (
  process.env.VOICEMAIL_PROMPT ||
  "Hi, you've reached the New York City Maid. Please leave your name, " +
  "phone number, and what you need help with after the beep. We'll text " +
  "you right back. Press pound when you're done."
)

const MISSED_CALL_SMS_BODY = (
  process.env.MISSED_CALL_SMS_BODY ||
  "Hey, NYC Maid here — sorry we missed your call. What can we help " +
  "you with? Reply here and we'll get you sorted."
)

type TelnyxAction =
  | 'answer'
  | 'hangup'
  | 'bridge'
  | 'transfer'
  | 'speak'
  | 'record_start'
  | 'record_stop'
  | 'transcription_start'
  | 'transcription_stop'
  | 'gather_using_speak'

async function telnyxAction(
  callControlId: string,
  action: TelnyxAction,
  body: Record<string, unknown> = {},
): Promise<unknown> {
  if (!TELNYX_API_KEY) return null
  try {
    const res = await fetch(
      `https://api.telnyx.com/v2/calls/${callControlId}/actions/${action}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[telnyx-voice] action ${action} failed`, { callControlId, detail })
    }
    return await res.json().catch(() => null)
  } catch (err) {
    console.error(`[telnyx-voice] action ${action} threw`, err)
    return null
  }
}

type RingTarget = {
  kind: 'sip' | 'phone'
  destination: string // either +E.164 or "sip:user@sip.telnyx.com"
  label: string
  amd: boolean // whether to use answering-machine detection
}

// Build the ordered list of admin endpoints to dial. Online softphones
// first (browser dialer), then cell numbers from ADMIN_RING_LIST. If no
// softphones are online, this just returns the cell list.
async function buildRingTargets(): Promise<RingTarget[]> {
  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const { data: presence } = await supabaseAdmin
    .from('comhub_admin_presence')
    .select('admin_id, sip_username, sip_address, status, last_seen_at')
    .gte('last_seen_at', cutoff)
    .eq('status', 'available')
    .order('last_seen_at', { ascending: false })

  const sipTargets: RingTarget[] = []
  for (const row of presence ?? []) {
    const addr =
      row.sip_address ||
      (row.sip_username ? `sip:${row.sip_username}@sip.telnyx.com` : null)
    if (addr) {
      sipTargets.push({ kind: 'sip', destination: addr, label: addr, amd: false })
    }
  }

  const phoneTargets: RingTarget[] = ADMIN_RING_LIST.map(p => ({
    kind: 'phone' as const,
    destination: p,
    label: p,
    amd: true,
  }))

  return [...sipTargets, ...phoneTargets]
}

async function dialRingTarget(opts: {
  target: RingTarget
  customerCallId: string
  threadId: string
  contactId: string
  customerPhone: string
  ringIndex: number
}): Promise<string | null> {
  if (!TELNYX_API_KEY) return null
  try {
    // For SIP-URI targets (browser softphone), `dial` from a Call Control
    // App fails to route across connections. The reliable path is to
    // `transfer` the existing customer leg directly to the SIP URI — Telnyx
    // routes that natively to the registered UA.
    if (opts.target.kind === 'sip') {
      const res = await fetch(
        `https://api.telnyx.com/v2/calls/${opts.customerCallId}/actions/transfer`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${TELNYX_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: opts.target.destination,
            from: opts.customerPhone,
            from_display_name: 'NYC Maid',
            timeout_secs: ADMIN_LEG_TIMEOUT_SECS,
            time_limit_secs: 60 * 60,
            custom_headers: [
              { name: 'X-Comhub-Leg', value: 'admin' },
              { name: 'X-Comhub-Customer-Call', value: opts.customerCallId },
              { name: 'X-Comhub-Thread', value: opts.threadId },
              { name: 'X-Comhub-Contact', value: opts.contactId },
              { name: 'X-Comhub-Customer-Phone', value: opts.customerPhone },
              { name: 'X-Comhub-Ring-Index', value: String(opts.ringIndex) },
              { name: 'X-Comhub-Target-Kind', value: opts.target.kind },
            ],
          }),
        },
      )
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[telnyx-voice] transfer→sip failed', { target: opts.target, detail })
        return null
      }
      // transfer returns the same customer call_control_id (the leg is
      // moved, not duplicated). Return null to signal "no separate admin
      // leg to track" — the same customer leg is now ringing the softphone.
      return null
    }

    // Phone (PSTN cell) target: traditional outbound dial via Call Control
    // App. Creates a separate admin leg we can bridge later.
    if (!TELNYX_VOICE_CONNECTION_ID) return null
    const res = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection_id: TELNYX_VOICE_CONNECTION_ID,
        to: opts.target.destination,
        from: opts.customerPhone,
        from_display_name: 'NYC Maid',
        timeout_secs: ADMIN_LEG_TIMEOUT_SECS,
        time_limit_secs: 60 * 60,
        ...(opts.target.amd ? { answering_machine_detection: 'detect_beep' } : {}),
        custom_headers: [
          { name: 'X-Comhub-Leg', value: 'admin' },
          { name: 'X-Comhub-Customer-Call', value: opts.customerCallId },
          { name: 'X-Comhub-Thread', value: opts.threadId },
          { name: 'X-Comhub-Contact', value: opts.contactId },
          { name: 'X-Comhub-Customer-Phone', value: opts.customerPhone },
          { name: 'X-Comhub-Ring-Index', value: String(opts.ringIndex) },
          { name: 'X-Comhub-Target-Kind', value: opts.target.kind },
        ],
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[telnyx-voice] dialRingTarget failed', { target: opts.target, detail })
      return null
    }
    const data = await res.json()
    return data?.data?.call_control_id || null
  } catch (err) {
    console.error('[telnyx-voice] dialRingTarget threw', err)
    return null
  }
}

async function startRecordingAndTranscription(callControlId: string): Promise<void> {
  await telnyxAction(callControlId, 'record_start', {
    format: 'mp3',
    channels: 'dual',
    play_beep: false,
    transcription: true,
    transcription_language: 'en-US',
  })
  // record_start with transcription=true triggers transcription, but some
  // accounts need the explicit transcription_start as well. Best-effort.
  await telnyxAction(callControlId, 'transcription_start', {
    language: 'en-US',
    interim_results: false,
  })
}

async function logVoiceMessage(opts: {
  threadId: string
  contactId: string
  direction: 'in' | 'out' | 'system'
  author: 'customer' | 'admin' | 'system' | 'yinez'
  body: string
  externalId?: string | null
  fromAddress?: string | null
  toAddress?: string | null
  mediaUrls?: string[]
  rawPayload?: object | null
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('comhub_messages')
    .insert({
      thread_id: opts.threadId,
      contact_id: opts.contactId,
      channel: 'voice',
      direction: opts.direction,
      author: opts.author,
      body: opts.body,
      external_id: opts.externalId ?? null,
      from_address: opts.fromAddress ?? null,
      to_address: opts.toAddress ?? null,
      media_urls: opts.mediaUrls ?? null,
      raw_payload: opts.rawPayload ?? null,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[telnyx-voice] logVoiceMessage failed', error)
    return null
  }

  await supabaseAdmin
    .from('comhub_threads')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: opts.body.slice(0, 200),
      updated_at: new Date().toISOString(),
    })
    .eq('id', opts.threadId)

  return data?.id ?? null
}

async function maybeSendMissedCallSMS(opts: {
  customerPhone: string
  threadId: string
  activeCallId: string
  reason: 'no_answer' | 'voicemail' | 'hangup_before_pickup'
  contactId: string
}): Promise<void> {
  // Cooldown: don't blast the same number twice within the window.
  const cutoff = new Date(Date.now() - MISSED_CALL_SMS_COOLDOWN_MIN * 60_000).toISOString()
  const { data: recent } = await supabaseAdmin
    .from('comhub_missed_call_sms')
    .select('id')
    .eq('customer_phone', opts.customerPhone)
    .gte('sent_at', cutoff)
    .limit(1)
  if (recent && recent.length > 0) return

  // Don't SMS a cleaner number — they'd just get confused. Skip if the phone
  // matches a known cleaner.
  const { data: cleanerMatch } = await supabaseAdmin
    .from('cleaners')
    .select('id')
    .eq('phone', opts.customerPhone)
    .limit(1)
  if (cleanerMatch && cleanerMatch.length > 0) return

  const result = await sendSMS(opts.customerPhone, MISSED_CALL_SMS_BODY, {
    smsType: 'missed_call_callback',
  })

  if (result.success) {
    await supabaseAdmin.from('comhub_missed_call_sms').insert({
      customer_phone: opts.customerPhone,
      thread_id: opts.threadId,
      active_call_id: opts.activeCallId,
      reason: opts.reason,
    })
    await logVoiceMessage({
      threadId: opts.threadId,
      contactId: opts.contactId,
      direction: 'out',
      author: 'system',
      body: `💬 Sent missed-call SMS callback to ${opts.customerPhone}`,
    })
  } else {
    console.error('[telnyx-voice] missed-call SMS failed', result.error)
  }
}

async function notifyVoicemailToAdmin(opts: {
  customerPhone: string
  threadId: string
  recordingUrl: string | null
  transcript: string | null
}): Promise<void> {
  if (!VOICEMAIL_NOTIFY_PHONE) return
  const lines = [
    `📞 New voicemail from ${opts.customerPhone}`,
    opts.transcript ? `Transcript: ${opts.transcript.slice(0, 400)}` : null,
    opts.recordingUrl ? `Audio: ${opts.recordingUrl}` : null,
    `Thread: https://www.thenycmaid.com/admin/comhub?thread=${opts.threadId}`,
  ].filter(Boolean) as string[]
  await sendSMS(VOICEMAIL_NOTIFY_PHONE, lines.join('\n'), {
    skipCircuit: true,
    smsType: 'voicemail_alert',
  })
}

async function startVoicemail(opts: {
  customerCallId: string
  threadId: string
  contactId: string
}): Promise<void> {
  // Speak the prompt, then start the recording. The recording's saved URL
  // arrives later via call.recording.saved.
  await telnyxAction(opts.customerCallId, 'gather_using_speak', {
    payload: VOICEMAIL_PROMPT,
    voice: 'female',
    language: 'en-US',
    minimum_digits: 0,
    maximum_digits: 0,
    timeout_millis: 1500,
  }).catch(() => null)
  await telnyxAction(opts.customerCallId, 'record_start', {
    format: 'mp3',
    max_length: VOICEMAIL_MAX_LENGTH_SECS,
    play_beep: true,
    transcription: true,
    transcription_language: 'en-US',
    timeout_secs: 5, // hang up after 5s of silence on the trailing edge
  })
  await supabaseAdmin
    .from('comhub_active_calls')
    .update({ status: 'voicemail' })
    .eq('customer_call_id', opts.customerCallId)
  await logVoiceMessage({
    threadId: opts.threadId,
    contactId: opts.contactId,
    direction: 'system',
    author: 'system',
    body: '📼 Voicemail recording started',
  })
}

// Telnyx Programmable Voice webhook. Drives the entire inbound + outbound
// call lifecycle: answer → ring admin list → bridge → record → transcribe,
// and on no-answer falls back to voicemail with a missed-call SMS.
export async function POST(req: NextRequest) {
  // Webhook freshness check (matches the SMS webhook pattern). When the
  // public key is set we'll require a Telnyx signature header and reject
  // anything older than 5 minutes — replay protection for the call-control
  // events that drive this whole flow.
  if (process.env.TELNYX_PUBLIC_KEY) {
    const signature = req.headers.get('telnyx-signature-ed25519')
    const timestamp = req.headers.get('telnyx-timestamp')
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'missing telnyx signature' }, { status: 401 })
    }
    const age = Math.abs(Date.now() / 1000 - Number(timestamp))
    if (!Number.isFinite(age) || age > 300) {
      return NextResponse.json({ error: 'stale webhook' }, { status: 401 })
    }
  }

  const payload = (await req.json().catch(() => null)) as {
    data?: {
      event_type?: string
      payload?: {
        call_control_id?: string
        call_session_id?: string
        from?: string
        to?: string
        direction?: string
        custom_headers?: Array<{ name: string; value: string }>
        hangup_cause?: string
        hangup_source?: string
        recording_urls?: { mp3?: string; wav?: string }
        recording_id?: string
        transcription_text?: string
        start_time?: string
        end_time?: string
        result?: string
        sip_hangup_cause?: string
      }
    }
  } | null

  const event = payload?.data?.event_type || ''
  const p = payload?.data?.payload || {}
  const callControlId = p.call_control_id || ''

  const headers = (p.custom_headers || []).reduce<Record<string, string>>((a, h) => {
    a[h.name] = h.value
    return a
  }, {})
  const leg = headers['X-Comhub-Leg'] || ''
  const customerCallId = headers['X-Comhub-Customer-Call'] || null
  const ringIndex = Number(headers['X-Comhub-Ring-Index'] || '-1')

  // ─── Inbound call: customer dialed our number ─────────────────────────────
  // Answer the customer leg, then ring admin targets (online softphones
  // first via SIP transfer, then PSTN cells from ADMIN_RING_LIST). If no
  // targets are online, drop straight to voicemail.
  if (
    event === 'call.initiated' &&
    p.direction === 'incoming' &&
    callControlId &&
    p.from &&
    !leg
  ) {
    const { data: cId } = await supabaseAdmin.rpc('comhub_get_or_create_contact_by_phone', {
      p_phone: p.from,
    })
    if (!cId) return NextResponse.json({ ok: true, note: 'contact create failed' })
    const contactId = cId as string

    const { data: tId } = await supabaseAdmin.rpc('comhub_get_or_create_thread', {
      p_contact_id: contactId,
      p_channel: 'voice',
    })
    if (!tId) return NextResponse.json({ ok: true, note: 'thread create failed' })
    const threadId = tId as string

    await logVoiceMessage({
      threadId,
      contactId,
      direction: 'in',
      author: 'customer',
      body: `📞 Incoming call from ${p.from}`,
      fromAddress: p.from,
      toAddress: p.to ?? null,
      externalId: callControlId,
    })

    await supabaseAdmin.from('comhub_threads').update({ unread_count: 1 }).eq('id', threadId)

    await supabaseAdmin.from('comhub_active_calls').insert({
      customer_call_id: callControlId,
      thread_id: threadId,
      contact_id: contactId,
      customer_phone: p.from,
      direction: 'inbound',
      status: 'ringing',
    })

    // Answer the customer leg first so they hear something other than
    // silence while we dial admins. Required for PSTN target dialing;
    // harmless for SIP-URI transfer (the transfer moves the leg).
    await telnyxAction(callControlId, 'answer', {})

    const ringTargets = await buildRingTargets()
    if (ringTargets.length === 0) {
      await startVoicemail({
        customerCallId: callControlId,
        threadId,
        contactId,
      })
    } else {
      const adminCallId = await dialRingTarget({
        target: ringTargets[0],
        customerCallId: callControlId,
        threadId,
        contactId,
        customerPhone: p.from,
        ringIndex: 0,
      })
      if (adminCallId) {
        await supabaseAdmin
          .from('comhub_active_calls')
          .update({
            admin_call_id: adminCallId,
            admin_phone: ringTargets[0].label,
          })
          .eq('customer_call_id', callControlId)
      }
    }

    return NextResponse.json({ ok: true })
  }

  // ─── Customer leg answered ───────────────────────────────────────────────
  // Fires when WE answer the customer leg above. Recording starts when an
  // admin leg actually bridges in (handled in the admin-leg branch).
  if (event === 'call.answered' && !leg && callControlId) {
    return NextResponse.json({ ok: true })
  }

  // ─── Admin leg events ────────────────────────────────────────────────────
  if (leg === 'admin' && customerCallId) {
    if (event === 'call.answered') {
      // Bridge the admin leg into the customer leg.
      await telnyxAction(callControlId, 'bridge', {
        call_control_id: customerCallId,
      })
      await startRecordingAndTranscription(customerCallId)
      await supabaseAdmin
        .from('comhub_active_calls')
        .update({ status: 'bridged', answered_at: new Date().toISOString() })
        .eq('customer_call_id', customerCallId)

      const { data: active } = await supabaseAdmin
        .from('comhub_active_calls')
        .select('thread_id, contact_id, admin_phone')
        .eq('customer_call_id', customerCallId)
        .single()
      if (active) {
        await logVoiceMessage({
          threadId: active.thread_id,
          contactId: active.contact_id,
          direction: 'system',
          author: 'system',
          body: `✅ Admin ${active.admin_phone || ''} picked up`,
        })
      }
      return NextResponse.json({ ok: true })
    }

    if (event === 'call.hangup' || event === 'call.dial.failed' || event === 'call.dial.no_answer') {
      // This admin didn't answer. Try the next one, or go to VM.
      const nextIndex = ringIndex + 1
      const { data: active } = await supabaseAdmin
        .from('comhub_active_calls')
        .select('id, thread_id, contact_id, customer_phone, status')
        .eq('customer_call_id', customerCallId)
        .single()
      if (!active) return NextResponse.json({ ok: true })
      // If we already bridged, hangup of admin leg is just end of conversation.
      if (active.status === 'bridged') return NextResponse.json({ ok: true })

      const ringTargets = await buildRingTargets()
      if (nextIndex < ringTargets.length) {
        const nextCallId = await dialRingTarget({
          target: ringTargets[nextIndex],
          customerCallId,
          threadId: active.thread_id,
          contactId: active.contact_id,
          customerPhone: active.customer_phone,
          ringIndex: nextIndex,
        })
        if (nextCallId) {
          await supabaseAdmin
            .from('comhub_active_calls')
            .update({
              admin_call_id: nextCallId,
              admin_phone: ringTargets[nextIndex].label,
            })
            .eq('id', active.id)
        }
      } else {
        // Ring list exhausted → voicemail.
        await startVoicemail({
          customerCallId,
          threadId: active.thread_id,
          contactId: active.contact_id,
        })
      }
      return NextResponse.json({ ok: true })
    }
  }

  // ─── Recording saved ─────────────────────────────────────────────────────
  if (event === 'call.recording.saved' && callControlId) {
    const url = p.recording_urls?.mp3 || p.recording_urls?.wav || ''
    const { data: active } = await supabaseAdmin
      .from('comhub_active_calls')
      .select('id, thread_id, contact_id, customer_phone, status')
      .or(`customer_call_id.eq.${callControlId},admin_call_id.eq.${callControlId}`)
      .single()
    if (!active || !url) return NextResponse.json({ ok: true })

    const isVoicemail = active.status === 'voicemail'
    const messageId = await logVoiceMessage({
      threadId: active.thread_id,
      contactId: active.contact_id,
      direction: 'system',
      author: 'system',
      body: isVoicemail ? '📼 Voicemail saved' : '🎹 Call recording saved',
      mediaUrls: [url],
      externalId: p.recording_id || callControlId,
    })

    await supabaseAdmin
      .from('comhub_active_calls')
      .update({
        recording_id: p.recording_id || null,
        recording_url: url,
        ...(isVoicemail && messageId ? { voicemail_message_id: messageId } : {}),
      })
      .eq('id', active.id)

    if (isVoicemail) {
      await notifyVoicemailToAdmin({
        customerPhone: active.customer_phone,
        threadId: active.thread_id,
        recordingUrl: url,
        transcript: null,
      })
      await maybeSendMissedCallSMS({
        customerPhone: active.customer_phone,
        threadId: active.thread_id,
        activeCallId: active.id,
        reason: 'voicemail',
        contactId: active.contact_id,
      })
    }
    return NextResponse.json({ ok: true })
  }

  // ─── Transcription saved ─────────────────────────────────────────────────
  if (event === 'call.transcription' && callControlId && p.transcription_text) {
    const { data: active } = await supabaseAdmin
      .from('comhub_active_calls')
      .select('id, thread_id, contact_id, status, customer_phone')
      .or(`customer_call_id.eq.${callControlId},admin_call_id.eq.${callControlId}`)
      .single()
    if (active) {
      await logVoiceMessage({
        threadId: active.thread_id,
        contactId: active.contact_id,
        direction: 'system',
        author: 'system',
        body: `📝 Transcript:\n${p.transcription_text}`,
        externalId: callControlId,
      })
      await supabaseAdmin
        .from('comhub_active_calls')
        .update({ transcript: p.transcription_text })
        .eq('id', active.id)

      // If the transcript is for a voicemail, push it to admin too.
      if (active.status === 'voicemail') {
        await notifyVoicemailToAdmin({
          customerPhone: active.customer_phone,
          threadId: active.thread_id,
          recordingUrl: null,
          transcript: p.transcription_text,
        })
      }
    }
  }

  // ─── Customer-leg hangup → finalize active call row ──────────────────────
  if (event === 'call.hangup' && callControlId && !leg) {
    const { data: active } = await supabaseAdmin
      .from('comhub_active_calls')
      .select('id, thread_id, contact_id, customer_phone, status, answered_at')
      .eq('customer_call_id', callControlId)
      .single()
    if (active) {
      const start = p.start_time ? new Date(p.start_time) : null
      const end = p.end_time ? new Date(p.end_time) : null
      const duration =
        start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)) : null
      const dur =
        duration !== null
          ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
          : '?'
      const cause = p.hangup_cause || 'ended'

      await supabaseAdmin
        .from('comhub_active_calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_secs: duration,
          hangup_cause: cause,
        })
        .eq('id', active.id)

      await logVoiceMessage({
        threadId: active.thread_id,
        contactId: active.contact_id,
        direction: 'system',
        author: 'system',
        body: `📞 Call ended (${dur}, ${cause})`,
        externalId: callControlId,
        rawPayload: payload as object,
      })

      // If the customer hung up before any admin picked up AND no voicemail
      // was recorded, send a missed-call SMS.
      if (active.status !== 'bridged' && active.status !== 'voicemail') {
        await maybeSendMissedCallSMS({
          customerPhone: active.customer_phone,
          threadId: active.thread_id,
          activeCallId: active.id,
          reason: 'hangup_before_pickup',
          contactId: active.contact_id,
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
