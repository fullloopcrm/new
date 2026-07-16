/**
 * GET /api/cron/post-job-followup checked `booking.notes` for a
 * `[FOLLOWUP_SENT]` marker from a stale SELECT snapshot, sent the review-
 * request SMS, THEN wrote the marker. This cron runs every 30 min — a slow
 * run (many tenants, real Telnyx calls) or a manual re-trigger overlapping
 * the next tick could see the same stale notes on two invocations and both
 * text the client before either wrote the marker. Fixed with a
 * compare-and-swap UPDATE on notes (WHERE notes = <value just read>) before
 * sending — only the run whose UPDATE actually matches (nobody else changed
 * notes first) proceeds.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.CRON_SECRET = 'test-secret'

const { TENANT_ID } = vi.hoisted(() => ({ TENANT_ID: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    tenants: [
      {
        id: TENANT_ID,
        name: 'Acme',
        status: 'active',
        telnyx_api_key: 'key',
        telnyx_phone: '+15551234567',
        domain: null,
        slug: 'acme',
      },
    ],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

const smsSends: string[] = []
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async ({ to }: { to: string }) => {
    smsSends.push(to)
  }),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({
    chatbot_enabled: true,
    review_followup_enabled: true,
    review_followup_delay_hours: 2,
    google_review_link: 'https://g.page/acme/review',
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

function seedEligibleBooking() {
  const checkedOutAt = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString() // 2.5h ago, within the 2-3h window
  fake._seed('bookings', [
    {
      id: 'booking-1',
      tenant_id: TENANT_ID,
      client_id: 'client-1',
      job_id: null,
      status: 'completed',
      notes: null,
      check_out_time: checkedOutAt,
      clients: { name: 'Jane Doe', phone: '+15559998888' },
    },
  ])
}

describe('GET /api/cron/post-job-followup — duplicate-send guard', () => {
  beforeEach(() => {
    smsSends.length = 0
  })

  it('sends once for a normal single run', async () => {
    seedEligibleBooking()
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sent).toBe(1)
    expect(smsSends).toEqual(['+15559998888'])
    expect(fake._all('bookings')[0].notes).toContain('[FOLLOWUP_SENT]')
  })

  it('does not double-send when two overlapping cron invocations race the same booking', async () => {
    seedEligibleBooking()

    const [resA, resB] = await Promise.all([GET(req()), GET(req())])
    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])

    expect(jsonA.sent + jsonB.sent).toBe(1)
    expect(smsSends).toEqual(['+15559998888'])
    expect(fake._all('bookings')[0].notes).toContain('[FOLLOWUP_SENT]')
  })

  it('does not re-send on a subsequent run once already sent', async () => {
    seedEligibleBooking()
    await GET(req())
    smsSends.length = 0

    const res = await GET(req())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(smsSends).toEqual([])
  })
})
