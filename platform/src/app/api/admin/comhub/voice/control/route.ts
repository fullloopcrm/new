import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getComhubAdminTenantId as getCurrentTenantId } from '@/lib/comhub-admin-tenant'
import { getActiveAdminMemberId } from '@/lib/admin-member'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveTenantVoiceConfig } from '@/lib/comhub-voice-config'

type Action = 'answer' | 'hold' | 'unhold' | 'mute' | 'unmute' | 'hangup' | 'transfer_blind' | 'transfer_warm' | 'speak' | 'dtmf'
const ACTIONS: Action[] = ['answer', 'hold', 'unhold', 'mute', 'unmute', 'hangup', 'transfer_blind', 'transfer_warm', 'speak', 'dtmf']

async function telnyxAction(
  apiKey: string,
  callControlId: string,
  endpoint: string,
  body: Record<string, unknown> = {},
): Promise<{ ok: boolean; detail?: unknown }> {
  if (!apiKey) return { ok: false, detail: 'no telnyx api key' }
  try {
    const res = await fetch(
      `https://api.telnyx.com/v2/calls/${callControlId}/actions/${endpoint}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { ok: false, detail: detail.slice(0, 500) }
    }
    return { ok: true, detail: await res.json().catch(() => null) }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'unknown error' }
  }
}

// POST /api/admin/comhub/voice/control
//   { active_call_id?, customer_call_id?, action, payload? }
// Drives mid-call controls on the customer leg.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const cfg = await resolveTenantVoiceConfig(tenantId)

  const body = (await req.json().catch(() => null)) as {
    active_call_id?: string
    customer_call_id?: string
    action?: string
    payload?: Record<string, unknown>
  } | null

  if (!body || !body.action || !(ACTIONS as string[]).includes(body.action)) {
    return NextResponse.json({ error: 'valid action required' }, { status: 400 })
  }
  const action = body.action as Action

  // "answer" grabs a ringing/voicemail call on demand for WHICHEVER admin
  // clicked the button in the ComHub call bar — independent of the
  // automatic ring-target sequence, and independent of whether that admin's
  // softphone happened to win the ring order. This is what the call bar
  // never had: buildRingTargets/advanceRingOrVoicemail (telnyx-voice
  // webhook) only ever dial admins in a fixed, pre-computed order; there was
  // no way for a specific admin to say "give it to me" mid-ring. Needs its
  // own field set (thread_id/contact_id/customer_phone), so it's handled
  // before the generic customer_call_id resolution below, which only fetches
  // what hold/mute/hangup/etc need.
  if (action === 'answer') {
    if (!body.active_call_id) {
      return NextResponse.json({ error: 'active_call_id required' }, { status: 400 })
    }
    const { data: active } = await supabaseAdmin
      .from('comhub_active_calls')
      .select('id, customer_call_id, thread_id, contact_id, customer_phone, status')
      .eq('id', body.active_call_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!active) return NextResponse.json({ error: 'Active call not found' }, { status: 404 })
    if (active.status === 'bridged') {
      return NextResponse.json({ error: 'Call already answered' }, { status: 409 })
    }
    if (active.status === 'ended') {
      return NextResponse.json({ error: 'Call already ended' }, { status: 409 })
    }

    const adminId = await getActiveAdminMemberId(tenantId)
    if (!adminId) return NextResponse.json({ error: 'no tenant member found' }, { status: 412 })

    const [{ data: presence }, { data: settings }] = await Promise.all([
      supabaseAdmin
        .from('comhub_admin_presence')
        .select('sip_username, sip_address, last_seen_at')
        .eq('tenant_id', tenantId)
        .eq('admin_id', adminId)
        .single(),
      supabaseAdmin
        .from('comhub_admin_voice_settings')
        .select('fallback_cell_phone')
        .eq('tenant_id', tenantId)
        .eq('admin_id', adminId)
        .single(),
    ])

    const isOnline =
      !!presence?.last_seen_at && new Date(presence.last_seen_at as string).getTime() > Date.now() - 60_000
    const sipAddr = isOnline
      ? (presence?.sip_address as string | null) ||
        (presence?.sip_username ? `sip:${presence.sip_username}@sip.telnyx.com` : null)
      : null
    const cellPhone = (settings?.fallback_cell_phone as string | null) || null

    if (!sipAddr && !cellPhone) {
      return NextResponse.json(
        {
          error: 'no answer target',
          detail: 'Open Loop Phone to register, or set a fallback cell number in Voice settings, before answering from here.',
        },
        { status: 412 },
      )
    }

    if (active.status === 'voicemail') {
      // Best-effort: stop the in-progress voicemail recording before pulling
      // the call away from it. Not fatal if this fails — the transfer below
      // still moves the call either way.
      await telnyxAction(cfg.apiKey, active.customer_call_id, 'record_stop', {}).catch(() => null)
    }

    if (sipAddr) {
      const res = await fetch(
        `https://api.telnyx.com/v2/calls/${active.customer_call_id}/actions/transfer`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: sipAddr,
            from: active.customer_phone,
            from_display_name: 'Comhub',
          }),
        },
      )
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        return NextResponse.json({ error: 'answer transfer failed', detail: detail.slice(0, 400) }, { status: 502 })
      }
      // The webhook's call.answered handler flips status to 'bridged' once
      // this admin actually picks up, using admin_phone as the signal that a
      // transfer is in flight (see telnyx-voice/route.ts).
      await supabaseAdmin.from('comhub_active_calls').update({ admin_phone: sipAddr }).eq('id', active.id)
      return NextResponse.json({ ok: true, action: 'answer', via: 'softphone' })
    }

    if (!cfg.voiceConnectionId) {
      return NextResponse.json({ error: 'voice connection required (tenant or platform)' }, { status: 503 })
    }
    const dialRes = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connection_id: cfg.voiceConnectionId,
        to: cellPhone,
        // NOT active.customer_phone — a fresh PSTN origination (unlike the
        // SIP transfer above) requires a caller ID Telnyx actually lets this
        // account originate from. Using the real customer's number here
        // gets a hard "Unverified origination number" rejection (D51) for
        // any genuine external caller — confirmed live, this is what
        // actually broke the real Answer-button test.
        from: cfg.fromNumber,
        from_display_name: 'Comhub',
        answering_machine_detection: 'detect_beep',
        // Reuses the exact custom-header shape the automatic ring-target
        // dial already produces, so the existing admin-leg webhook branch
        // (leg === 'admin') bridges this in on answer with no new webhook
        // logic needed. Ring-index 999 guarantees a no-answer/failure here
        // falls straight to voicemail instead of re-ringing other targets.
        custom_headers: [
          { name: 'X-Comhub-Leg', value: 'admin' },
          { name: 'X-Comhub-Customer-Call', value: active.customer_call_id },
          { name: 'X-Comhub-Thread', value: active.thread_id },
          { name: 'X-Comhub-Contact', value: active.contact_id },
          { name: 'X-Comhub-Customer-Phone', value: active.customer_phone },
          { name: 'X-Comhub-Ring-Index', value: '999' },
          { name: 'X-Comhub-Target-Kind', value: 'phone' },
        ],
      }),
    })
    if (!dialRes.ok) {
      const detail = await dialRes.text().catch(() => '')
      return NextResponse.json({ error: 'answer dial failed', detail: detail.slice(0, 400) }, { status: 502 })
    }
    const dialData = await dialRes.json()
    await supabaseAdmin
      .from('comhub_active_calls')
      .update({ admin_phone: cellPhone, admin_call_id: dialData?.data?.call_control_id || null })
      .eq('id', active.id)
    return NextResponse.json({ ok: true, action: 'answer', via: 'cell' })
  }

  // customer_call_id is a caller-supplied Telnyx call_control_id. Tenants
  // without their own Telnyx account share the platform's TELNYX_API_KEY
  // (comhub-voice-config.ts), so call_control_ids for DIFFERENT tenants can
  // live in the SAME Telnyx account — an admin of tenant A supplying tenant
  // B's customer_call_id would otherwise let telnyxAction() below execute
  // hold/mute/hangup/transfer/speak/dtmf against tenant B's live customer
  // call using tenant A's (or the shared) API key. The previous code only
  // used this tenant-scoped lookup to *optionally* fill activeCallRowId for
  // the DB update — it never gated whether the Telnyx action ran. Now the
  // Telnyx call id is ONLY ever taken from a row that already matched this
  // tenant; a miss 404s instead of falling through to the shared-account
  // Telnyx call.
  let customerCallId = ''
  let activeCallRowId: string | null = null
  if (body.active_call_id) {
    const { data } = await supabaseAdmin
      .from('comhub_active_calls')
      .select('id, customer_call_id')
      .eq('id', body.active_call_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!data) return NextResponse.json({ error: 'Active call not found' }, { status: 404 })
    customerCallId = data.customer_call_id
    activeCallRowId = data.id
  } else if (body.customer_call_id) {
    const { data } = await supabaseAdmin
      .from('comhub_active_calls')
      .select('id, customer_call_id')
      .eq('customer_call_id', body.customer_call_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!data) return NextResponse.json({ error: 'Active call not found' }, { status: 404 })
    customerCallId = data.customer_call_id
    activeCallRowId = data.id
  }

  if (!customerCallId) {
    return NextResponse.json({ error: 'could not resolve customer_call_id' }, { status: 400 })
  }

  let result: { ok: boolean; detail?: unknown }
  const dbUpdate: Record<string, unknown> = {}

  switch (action) {
    case 'hold':
      result = await telnyxAction(cfg.apiKey, customerCallId, 'hold')
      if (result.ok) dbUpdate.hold = true
      break
    case 'unhold':
      result = await telnyxAction(cfg.apiKey, customerCallId, 'unhold')
      if (result.ok) dbUpdate.hold = false
      break
    case 'mute':
      result = await telnyxAction(cfg.apiKey, customerCallId, 'mute')
      if (result.ok) dbUpdate.muted = true
      break
    case 'unmute':
      result = await telnyxAction(cfg.apiKey, customerCallId, 'unmute')
      if (result.ok) dbUpdate.muted = false
      break
    case 'hangup': {
      const looksLikeUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerCallId)
      if (looksLikeUUID) {
        result = { ok: true, detail: 'softphone-managed; db-only finalize' }
      } else {
        result = await telnyxAction(cfg.apiKey, customerCallId, 'hangup')
        if (!result.ok) result = { ok: true, detail: 'forced db-only finalize' }
      }
      if (activeCallRowId) {
        await supabaseAdmin
          .from('comhub_active_calls')
          .update({ status: 'ended', ended_at: new Date().toISOString(), hangup_cause: 'admin_hangup' })
          .eq('id', activeCallRowId)
          .eq('tenant_id', tenantId)
      }
      break
    }
    case 'transfer_blind': {
      const target = String(body.payload?.target || '').trim()
      if (!target) return NextResponse.json({ error: 'payload.target required' }, { status: 400 })
      result = await telnyxAction(cfg.apiKey, customerCallId, 'transfer', {
        to: target, from: cfg.fromNumber, time_limit_secs: 60 * 60,
      })
      break
    }
    case 'transfer_warm': {
      const target = String(body.payload?.target || '').trim()
      if (!target) return NextResponse.json({ error: 'payload.target required' }, { status: 400 })
      if (!cfg.voiceConnectionId) {
        return NextResponse.json({ error: 'voice connection required (tenant or platform)' }, { status: 503 })
      }
      await telnyxAction(cfg.apiKey, customerCallId, 'hold')
      const consultRes = await fetch('https://api.telnyx.com/v2/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: cfg.voiceConnectionId,
          to: target,
          from: cfg.fromNumber,
          from_display_name: 'Comhub',
          custom_headers: [
            { name: 'X-Comhub-Leg', value: 'consult' },
            { name: 'X-Comhub-Customer-Call', value: customerCallId },
            { name: 'X-Comhub-Tenant', value: tenantId },
          ],
        }),
      })
      if (!consultRes.ok) {
        const detail = await consultRes.text().catch(() => '')
        return NextResponse.json({ error: 'consult dial failed', detail: detail.slice(0, 400) }, { status: 502 })
      }
      const consultData = await consultRes.json()
      result = { ok: true, detail: { consult_call_control_id: consultData?.data?.call_control_id } }
      break
    }
    case 'speak': {
      const text = String(body.payload?.text || '').trim()
      if (!text) return NextResponse.json({ error: 'payload.text required' }, { status: 400 })
      result = await telnyxAction(cfg.apiKey, customerCallId, 'speak', {
        payload: text.slice(0, 1500),
        voice: String(body.payload?.voice || 'female'),
        language: String(body.payload?.language || 'en-US'),
      })
      break
    }
    case 'dtmf': {
      const digits = String(body.payload?.digits || '').trim()
      if (!digits) return NextResponse.json({ error: 'payload.digits required' }, { status: 400 })
      result = await telnyxAction(cfg.apiKey, customerCallId, 'send_dtmf', { digits: digits.slice(0, 32) })
      break
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  if (!result.ok) {
    return NextResponse.json({ error: 'telnyx action failed', action, detail: result.detail }, { status: 502 })
  }

  if (activeCallRowId && Object.keys(dbUpdate).length > 0) {
    await supabaseAdmin
      .from('comhub_active_calls')
      .update(dbUpdate)
      .eq('id', activeCallRowId)
      .eq('tenant_id', tenantId)
  }

  return NextResponse.json({ ok: true, action, result: result.detail })
}
