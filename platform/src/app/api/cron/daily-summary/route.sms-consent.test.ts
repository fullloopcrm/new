import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * The team-member 3-day-lookahead SMS sent via a raw sendSMS() call with no
 * sms_consent check — unlike cron/outreach and cron/retention, which gate SMS
 * on `sms_consent !== false`/`=== true`. A team member who'd replied STOP
 * still got this daily lookahead text.
 */
process.env.TZ = 'UTC'
process.env.CRON_SECRET = 'test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
const { sendSMS } = vi.hoisted(() => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/daily-summary — sms_consent gate on team-member lookahead SMS', () => {
  beforeEach(() => {
    sendSMS.mockClear()
    fake._store.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T13:00:00.000Z')) // 8am EST Jan 6
    fake._seed('tenants', [
      { id: 'tenant-A', name: 'Test Co', status: 'active', telnyx_api_key: 'k', telnyx_phone: '+15550000000', resend_api_key: null },
    ])
    fake._seed('bookings', [
      { id: 'booking-1', tenant_id: 'tenant-A', status: 'scheduled', team_member_id: 'member-1', start_time: '2026-01-07T08:00:00', clients: { name: 'Client', phone: '+15551110000', address: '1 St' } },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not SMS a team member who opted out (sms_consent: false)', async () => {
    fake._seed('team_members', [
      { id: 'member-1', tenant_id: 'tenant-A', name: 'Member', phone: '+15552220000', email: null, status: 'active', sms_consent: false },
    ])
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS a team member with consent', async () => {
    fake._seed('team_members', [
      { id: 'member-1', tenant_id: 'tenant-A', name: 'Member', phone: '+15552220000', email: null, status: 'active', sms_consent: true },
    ])
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
