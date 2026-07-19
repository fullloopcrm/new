/**
 * LoopCam job media notes: video walkthrough → Deepgram transcript → Claude
 * structured AI overview, stored as a note (booking_notes, note_type='video').
 * Ported from the loopcam-standalone prototype (~/loopcam-standalone), wired
 * to this platform's real per-tenant Anthropic resolution and usage logging
 * instead of the prototype's local key/cost-estimate shortcuts.
 *
 * Replaces bookings.walkthrough_video_url/final_video_url and the unmerged
 * feat/job-photos-loopcam branch's job_photos table per Jeff's 2026-07-19
 * decision — do not resurrect either as a second write path.
 */
import Anthropic from '@anthropic-ai/sdk'
import { resolveAnthropic } from './anthropic-client'
import { resolveDeepgramKey } from './deepgram-client'
import { logAnthropicUsage } from './ai-usage'
import { tenantDb } from './tenant-db'
import { logJobEvent } from './jobs'

const MODEL = 'claude-sonnet-4-6'

// Deepgram nova-3 pay-as-you-go rate — ESTIMATE for internal visibility only.
// This platform has no existing Deepgram usage-logging convention to mirror
// (first Deepgram integration here); verify against the live pricing page
// before this becomes a budgeted line item.
export const DEEPGRAM_RATE_PER_MIN_USD = 0.0043

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  speaker: number | null
}

export interface TranscriptClipOverview {
  start_seconds: number
  end_seconds: number
  title: string
  bullets: string[]
}

export interface AiOverview {
  highlights: string[]
  summary: string
  location_overview: string
  areas_observed: { name: string; condition: string; notes: string }[]
  issues_flagged: { issue: string; severity: 'low' | 'medium' | 'high'; timestamp: string }[]
  work_performed: { task: string; notes: string }[]
  recommendations: string[]
  customer_message: string
  internal_notes: string
  transcript_clips: TranscriptClipOverview[]
}

// Job-site uploads chain a Supabase write immediately before this call —
// back-to-back fetches to different hosts intermittently surface as a
// Deepgram "could not resolve authentication method" error even with a
// verified-good key (reproduced with debug logging showing the correct key
// reaching the client, then failing; a fresh attempt moments later succeeds).
// A short retry papers over it without masking a real bad-key case, since a
// genuinely invalid key fails identically on every attempt.
async function retryDeepgram<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastErr
}

interface DeepgramRestResponse {
  metadata: { duration: number }
  results: {
    channels: { alternatives: { transcript: string }[] }[]
    utterances?: { start: number; end: number; transcript: string; speaker: number | null }[]
  }
}

export async function transcribeVideo(
  tenantId: string,
  videoUrl: string
): Promise<{ transcript: TranscriptSegment[]; fullText: string; durationSeconds: number; costUsd: number }> {
  // Direct REST call, not the SDK's client.listen.v1.media.transcribeUrl() —
  // that method's internal auth resolution intermittently threw "could not
  // resolve authentication method" with a verified-correct key when called
  // right after a Supabase fetch in the same process (reproduced repeatedly;
  // root cause not isolated — a plain fetch with an explicit header sidesteps
  // whatever internal state the SDK's auth layer was tripping on).
  const apiKey = (await resolveDeepgramKey(tenantId)) || process.env.DEEPGRAM_API_KEY
  if (!apiKey) throw new Error('No Deepgram API key available (tenant or platform)')

  const params = new URLSearchParams({
    model: 'nova-3',
    // 'multi' enables nova-3's multilingual code-switching (English/Spanish and
    // others) instead of assuming English — several tenants run bilingual crews.
    language: 'multi',
    smart_format: 'true',
    punctuate: 'true',
    diarize: 'true',
    utterances: 'true',
  })

  const response = await retryDeepgram(async () => {
    const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: videoUrl }),
    })
    if (!res.ok) throw new Error(`Deepgram request failed: ${res.status} ${await res.text()}`)
    return (await res.json()) as DeepgramRestResponse
  })

  if (!('results' in response)) {
    throw new Error('Deepgram returned an async/callback response, expected a direct result')
  }

  const utterances = response.results.utterances ?? []
  const transcript: TranscriptSegment[] = utterances.map((u) => ({
    start: u.start ?? 0,
    end: u.end ?? 0,
    text: u.transcript ?? '',
    speaker: u.speaker ?? null,
  }))

  const fullText = response.results.channels[0]?.alternatives?.[0]?.transcript ?? ''
  const durationSeconds = response.metadata.duration
  const costUsd = (durationSeconds / 60) * DEEPGRAM_RATE_PER_MIN_USD

  return { transcript, fullText, durationSeconds, costUsd }
}

// Native Structured Outputs (output_config.format), not a forced tool_choice.
// tool_choice forcing on this schema produced malformed output in prototype
// testing — the model leaked pseudo-XML `<parameter name="...">` tags into
// the summary string instead of keeping fields cleanly separated.
// output_config constrains generation to the schema directly, avoiding that
// failure mode. Confirmed supported by this repo's pinned SDK (0.78.0).
const OVERVIEW_SCHEMA = {
  type: 'object',
  properties: {
    highlights: {
      type: 'array',
      description:
        'Top 3-6 highlights of this walkthrough as short punchy bullet phrases, not full sentences. This leads the overview, before the full summary paragraph.',
      items: { type: 'string' },
    },
    summary: { type: 'string', description: 'Full paragraph overview of the walkthrough.' },
    location_overview: { type: 'string', description: 'General description of the property.' },
    areas_observed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          condition: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['name', 'condition', 'notes'],
        additionalProperties: false,
      },
    },
    issues_flagged: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          timestamp: { type: 'string', description: 'mm:ss into the video' },
        },
        required: ['issue', 'severity', 'timestamp'],
        additionalProperties: false,
      },
    },
    work_performed: {
      type: 'array',
      items: {
        type: 'object',
        properties: { task: { type: 'string' }, notes: { type: 'string' } },
        required: ['task', 'notes'],
        additionalProperties: false,
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    customer_message: {
      type: 'string',
      description: 'A friendly summary suitable to send directly to the customer.',
    },
    internal_notes: { type: 'string', description: 'Crew-only observations, never shown to the customer.' },
    transcript_clips: {
      type: 'array',
      description:
        'Segment the full walkthrough into short logical clips based on topic or scene shifts (not silence gaps). Each clip gets a punchy 3-7 word title and 2-5 short bullet highlights — phrases, not full sentences — summarizing what was said or shown in that clip.',
      items: {
        type: 'object',
        properties: {
          start_seconds: { type: 'number', description: 'Clip start time in seconds into the video.' },
          end_seconds: { type: 'number', description: 'Clip end time in seconds into the video.' },
          title: { type: 'string', description: '3-7 word title for this clip.' },
          bullets: { type: 'array', items: { type: 'string' }, description: 'Short bullet-point highlights of this clip.' },
        },
        required: ['start_seconds', 'end_seconds', 'title', 'bullets'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'highlights',
    'summary',
    'location_overview',
    'areas_observed',
    'issues_flagged',
    'work_performed',
    'recommendations',
    'customer_message',
    'internal_notes',
    'transcript_clips',
  ],
  additionalProperties: false,
}

export async function generateOverview(
  tenantId: string,
  transcript: TranscriptSegment[],
  fullText: string,
  sessionType: string
): Promise<{ overview: AiOverview; summaryText: string }> {
  const anthropic = await resolveAnthropic(tenantId)

  const prompt = `A field crew member recorded a "${sessionType}" video walkthrough of a job site while narrating what they saw. Below is the transcript with timestamps.

Transcript (full text):
${fullText}

Timestamped transcript segments:
${JSON.stringify(transcript, null, 2)}

Produce a structured overview of this walkthrough based on the transcript. Be concrete and specific — do not pad with generic filler. Also segment the transcript into transcript_clips per the schema — the raw transcript is choppy, near-word-by-word speech-to-text output, so group it into a handful of coherent clips by topic, each with a short title and bullet highlights, not a 1:1 mapping of transcript segments to clips.`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    output_config: { format: { type: 'json_schema', schema: OVERVIEW_SCHEMA } },
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
  if (!textBlock) throw new Error('Anthropic did not return a text block')

  void logAnthropicUsage({ tenantId, model: MODEL, channel: 'job-media-note', usage: message.usage })

  const overview = JSON.parse(textBlock.text) as AiOverview
  return { overview, summaryText: overview.summary }
}

interface MediaNoteRow {
  id: string
  booking_id: string | null
  job_id: string | null
  video_url: string | null
  video_session_type: string | null
  processing_attempts: number
}

export class MediaNoteError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

/**
 * Runs the full transcribe → summarize → complete pipeline for one video note
 * and persists each step. Shared by both call sites that can trigger it: the
 * team-portal process route (crew, right after upload) and the admin retry
 * route (office dashboard, for a note stuck in 'failed'). Idempotent — safe
 * to call again on a note in any status as long as video_url is set.
 */
export async function processMediaNote(tenantId: string, noteId: string): Promise<void> {
  const db = tenantDb(tenantId)
  const { data: note } = (await db
    .from('booking_notes')
    .select('id, booking_id, job_id, video_url, video_session_type, processing_attempts')
    .eq('id', noteId)
    .eq('note_type', 'video')
    .single()) as { data: MediaNoteRow | null }

  if (!note) throw new MediaNoteError('Media note not found', 404)
  if (!note.video_url) throw new MediaNoteError('Note has no uploaded video yet', 400)

  try {
    await db.from('booking_notes').update({ processing_status: 'transcribing', processing_failure_reason: null }).eq('id', noteId)

    const { transcript, fullText } = await transcribeVideo(tenantId, note.video_url)
    await db.from('booking_notes').update({ transcript_json: transcript, processing_status: 'summarizing' }).eq('id', noteId)

    const { overview, summaryText } = await generateOverview(
      tenantId,
      transcript,
      fullText,
      note.video_session_type || 'walkthrough'
    )

    await db
      .from('booking_notes')
      .update({ ai_overview_json: overview, content: summaryText, processing_status: 'complete' })
      .eq('id', noteId)

    // A booking-only note (no project job_id) has nothing to log against —
    // job_events is job-scoped, not booking-scoped.
    if (note.job_id) {
      await logJobEvent({
        tenant_id: tenantId,
        job_id: note.job_id,
        event_type: 'media_note_processed',
        detail: { note_id: noteId, booking_id: note.booking_id },
      })
    }
  } catch (err) {
    const failureReason = err instanceof Error ? err.message : 'Unknown processing error'
    await db
      .from('booking_notes')
      .update({
        processing_status: 'failed',
        processing_failure_reason: failureReason,
        processing_attempts: note.processing_attempts + 1,
      })
      .eq('id', noteId)
    throw new MediaNoteError(failureReason, 500)
  }
}
