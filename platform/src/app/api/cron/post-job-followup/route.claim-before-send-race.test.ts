/**
 * GET /api/cron/post-job-followup — two independent claim-before-send races.
 *
 * 1. Standalone bookings: notes ('[FOLLOWUP_SENT] <iso>' substring) was the
 *    ONLY dedup source, checked client-side against a row already read this
 *    invocation, and written AFTER sendSMS(). Two overlapping invocations
 *    could both read the same not-yet-marked booking and double-text the
 *    client. Fix: a dedicated review_followup_sent_at column, claimed via
 *    compare-and-swap (WHERE review_followup_sent_at IS NULL) BEFORE
 *    sending. Same bug class as rating-prompt/comhub-email/payment-reminder/
 *    outreach's claim-before-send fixes this session.
 *
 * 2. Multi-session jobs: deduped via a pre-send `count()` on job_events with
 *    no constraint backing it, then inserted the claim row AFTER sendSMS().
 *    Fix: insert job_events FIRST — a partial unique index on (job_id)
 *    WHERE event_type='review_requested' is the atomic claim — and only
 *    send if that insert succeeds. Same shape as outreach's
 *    insert-then-send fix.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args) }))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    chatbot_enabled: true,
    review_followup_enabled: true,
    review_followup_delay_hours: 2,
    google_review_link: 'https://g.page/r/test/review',
  }),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/post-job-followup', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const realTZ = process.env.TZ

// 2.5 hours ago — inside the "2 hours after checkout/completion" delay window.
const NOW = new Date('2026-07-17T18:00:00.000Z')
const CHECKOUT = '2026-07-17T15:30:00.000Z'

beforeEach(() => {
  process.env.TZ = 'UTC'
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  sendSMS.mockClear()
})

afterEach(() => {
  if (realTZ === undefined) delete process.env.TZ
  else process.env.TZ = realTZ
  vi.useRealTimers()
})

describe('concurrent post-job-followup invocations racing the same booking', () => {
  beforeEach(() => {
    h.fake = createFakeSupabase({
      tenants: [{
        id: 'tenant-A', name: 'Tenant A', status: 'active',
        telnyx_api_key: 'key', telnyx_phone: '+15551234567',
        domain: null, slug: 'tenant-a',
      }],
      bookings: [{
        id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', status: 'completed',
        job_id: null, notes: null, check_out_time: CHECKOUT, review_followup_sent_at: null,
        clients: { name: 'Jane Doe', phone: '+15559998888', sms_consent: true },
      }],
      jobs: [],
      job_events: [],
    })
  })

  it('texts the client exactly once', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(firstJson.sent + secondJson.sent).toBe(1)
    expect(h.fake!._all('bookings')[0].review_followup_sent_at).not.toBeNull()
  })

  it('claims review_followup_sent_at BEFORE calling sendSMS, not after', async () => {
    let claimedAtSendTime: unknown = 'not-yet-checked'
    sendSMS.mockImplementationOnce(async () => {
      claimedAtSendTime = h.fake!._all('bookings')[0].review_followup_sent_at
      return { success: true }
    })

    await GET(req())

    expect(claimedAtSendTime).not.toBe('not-yet-checked')
    expect(claimedAtSendTime).not.toBeNull()
  })

  it('a later notes edit does not resurrect the dedup marker (column is the sole source of truth)', async () => {
    await GET(req())
    expect(sendSMS).toHaveBeenCalledTimes(1)

    // Simulate PATCH /api/bookings/:id overwriting notes entirely, same as
    // the bug this fix closes -- the old scheme would have erased the
    // [FOLLOWUP_SENT] marker here and re-sent on the next cron pass.
    const booking = h.fake!._all('bookings')[0]
    booking.notes = 'unrelated staff note, no marker'

    // A second pass now sees this booking already outside the 2-3hr window
    // in real usage, but even if it were still in-window, the query filters
    // on review_followup_sent_at (untouched by the notes edit), not notes.
    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})

describe('concurrent post-job-followup invocations racing the same completed job', () => {
  beforeEach(() => {
    h.fake = createFakeSupabase({
      tenants: [{
        id: 'tenant-A', name: 'Tenant A', status: 'active',
        telnyx_api_key: 'key', telnyx_phone: '+15551234567',
        domain: null, slug: 'tenant-a',
      }],
      bookings: [],
      jobs: [{
        id: 'j1', tenant_id: 'tenant-A', client_id: 'client-2', status: 'completed',
        completed_at: CHECKOUT,
        clients: { name: 'John Roe', phone: '+15551112222', sms_consent: true },
      }],
      job_events: [],
    })
    h.fake._addUniqueConstraint('job_events', 'job_id')
  })

  it('texts the client exactly once', async () => {
    const [first, second] = await Promise.all([GET(req()), GET(req())])
    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(firstJson.sent + secondJson.sent).toBe(1)
    expect(h.fake!._all('job_events').filter((e) => e.job_id === 'j1' && e.event_type === 'review_requested')).toHaveLength(1)
  })

  it('inserts the job_events claim row BEFORE calling sendSMS, not after', async () => {
    let eventCountAtSendTime = -1
    sendSMS.mockImplementationOnce(async () => {
      eventCountAtSendTime = h.fake!._all('job_events').filter((e) => e.job_id === 'j1').length
      return { success: true }
    })

    await GET(req())

    expect(eventCountAtSendTime).toBe(1)
  })
})
