// Telnyx call-lifecycle webhook for FullLoop's prospect-qualification voice agent
// (Telnyx SIP -> xAI Grok voice agent). Mirrors NYC Maid's
// telnyx-voice-agent webhook: when Telnyx routes an inbound call to the xAI
// agent, it also posts call events here so we get carrier-level tracking
// xAI's hosted agent doesn't expose — duration, hangup cause, and the
// recording/transcript. Logged against the matching prospect (by phone),
// same free-text `agent_notes` field the MCP tools write to.
//
// This line is platform-level prospect intake, not a specific tenant's
// customer line — no tenant resolution, same as /api/prospects.
//
// AUTH: secret in the URL path (VOICE_MCP_TOKEN), same scheme as the MCP server.
//   Set Telnyx's webhook URL to /api/webhooks/telnyx-voice-agent/<VOICE_MCP_TOKEN>
// Best-effort: always 200 so Telnyx doesn't retry-storm; failures are swallowed.

import { supabaseAdmin } from '@/lib/supabase'

const SECRET = process.env.VOICE_MCP_TOKEN || ''

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
    hangup_cause?: string
    duration_secs?: number
    recording_urls?: Record<string, string> | null
    transcription_data?: { transcript?: string } | null
    [k: string]: unknown
  }
}

function callerPhone(p: TelnyxPayload['payload']): string {
  const dir = p?.direction || 'inbound'
  return dir === 'inbound' ? String(p?.from || '') : String(p?.to || '')
}

// Best-effort append to the most recent prospect row for this phone. If no
// application has been submitted yet (call didn't get that far, or dropped
// early), there's nothing to log against — that's an accepted gap, not an error.
async function appendNote(phone: string, line: string): Promise<void> {
  if (!phone) return
  const { data: recent } = await supabaseAdmin
    .from('prospects')
    .select('id, agent_notes')
    .eq('owner_phone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!recent) return
  const merged = [recent.agent_notes, line].filter(Boolean).join('\n')
  await supabaseAdmin.from('prospects').update({ agent_notes: merged }).eq('id', recent.id)
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ secret: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  if (!SECRET || secret !== SECRET) {
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
          await appendNote(phone, `📞 Inbound call started from ${p.from || 'unknown'}`)
        }
        break
      case 'call.hangup': {
        const parts = [
          `📞 Call ended — duration ${fmtDuration(p.duration_secs || 0)}`,
          p.hangup_cause ? `(${p.hangup_cause})` : '',
        ].filter(Boolean).join(' ')
        await appendNote(phone, parts)
        const recordingUrl = p.recording_urls ? Object.values(p.recording_urls)[0] : undefined
        if (recordingUrl) await appendNote(phone, `🎙️ Recording: ${recordingUrl}`)
        if (p.transcription_data?.transcript) {
          await appendNote(phone, `📝 Transcript: ${p.transcription_data.transcript}`)
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('[telnyx-voice-agent webhook]', err)
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
