import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/nycmaid/sms'
import { verifyTelnyx, isWebhookVerifyDisabled } from '@/lib/webhook-verify'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'

const TELNYX_API_KEY = (process.env.TELNYX_API_KEY || '').trim()
const TELNYX_VOICE_CONNECTION_ID = (process.env.TELNYX_VOICE_CONNECTION_ID || '').trim()
const TELNYX_FROM_NUMBER = (process.env.TELNYX_FROM_NUMBER || '+18883164019').trim()

type VoiceTenantResolution =
  | { ok: true; tenantId: string }
  | { ok: false; status: number; reason: string }

// Resolve the tenant that owns the DID the customer dialed (payload.to),
// mirroring the SMS webhook's telnyx_phone lookup. FAIL CLOSED: a DID that
// maps to no tenant, or to more than one (shared-number mis-seed), is REJECTED
// rather than silently defaulting to nycmaid — otherwise a second voice tenant
// would cross-route its calls (recording, transcripts, missed-call SMS) into
// nycmaid. limit(2) (not .single()) so an ambiguous match is detected instead
// of throwing.
async function resolveVoiceTenant(toDid: string | undefined): Promise<VoiceTenantResolution> {
  const did = (toDid || '').trim()
  if (!did) return { ok: false, status: 422, reason: 'missing called number' }

  const { data: matches } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('telnyx_phone', did)
    .order('id', { ascending: true })
    .limit(2)

  if (!matches || matches.length === 0) {
    console.warn(`[telnyx-voice] no tenant for called DID ${did} — rejecting`)
    return { ok: false, status: 404, reason: 'no tenant for called number' }
  }
  if (matches.length > 1) {
    console.error(`[telnyx-voice] DID ${did} matches ${matches.length} tenants — ambiguous, rejecting`)
    return { ok: false, status: 409, reason: 'ambiguous tenant for called number' }
  }
  return { ok: true, tenantId: matches[0].id }
}

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

// Per-tenant PSTN fallback numbers, sourced from each admin's own voice
// settings (the same table the /admin/comhub/voice/settings UI writes to).
// Ordered by admin_id for deterministic ring order.
//
// NOTE: this does NOT filter on ring_strategy / do_not_disturb_until —
// it's also used by notifyVoicemailToAdmin() as an after-the-fact SMS
// text alert, which should still reach an admin who opted their *live
// PSTN ringing* out via 'browser_only' or a DND window. buildRingTargets()
// below applies those filters itself for the actual live-dial path.
async function getTenantAdminCellPhones(tenantId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('comhub_admin_voice_settings')
    .select('admin_id, fallback_cell_phone')
    .eq('tenant_id', tenantId)
    .order('admin_id', { ascending: true })

  return (data ?? [])
    .map(row => (row.fallback_cell_phone || '').trim())
    .filter(Boolean)
}

function isDndActive(doNotDisturbUntil: string | null | undefined, nowMs: number): boolean {
  if (!doNotDisturbUntil) return false
  const until = new Date(doNotDisturbUntil).getTime()
  return Number.isFinite(until) && until > nowMs
}

// Build the ordered list of admin endpoints to dial for this tenant's call.
// Online softphones first (browser dialer), then this tenant's configured
// cell numbers. If no softphones are online, this just returns the cell
// list. TENANT-SCOPED: both presence and cell numbers are filtered to
// tenantId — an unrelated tenant's online admin or configured cell must
// never ring for this call.
//
// Also honors each admin's own comhub_admin_voice_settings: 'ring_strategy'
// ('browser_only' skips that admin's PSTN cell fallback entirely;
// 'cell_only' skips ringing their online browser softphone) and
// 'do_not_disturb_until' (skips that admin on BOTH legs while active).
// These settings existed and were writable via the voice settings UI but
// were never read here — an admin who explicitly chose "browser only" (to
// avoid a live PSTN dial-out to their personal cell) or set a DND window
// still had their cell rung on every inbound call, at real per-minute
// Telnyx cost and against their stated preference.
async function buildRingTargets(tenantId: string): Promise<RingTarget[]> {
  const nowMs = Date.now()
  const cutoff = new Date(nowMs - 60_000).toISOString()

  const [{ data: presence }, { data: settingsRows }] = await Promise.all([
    supabaseAdmin
      .from('comhub_admin_presence')
      .select('admin_id, sip_username, sip_address, status, last_seen_at')
      .eq('tenant_id', tenantId)
      .gte('last_seen_at', cutoff)
      .eq('status', 'available')
      .order('last_seen_at', { ascending: false }),
    supabaseAdmin
      .from('comhub_admin_voice_settings')
      .select('admin_id, fallback_cell_phone, ring_strategy, do_not_disturb_until')
      .eq('tenant_id', tenantId)
      .order('admin_id', { ascending: true }),
  ])

  const prefsByAdmin = new Map(
    (settingsRows ?? []).map(row => [row.admin_id, row]),
  )

  const sipTargets: RingTarget[] = []
  for (const row of presence ?? []) {
    const prefs = prefsByAdmin.get(row.admin_id)
    if (isDndActive(prefs?.do_not_disturb_until, nowMs)) continue
    if (prefs?.ring_strategy === 'cell_only') continue
    const addr =
      row.sip_address ||
      (row.sip_username ? `sip:${row.sip_username}@sip.telnyx.com` : null)
    if (addr) {
      sipTargets.push({ kind: 'sip', destination: addr, label: addr, amd: false })
    }
  }

  const phoneTargets: RingTarget[] = (settingsRows ?? [])
    .filter(row => row.ring_strategy !== 'browser_only')
    .filter(row => !isDndActive(row.do_not_disturb_until, nowMs))
    .map(row => (row.fallback_cell_phone || '').trim())
    .filter(Boolean)
    .map(destination => ({ kind: 'phone' as const, destination, label: destination, amd: true }))

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
  tenantId: string
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
      tenant_id: opts.tenantId,
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
  tenantId: string
  customerPhone: string
  threadId: string
  activeCallId: string
  reason: 'no_answer' | 'voicemail' | 'hangup_before_pickup'
  contactId: string
}): Promise<void> {
  // Cooldown: don't blast the same number twice within the window.
  // Scoped to this tenant — comhub_missed_call_sms is per-tenant data, and an
  // unscoped lookup would let one tenant's cooldown silently suppress another
  // tenant's missed-call SMS to the same phone number (e.g. a shared/reused
  // number calling two different businesses within the window).
  const cutoff = new Date(Date.now() - MISSED_CALL_SMS_COOLDOWN_MIN * 60_000).toISOString()
  const { data: recent } = await supabaseAdmin
    .from('comhub_missed_call_sms')
    .select('id')
    .eq('tenant_id', opts.tenantId)
    .eq('customer_phone', opts.customerPhone)
    .gte('sent_at', cutoff)
    .limit(1)
  if (recent && recent.length > 0) return

  // Don't SMS a cleaner number — they'd just get confused. Skip if the phone
  // matches a known cleaner OF THIS TENANT. cleaners.tenant_id is NOT NULL
  // (migrations/2026_05_09_tenant_id_core.sql) — an unscoped match here would
  // let a cleaner registered under a different tenant permanently block their
  // own number from ever receiving a missed-call SMS as a customer elsewhere.
  const { data: cleanerMatch } = await supabaseAdmin
    .from('cleaners')
    .select('id')
    .eq('tenant_id', opts.tenantId)
    .eq('phone', opts.customerPhone)
    .limit(1)
  if (cleanerMatch && cleanerMatch.length > 0) return

  const result = await sendSMS(opts.customerPhone, MISSED_CALL_SMS_BODY, {
    smsType: 'missed_call_callback',
  })

  if (result.success) {
    await supabaseAdmin.from('comhub_missed_call_sms').insert({
      tenant_id: opts.tenantId,
      customer_phone: opts.customerPhone,
      thread_id: opts.threadId,
      active_call_id: opts.activeCallId,
      reason: opts.reason,
    })
    await logVoiceMessage({
      tenantId: opts.tenantId,
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
  tenantId: string
  customerPhone: string
  threadId: string
  recordingUrl: string | null
  transcript: string | null
}): Promise<void> {
  const [notifyPhone] = await getTenantAdminCellPhones(opts.tenantId)
  if (!notifyPhone) return
  const lines = [
    `📞 New voicemail from ${opts.customerPhone}`,
    opts.transcript ? `Transcript: ${opts.transcript.slice(0, 400)}` : null,
    opts.recordingUrl ? `Audio: ${opts.recordingUrl}` : null,
    `Thread: https://www.thenycmaid.com/admin/comhub?thread=${opts.threadId}`,
  ].filter(Boolean) as string[]
  await sendSMS(notifyPhone, lines.join('\n'), {
    skipCircuit: true,
    smsType: 'voicemail_alert',
  })
}

async function startVoicemail(opts: {
  tenantId: string
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
    tenantId: opts.tenantId,
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
  // Strict Ed25519 signature verification (mirrors the SMS webhook). We must
  // read the RAW body and verify the signature over those exact bytes BEFORE
  // JSON.parse. FAIL CLOSED: verifyTelnyx returns invalid on a missing header,
  // a bad signature, a stale (>5 min) timestamp, OR an unconfigured public key
  // — every one of those is a 401. The only bypass is the explicit
  // TELNYX_WEBHOOK_VERIFY=off local-dev flag. This closes the prior fail-OPEN
  // hole where an unsigned/forged call-control event could drive the whole
  // dial/record/voicemail flow (toll-fraud / call forgery).
  const rawBody = await req.text()

  if (!isWebhookVerifyDisabled(process.env.TELNYX_WEBHOOK_VERIFY)) {
    const result = verifyTelnyx(req.headers, rawBody, process.env.TELNYX_PUBLIC_KEY)
    if (!result.valid) {
      console.warn('[telnyx-voice] rejected:', result.reason)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload:
    | {
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
      }
    | null
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

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
    // Route by the DID that was actually dialed. FAIL CLOSED on unknown /
    // ambiguous — never fall back to a hardcoded tenant.
    const resolved = await resolveVoiceTenant(p.to)
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.reason }, { status: resolved.status })
    }
    const tenantId = resolved.tenantId

    const { data: cId, error: cErr } = await supabaseAdmin.rpc('comhub_get_or_create_contact_by_phone', {
      p_tenant_id: tenantId,
      p_phone: p.from,
    })
    if (cErr) console.error('[telnyx-voice] contact create failed', cErr)
    if (!cId) return NextResponse.json({ ok: true, note: 'contact create failed' })
    const contactId = cId as string

    const { data: tId, error: tErr } = await supabaseAdmin.rpc('comhub_get_or_create_thread', {
      p_tenant_id: tenantId,
      p_contact_id: contactId,
      p_channel: 'voice',
    })
    if (tErr) console.error('[telnyx-voice] thread create failed', tErr)
    if (!tId) return NextResponse.json({ ok: true, note: 'thread create failed' })
    const threadId = tId as string

    // Claim BEFORE any other side effect: Telnyx retries a webhook delivery
    // that doesn't ack 2xx in time, and this branch is slow (multiple
    // sequential DB/RPC round trips + a live Telnyx API call to answer, then
    // dialing admin targets) — exactly the kind of path likely to cause that
    // timeout. A redelivered call.initiated previously re-ran the whole
    // branch: duplicate "Incoming call" transcript message, and worse, a
    // SECOND real PSTN/SIP ring to the admin's phone for the same inbound
    // call. comhub_active_calls.customer_call_id already has a UNIQUE
    // constraint (migrations/2026_05_19_comhub.sql) — this insert's error was
    // simply never checked, so the constraint existed but did nothing. Check
    // it now and short-circuit on a duplicate before touching the transcript
    // or ringing anyone.
    const { error: claimErr } = await supabaseAdmin.from('comhub_active_calls').insert({
      tenant_id: tenantId,
      customer_call_id: callControlId,
      thread_id: threadId,
      contact_id: contactId,
      customer_phone: p.from,
      direction: 'inbound',
      status: 'ringing',
    })
    if (claimErr) {
      if (claimErr.code === '23505') {
        return NextResponse.json({ ok: true, duplicate: true })
      }
      console.error('[telnyx-voice] comhub_active_calls claim failed', claimErr)
      return NextResponse.json({ ok: true, note: 'active-call claim failed' })
    }

    await logVoiceMessage({
      tenantId,
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

    // Answer the customer leg first so they hear something other than
    // silence while we dial admins. Required for PSTN target dialing;
    // harmless for SIP-URI transfer (the transfer moves the leg).
    await telnyxAction(callControlId, 'answer', {})

    const ringTargets = await buildRingTargets(tenantId)
    if (ringTargets.length === 0) {
      await startVoicemail({
        tenantId,
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
      // Claim BEFORE bridging: Telnyx may redeliver this same call.answered
      // event (this branch does a live Telnyx bridge call + starts
      // recording/transcription — slow, the same shape that already caused
      // a redelivered call.initiated to double-ring). Without a claim, a
      // redelivery re-bridges, re-starts a SECOND recording, and re-logs a
      // duplicate "Admin picked up" transcript entry. Atomically flip
      // ringing->bridged; a redelivery finds the row no longer 'ringing'
      // and no-ops. Uses the update's own .select() as the read, so there's
      // no separate check-then-act gap. Works for both PSTN and SIP-transfer
      // admin targets (unlike admin_call_id, which sip transfers never set).
      const { data: claimed } = await supabaseAdmin
        .from('comhub_active_calls')
        .update({ status: 'bridged', answered_at: new Date().toISOString() })
        .eq('customer_call_id', customerCallId)
        .eq('status', 'ringing')
        .select('tenant_id, thread_id, contact_id, admin_phone')
        .single()

      if (!claimed) {
        return NextResponse.json({ ok: true, duplicate: true })
      }

      // Bridge the admin leg into the customer leg.
      await telnyxAction(callControlId, 'bridge', {
        call_control_id: customerCallId,
      })
      await startRecordingAndTranscription(customerCallId)

      await logVoiceMessage({
        tenantId: claimed.tenant_id,
        threadId: claimed.thread_id,
        contactId: claimed.contact_id,
        direction: 'system',
        author: 'system',
        body: `✅ Admin ${claimed.admin_phone || ''} picked up`,
      })
      return NextResponse.json({ ok: true })
    }

    if (event === 'call.hangup' || event === 'call.dial.failed' || event === 'call.dial.no_answer') {
      // This admin didn't answer. Try the next one, or go to VM.
      // KNOWN GAP (not fixed this pass): unlike call.initiated and
      // call.answered above, this branch has no redelivery-dedup claim — a
      // redelivered failure event can double-dial the next admin or
      // double-start voicemail. admin_call_id can't be used as the claim key
      // (SIP-transfer targets never populate it, see dialRingTarget). Needs
      // ring_claimed_index (proposed:
      // 2026_07_16_comhub_active_calls_ring_claim_column_PROPOSED.sql) before
      // a safe atomic claim can be wired in here.
      const nextIndex = ringIndex + 1
      const { data: active } = await supabaseAdmin
        .from('comhub_active_calls')
        .select('id, tenant_id, thread_id, contact_id, customer_phone, status')
        .eq('customer_call_id', customerCallId)
        .single()
      if (!active) return NextResponse.json({ ok: true })
      // If we already bridged, hangup of admin leg is just end of conversation.
      if (active.status === 'bridged') return NextResponse.json({ ok: true })

      const ringTargets = await buildRingTargets(active.tenant_id)
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
          tenantId: active.tenant_id,
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
    const safeCallControlId = sanitizePostgrestValue(callControlId)
    const { data: active } = await supabaseAdmin
      .from('comhub_active_calls')  // tenant-scope-ok: webhook resolves tenant from the verified event payload
      .select('id, tenant_id, thread_id, contact_id, customer_phone, status')
      .or(`customer_call_id.eq.${safeCallControlId},admin_call_id.eq.${safeCallControlId}`)
      .single()
    if (!active || !url) return NextResponse.json({ ok: true })

    const isVoicemail = active.status === 'voicemail'
    const messageId = await logVoiceMessage({
      tenantId: active.tenant_id,
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
        tenantId: active.tenant_id,
        customerPhone: active.customer_phone,
        threadId: active.thread_id,
        recordingUrl: url,
        transcript: null,
      })
      await maybeSendMissedCallSMS({
        tenantId: active.tenant_id,
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
    const safeCallControlId = sanitizePostgrestValue(callControlId)
    const { data: active } = await supabaseAdmin
      .from('comhub_active_calls')  // tenant-scope-ok: webhook resolves tenant from the verified event payload
      .select('id, tenant_id, thread_id, contact_id, status, customer_phone')
      .or(`customer_call_id.eq.${safeCallControlId},admin_call_id.eq.${safeCallControlId}`)
      .single()
    if (active) {
      await logVoiceMessage({
        tenantId: active.tenant_id,
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
          tenantId: active.tenant_id,
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
      .select('id, tenant_id, thread_id, contact_id, customer_phone, status, answered_at')
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
        tenantId: active.tenant_id,
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
          tenantId: active.tenant_id,
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
