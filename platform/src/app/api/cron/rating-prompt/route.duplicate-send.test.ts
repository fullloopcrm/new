/**
 * GET /api/cron/rating-prompt sent the "how was your service" SMS, THEN
 * marked `rating_prompt_sent_at` on the booking. The initial SELECT filters
 * on `rating_prompt_sent_at IS NULL`, but nothing stopped two overlapping
 * invocations (a slow run bumping into the next 5-min schedule tick, or a
 * manual re-trigger) from both reading the same booking as eligible and both
 * sending the SMS before either one wrote the timestamp. Fixed by claiming
 * the booking with a conditional UPDATE ... WHERE rating_prompt_sent_at IS
 * NULL before sending — only the run whose UPDATE actually matches a row
 * sends.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.CRON_SECRET = 'test-secret'

const { TENANT_ID } = vi.hoisted(() => ({ TENANT_ID: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    tenants: [{ id: TENANT_ID, name: 'Acme', status: 'active' }],
  })
  return { supabaseAdmin: fake, __fake: fake }
})

const smsSends: string[] = []
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: vi.fn(async (clientId: string) => {
    smsSends.push(clientId)
    return { success: true }
  }),
}))

vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({
    ratingQ1: () => 'How was your service today?',
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

function seedEligibleBooking() {
  const checkedOutAt = new Date(Date.now() - 40 * 60 * 1000).toISOString()
  fake._seed('bookings', [
    {
      id: 'booking-1',
      tenant_id: TENANT_ID,
      client_id: 'client-1',
      cleaner_id: 'cleaner-1',
      start_time: '2026-08-01T09:00:00Z',
      status: 'completed',
      check_out_time: checkedOutAt,
      rating_prompt_sent_at: null,
    },
  ])
}

describe('GET /api/cron/rating-prompt — duplicate-send guard', () => {
  beforeEach(() => {
    smsSends.length = 0
  })

  it('sends once for a normal single run', async () => {
    seedEligibleBooking()
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sent).toBe(1)
    expect(smsSends).toEqual(['client-1'])
    expect(fake._all('bookings')[0].rating_prompt_sent_at).not.toBeNull()
  })

  it('does not double-send when two overlapping cron invocations race the same booking', async () => {
    seedEligibleBooking()

    // Simulate two overlapping invocations both reading the booking as
    // eligible before either claims it, by running them concurrently against
    // the same in-memory store.
    const [resA, resB] = await Promise.all([GET(req()), GET(req())])
    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])

    expect(jsonA.sent + jsonB.sent).toBe(1)
    expect(smsSends).toEqual(['client-1'])
    expect(fake._all('bookings')[0].rating_prompt_sent_at).not.toBeNull()
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
