// Telnyx call-lifecycle webhook for the Yinez/Selena voice agent, tenant-
// scoped port of nycmaid's src/app/api/webhook/telnyx-voice-agent/[secret]/
// route.ts (commit fb5d382f).
//
// When Telnyx routes an inbound call to the xAI agent (see the SIP-transfer
// branch added to src/app/api/webhooks/telnyx-voice/route.ts), it also
// posts call events here so we get carrier-level tracking that xAI's
// hosted agent doesn't expose: every call (even no-tool calls), duration,
// and the recording/transcript. Logged to the caller's ComHub voice thread
// — same thread the MCP tool events land in — so the team sees the full
// call history in one place.
//
// AUTH + TENANT RESOLUTION: nycmaid gated by a single secret-in-URL since
// it only served one tenant. Here the payload's `to` number resolves which
// tenant owns the call (same helper as the main voice webhook), and the
// secret must ALSO match that specific tenant's voice_mcp_token — so a
// leaked/reused secret from one tenant's Telnyx config can't be replayed
// against another tenant's call data.
//   Set each tenant's Telnyx webhook URL to
//   /api/webhook/telnyx-voice-agent/<that tenant's voice_mcp_token>
// Best-effort: always 200 so Telnyx doesn't retry-storm; failures are
// swallowed.
import { resolveTenantByToNumber } from '@/lib/voice/tenant-by-phone'
import { resolveTenantByVoiceMcpToken } from '@/lib/voice/xai-voice-config'
import { logComhubVoiceMessage } from '@/lib/voice/comhub-log'

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

// The caller's number is `from` on inbound. That's the key for the ComHub thread.
function callerPhone(p: TelnyxPayload['payload']): string {
  const dir = p?.direction || 'inbound'
  return dir === 'inbound' ? String(p?.from || '') : String(p?.to || '')
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ secret: string }> },
): Promise<Response> {
  const { secret } = await ctx.params

  let body: TelnyxPayload = {}
  try {
    const raw = (await req.json()) as { data?: TelnyxPayload } & TelnyxPayload
    // Telnyx wraps events as { data: { event_type, payload } }.
    body = (raw.data as TelnyxPayload) || (raw as TelnyxPayload)
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const event = body.event_type || ''
  const p = body.payload || {}
  const phone = callerPhone(p)

  try {
    const [byToNumber, bySecret] = await Promise.all([
      p.to ? resolveTenantByToNumber(p.to) : null,
      resolveTenantByVoiceMcpToken(secret),
    ])
    if (!byToNumber || !bySecret || byToNumber.id !== bySecret.id) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }
    const tenantId = byToNumber.id

    switch (event) {
      case 'call.initiated':
        if (p.direction === 'inbound') {
          await logComhubVoiceMessage(tenantId, phone, `📞 Incoming call from ${p.from || 'unknown'}`, {
            direction: 'in',
            author: 'system',
          })
        }
        break
      case 'call.hangup': {
        const secs = typeof p.duration_secs === 'number'
          ? p.duration_secs
          : p.start_time && p.end_time
            ? Math.max(0, Math.round((Date.parse(p.end_time) - Date.parse(p.start_time)) / 1000))
            : 0
        await logComhubVoiceMessage(tenantId, phone, `📞 Call ended (${fmtDuration(secs)})`, {
          direction: 'system',
          author: 'system',
        })
        break
      }
      case 'call.recording.saved': {
        const urls = p.public_recording_urls || p.recording_urls || {}
        const link = urls.mp3 || urls.wav || Object.values(urls)[0] || ''
        await logComhubVoiceMessage(
          tenantId,
          phone,
          link ? `🎙️ Call recording: ${link}` : '🎙️ Call recording saved',
          { direction: 'system', author: 'system' },
        )
        break
      }
      case 'call.transcription': {
        const text = p.transcription_data?.transcript || ''
        if (text) {
          await logComhubVoiceMessage(tenantId, phone, `📝 Transcript: ${text.slice(0, 1500)}`, {
            direction: 'system',
            author: 'system',
          })
        }
        break
      }
      default:
        // Ignore other event types (call.answered, etc.) for now.
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
