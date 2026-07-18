import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveTenantVoiceConfig } from '@/lib/comhub-voice-config'
import { rateLimitDb } from '@/lib/rate-limit-db'

type Action = 'hold' | 'unhold' | 'mute' | 'unmute' | 'hangup' | 'transfer_blind' | 'transfer_warm' | 'speak' | 'dtmf'
const ACTIONS: Action[] = ['hold', 'unhold', 'mute', 'unmute', 'hangup', 'transfer_blind', 'transfer_warm', 'speak', 'dtmf']

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

  let customerCallId = body.customer_call_id || ''
  let activeCallRowId: string | null = null
  if (!customerCallId && body.active_call_id) {
    const { data } = await supabaseAdmin
      .from('comhub_active_calls')
      .select('id, customer_call_id')
      .eq('id', body.active_call_id)
      .eq('tenant_id', tenantId)
      .single()
    if (data) {
      customerCallId = data.customer_call_id
      activeCallRowId = data.id
    }
  } else if (customerCallId) {
    const { data } = await supabaseAdmin
      .from('comhub_active_calls')
      .select('id')
      .eq('customer_call_id', customerCallId)
      .eq('tenant_id', tenantId)
      .single()
    activeCallRowId = data?.id ?? null
    if (!activeCallRowId) {
      return NextResponse.json({ error: 'call not found for this tenant' }, { status: 404 })
    }
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
        // Browser-SDK-managed leg: the softphone's own WebRTC hangup already
        // ends the call client-side (log-softphone-call/route.ts mirrors that
        // lifecycle). No Telnyx Call Control leg exists to hang up server-side.
        result = { ok: true, detail: 'softphone-managed; db-only finalize' }
      } else {
        // A real Telnyx Call Control leg. Unlike every other action in this
        // switch, this used to force `result.ok = true` on ANY Telnyx failure
        // and finalize the DB row regardless -- so a transient Telnyx error
        // (auth blip, rate limit, network failure) got silently reported to
        // the admin as "call ended" while the live, per-minute-billing PSTN
        // leg kept running with no further way to reach it (comhub_active_calls
        // now shows 'ended', and the only sweep for stale rows,
        // POST /api/admin/comhub/voice/cleanup, is unwired dead code and
        // doesn't call Telnyx either -- see deploy-prep gap notes). Let a
        // genuine failure fall through to the same honest 502 path every
        // other action already uses below, instead of lying about success.
        result = await telnyxAction(cfg.apiKey, customerCallId, 'hangup')
      }
      if (result.ok && activeCallRowId) {
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
      // Same arbitrary-target, real-call-cost shape as voice/dial's
      // admin_phone (transfers the live call to WHATEVER number is
      // supplied) -- shares that route's per-tenant throttle so switching
      // to transfer can't be used to route around the dial limit.
      const transferRl = await rateLimitDb(`comhub-voice-dial:${tenantId}`, 20, 10 * 60 * 1000)
      if (!transferRl.allowed) {
        return NextResponse.json({ error: 'Too many calls placed. Try again shortly.' }, { status: 429 })
      }
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
      const transferRl = await rateLimitDb(`comhub-voice-dial:${tenantId}`, 20, 10 * 60 * 1000)
      if (!transferRl.allowed) {
        return NextResponse.json({ error: 'Too many calls placed. Try again shortly.' }, { status: 429 })
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
