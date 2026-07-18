import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Telnyx redelivers a webhook up to 3x per URL when the endpoint doesn't
 * respond 2xx quickly (documented at-least-once delivery). call.initiated
 * had no dedup key on the Telnyx event id (data.id) -- a redelivery
 * re-inserted a SECOND comhub_active_calls row for the same call and
 * re-ran the whole answer/ring/voicemail pipeline a second time. Fix:
 * insert-first-claim on the shared telnyx_webhook_events(event_id) table
 * (same table the SMS webhook claims against), 23505 short-circuits as an
 * idempotent no-op before any side effect.
 */

const h = vi.hoisted(() => ({
  claimed: new Set<string>(),
  activeCallInserts: 0,
  messageInserts: 0,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    rpc: (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_phone') return Promise.resolve({ data: 'contact-1' })
      if (fn === 'comhub_get_or_create_thread') return Promise.resolve({ data: 'thread-1' })
      return Promise.resolve({ data: null })
    },
    from: (table: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        data: table === 'comhub_admin_presence' ? [] : null,
        error: null,
        select: () => chain,
        gte: () => chain,
        order: () => chain,
        or: () => chain,
        eq: () => chain,
        update: () => chain,
        insert: (row: Record<string, unknown>) => {
          if (table === 'telnyx_webhook_events') {
            const id = row.event_id as string
            if (h.claimed.has(id)) return Promise.resolve({ error: { code: '23505' } })
            h.claimed.add(id)
            return Promise.resolve({ error: null })
          }
          if (table === 'comhub_active_calls') h.activeCallInserts++
          if (table === 'comhub_messages') h.messageInserts++
          return chain
        },
        single: () =>
          Promise.resolve(
            table === 'comhub_messages' ? { data: { id: 'msg-1' }, error: null } : { data: null, error: null }
          ),
      }
      return chain
    },
  },
}))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn() }))
vi.mock('@/lib/postgrest-safe', () => ({ sanitizePostgrestValue: (v: string) => v }))
vi.mock('@/lib/webhook-verify', () => ({ verifyTelnyx: () => ({ valid: true }) }))

import { POST } from './route'

// TELNYX_API_KEY is read from this shell's real environment (.env.local),
// not stubbed by this test file -- route.ts resolves it at module-import
// time, before any per-test env override could take effect. Without this,
// telnyxAction()/dialRingTarget() make REAL fetch() calls to
// api.telnyx.com using live credentials (confirmed: an earlier draft of
// this test did exactly that, hitting Telnyx's real API with a fake
// call_control_id and getting a real 400 back). Stub fetch globally so no
// test in this file can ever reach the network, regardless of what's in
// the environment.
const fetchMock = vi.fn().mockResolvedValue({
  ok: false,
  json: async () => ({ errors: [{ detail: 'stubbed -- no live Telnyx call in tests' }] }),
  text: async () => 'stubbed -- no live Telnyx call in tests',
})
vi.stubGlobal('fetch', fetchMock)

function callInitiated(eventId: string | undefined, callControlId: string) {
  const body = JSON.stringify({
    data: {
      event_type: 'call.initiated',
      ...(eventId ? { id: eventId } : {}),
      payload: {
        call_control_id: callControlId,
        call_session_id: `${callControlId}-sess`,
        from: '+15551234567',
        to: '+18005551000',
        direction: 'incoming',
      },
    },
  })
  return new Request('http://x/api/webhooks/telnyx-voice', { method: 'POST', body })
}

beforeEach(() => {
  h.claimed.clear()
  h.activeCallInserts = 0
  h.messageInserts = 0
  process.env.TELNYX_VOICE_WEBHOOK_VERIFY = 'off'
  delete process.env.ADMIN_RING_LIST
  delete process.env.ADMIN_FORWARD_PHONE
})

describe('POST /api/webhooks/telnyx-voice — redelivered event dedup', () => {
  it('a redelivered call.initiated (same data.id) does not re-run the pipeline', async () => {
    const first = await POST(callInitiated('evt-voice-1', 'call-abc') as unknown as Parameters<typeof POST>[0])
    expect((await first.json()).ok).toBe(true)
    expect(h.activeCallInserts).toBe(1)
    expect(h.messageInserts).toBe(2) // initial "incoming call" log + voicemail-started log

    const redelivery = await POST(callInitiated('evt-voice-1', 'call-abc') as unknown as Parameters<typeof POST>[0])
    const redeliveryBody = await redelivery.json()

    expect(redeliveryBody.action).toBe('duplicate_delivery')
    // The real bug: without the claim, this would insert a SECOND
    // comhub_active_calls row for the same call_control_id (breaking every
    // later .single() lookup keyed on it) and log the call twice more.
    expect(h.activeCallInserts).toBe(1)
    expect(h.messageInserts).toBe(2)
  })

  it('two different calls (different data.id) both process normally', async () => {
    await POST(callInitiated('evt-voice-1', 'call-abc') as unknown as Parameters<typeof POST>[0])
    await POST(callInitiated('evt-voice-2', 'call-def') as unknown as Parameters<typeof POST>[0])

    expect(h.activeCallInserts).toBe(2)
  })

  it('an event with no data.id still processes -- dedup is best-effort, not a hard requirement', async () => {
    const res = await POST(callInitiated(undefined, 'call-abc') as unknown as Parameters<typeof POST>[0])
    expect((await res.json()).ok).toBe(true)
    expect(h.activeCallInserts).toBe(1)
  })
})
