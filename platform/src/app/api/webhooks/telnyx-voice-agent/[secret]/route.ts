// Telnyx call-lifecycle webhook for xAI Grok voice agents — serves TWO
// distinct agents behind this one URL shape (unchanged so already-configured
// xAI assistants never need reconfiguring after a domain cutover):
//   1. FullLoop's own prospect-qualification line (global VOICE_MCP_TOKEN),
//      logged against the matching `prospects.agent_notes`.
//   2. Any tenant's customer-facing voice agent (tenants.voice_agent_mcp_secret),
//      logged to that tenant's ComHub voice thread.
// The secret in the URL determines which. Wrong/unmatched secret -> 404.
// Best-effort: always 200 so Telnyx doesn't retry-storm; failures are swallowed.

import { supabaseAdmin } from '@/lib/supabase'
import { logVoiceEventToComhub } from '@/lib/voice-agent/customer-tools'

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
    public_recording_urls?: Record<string, string> | null
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
async function appendProspectNote(phone: string, line: string): Promise<void> {
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

type ResolvedContext = { kind: 'prospect' } | { kind: 'tenant'; tenantId: string } | null

async function resolveContext(secret: string): Promise<ResolvedContext> {
  if (!secret) return null
  if (SECRET && secret === SECRET) return { kind: 'prospect' }
  const { data } = await supabaseAdmin.from('tenants').select('id').eq('voice_agent_mcp_secret', secret).limit(2)
  if (data && data.length === 1) return { kind: 'tenant', tenantId: data[0].id }
  return null
}

async function logLine(ctx: ResolvedContext, phone: string, line: string): Promise<void> {
  if (!ctx) return
  if (ctx.kind === 'prospect') {
    await appendProspectNote(phone, line)
  } else {
    await logVoiceEventToComhub(ctx.tenantId, phone, line)
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ secret: string }> },
): Promise<Response> {
  const { secret } = await ctx.params
  const resolved = await resolveContext(secret)
  if (!resolved) {
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
          await logLine(resolved, phone, `📞 Inbound call started from ${p.from || 'unknown'}`)
        }
        break
      case 'call.hangup': {
        const parts = [
          `📞 Call ended — duration ${fmtDuration(p.duration_secs || 0)}`,
          p.hangup_cause ? `(${p.hangup_cause})` : '',
        ].filter(Boolean).join(' ')
        await logLine(resolved, phone, parts)
        const recordingUrl = (p.public_recording_urls || p.recording_urls)
          ? Object.values(p.public_recording_urls || p.recording_urls || {})[0]
          : undefined
        if (recordingUrl) await logLine(resolved, phone, `🎙️ Recording: ${recordingUrl}`)
        if (p.transcription_data?.transcript) {
          await logLine(resolved, phone, `📝 Transcript: ${p.transcription_data.transcript}`)
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
