/**
 * GET /api/cron/rating-prompt — rating_prompt_sent_at used to be written in a
 * SEPARATE update AFTER sendClientSMS resolved. If the invocation was
 * interrupted between the two writes (this route has no maxDuration override
 * historically and loops every active tenant), the booking stayed eligible
 * and got a second rating-prompt SMS on the very next 5-min run -- exactly
 * the duplicate-client-SMS failure mode the CAP block in this file exists to
 * prevent (see its own "4/29 SMS-blast lesson" comment).
 *
 * Fix: claim the row (conditional `.is('rating_prompt_sent_at', null)`
 * update) BEFORE sending, so a crash/timeout after the claim just means a
 * missed prompt (safe), never a duplicate one, and two overlapping
 * invocations can't both claim the same booking.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({
    ratingQ1: () => 'How was your service today?',
  })),
}))
const sendClientSMS = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientSMS: (...args: unknown[]) => sendClientSMS(...args),
}))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({
  emailAdmins: vi.fn(async () => {}),
  smsAdmins: vi.fn(async () => {}),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/rating-prompt', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const NOW = new Date('2026-07-17T19:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  sendClientSMS.mockClear()
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Tenant A', status: 'active' }],
    bookings: [{
      id: 'b1', tenant_id: 'tenant-A', client_id: 'client-1', team_member_id: 'tm-1',
      status: 'completed', start_time: '2026-07-17T17:00:00',
      check_out_time: '2026-07-17T18:00:00.000Z', // 60 min ago -- past the 30-min gate
      rating_prompt_sent_at: null,
      clients: { name: 'Jane Doe' }, team_members: { name: 'Sam' },
    }],
  }
})

describe('GET /api/cron/rating-prompt — claim-before-send', () => {
  it('writes rating_prompt_sent_at BEFORE calling sendClientSMS, not after', async () => {
    // The bug: marking sent AFTER the send leaves a window where a
    // crash/timeout between the two writes (no maxDuration override, loops
    // every active tenant) lets the same client get texted again on the
    // next 5-min run. Assert directly on ordering: at the moment
    // sendClientSMS is invoked, the claim must already be durably written.
    let sentAtSendTime: unknown = 'not-yet-checked'
    sendClientSMS.mockImplementationOnce(async () => {
      sentAtSendTime = h.store.bookings.find((b) => b.id === 'b1')!.rating_prompt_sent_at
      return { success: true }
    })

    await GET(req() as never)

    expect(sentAtSendTime).not.toBe('not-yet-checked')
    expect(sentAtSendTime).not.toBeNull()
  })

  it('claims rating_prompt_sent_at before sending, and only sends once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendClientSMS).toHaveBeenCalledTimes(1)
    expect(h.store.bookings.find((b) => b.id === 'b1')!.rating_prompt_sent_at).not.toBeNull()
  })

  it('does not resend if rating_prompt_sent_at was already claimed by a prior/overlapping run', async () => {
    h.store.bookings[0].rating_prompt_sent_at = '2026-07-17T18:35:00.000Z'

    const res = await GET(req() as never)
    const json = await res.json()

    // The query itself filters `.is('rating_prompt_sent_at', null)`, so an
    // already-claimed row is never even selected as a candidate -- this
    // guards the query-level dedup still holds alongside the new claim.
    expect(json.sent).toBe(0)
    expect(sendClientSMS).not.toHaveBeenCalled()
  })
})
