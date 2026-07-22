// Telnyx call-lifecycle webhook for a tenant's CUSTOMER-facing xAI Grok voice
// agent (Yinez on the phone). Mirrors src/app/api/webhooks/telnyx-voice-agent/
// [secret]/route.ts (FullLoop's own prospect line): when Telnyx routes an
// inbound call to the xAI agent, it also posts call events here so we get
// carrier-level tracking xAI's hosted agent doesn't expose — duration,
// hangup cause, recording, transcript. Logged to the caller's ComHub voice
// thread, same place the MCP tool events land, so the team sees the full
// call history in one place.
//
// Global route — tenant resolved by matching the URL secret against
// tenants.voice_agent_mcp_secret (same secret the MCP route uses).
//
// AUTH: secret in the URL path. Set Telnyx's webhook URL to
//   /api/webhooks/telnyx-customer-voice-agent/<tenant's voice_agent_mcp_secret>
// Best-effort: always 200 so Telnyx doesn't retry-storm; failures are swallowed.

import { supabaseAdmin } from '@/lib/supabase'
import { logVoiceEventToComhub } from '@/lib/voice-agent/customer-tools'

function fmtDuration(secs: number): string {
  if (!secs || secs < 0) return '?'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

type TelnyxPayload = {
  event_type?: string
  payload?: {
    from?: string
    to?: string
    direction?: string
    call_control_id?: string
    start_time?: string
    end_time?: string
    hangup_cause?: string
    duration_secs?: number
    recording_urls?: Record<string, string> | null
    public_recording_urls?: Record<string, string> | null
    transcription_data?: { transcript?: string } | null
    [k: string]: unknown
  }
}

function callerPhone(p: TelnyxPayload['payload']): string {
  const dir = p?.direction || 'inbound'
  return dir === 'inbound' ? String(p?.from || '') : String(p?.to || '')
}

async function resolveTenantBySecret(secret: string): Promise<string | null> {
  if (!secret) return null
  const { data } = await supabaseAdmin.from('tenants').select('id').eq('voice_agent_mcp_secret', secret).limit(2)
  if (!data || data.length !== 1) return null
  return data[0].id
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ secret: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  const tenantId = await resolveTenantBySecret(secret)
  if (!tenantId) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }

  let body: TelnyxPayload = {}
  try {
    const raw = (await req.json()) as { data?: TelnyxPayload } & TelnyxPayload
    body = (raw.data as TelnyxPayload) || (raw as TelnyxPayload)
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const event = body.event_type || ''
  const p = body.payload || {}
  const phone = callerPhone(p)

  try {
    switch (event) {
      case 'call.initiated':
        if (p.direction === 'inbound') {
          await logVoiceEventToComhub(tenantId, phone, `📞 Incoming call from ${p.from || 'unknown'}`)
        }
        break
      case 'call.hangup': {
        const secs = typeof p.duration_secs === 'number'
          ? p.duration_secs
          : p.start_time && p.end_time
            ? Math.max(0, Math.round((Date.parse(p.end_time) - Date.parse(p.start_time)) / 1000))
            : 0
        await logVoiceEventToComhub(tenantId, phone, `📞 Call ended (${fmtDuration(secs)})`)
        break
      }
      case 'call.recording.saved': {
        const urls = p.public_recording_urls || p.recording_urls || {}
        const link = urls.mp3 || urls.wav || Object.values(urls)[0] || ''
        await logVoiceEventToComhub(tenantId, phone, link ? `🎙️ Call recording: ${link}` : '🎙️ Call recording saved')
        break
      }
      case 'call.transcription': {
        const text = p.transcription_data?.transcript || ''
        if (text) await logVoiceEventToComhub(tenantId, phone, `📝 Transcript: ${text.slice(0, 1500)}`)
        break
      }
      default:
        break
    }
  } catch {
    // swallow — never fail a Telnyx webhook
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
