import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * The late-check-in and late-check-out team-member SMS sent via a raw
 * sendSMS() call with no sms_consent check — unlike payment-processor.ts/
 * notify-team.ts, which gate SMS on `sms_consent !== false`. A team member
 * who'd replied STOP still got these alerts. The admin SMS is intentionally
 * NOT gated (business's own number, not consent-gated anywhere else).
 */
process.env.TZ = 'UTC'
process.env.CRON_SECRET = 'test-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({})
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    comms: { team_late_alert: { sms: true }, owner_late_alert: { sms: false } },
  })),
}))

const { sendSMS } = vi.hoisted(() => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/push', () => ({ sendPushToTenantAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/late-check-in — sms_consent gate', () => {
  beforeEach(() => {
    sendSMS.mockClear()
    fake._store.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
    fake._seed('tenants', [
      { id: 'tenant-A', name: 'Acme', status: 'active', telnyx_api_key: 'k', telnyx_phone: '+15550000000', owner_phone: null, phone: null },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not SMS a team member who opted out of late check-in alerts', async () => {
    fake._seed('bookings', [
      {
        id: 'booking-late', tenant_id: 'tenant-A', status: 'scheduled', check_in_time: null,
        start_time: '2026-01-05T18:00:00', team_member_id: 'member-1',
        clients: { name: 'Jane Doe', phone: '+15551234567' },
        team_members: { name: 'Bob', phone: '+15557654321', sms_consent: false },
      },
    ])
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS a team member with consent for late check-in', async () => {
    fake._seed('bookings', [
      {
        id: 'booking-late', tenant_id: 'tenant-A', status: 'scheduled', check_in_time: null,
        start_time: '2026-01-05T18:00:00', team_member_id: 'member-1',
        clients: { name: 'Jane Doe', phone: '+15551234567' },
        team_members: { name: 'Bob', phone: '+15557654321', sms_consent: true },
      },
    ])
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('does not SMS a team member who opted out of late check-out alerts', async () => {
    fake._seed('bookings', [
      {
        id: 'booking-checkout', tenant_id: 'tenant-A', status: 'in_progress', check_out_time: null,
        start_time: '2026-01-05T16:00:00', fifteen_min_alert_time: '2026-01-05T18:00:00.000Z', team_member_id: 'member-1',
        clients: { name: 'Jane Doe', phone: '+15551234567' },
        team_members: { name: 'Bob', phone: '+15557654321', sms_consent: false },
      },
    ])
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('SMS a team member with consent for late check-out', async () => {
    fake._seed('bookings', [
      {
        id: 'booking-checkout', tenant_id: 'tenant-A', status: 'in_progress', check_out_time: null,
        start_time: '2026-01-05T16:00:00', fifteen_min_alert_time: '2026-01-05T18:00:00.000Z', team_member_id: 'member-1',
        clients: { name: 'Jane Doe', phone: '+15551234567' },
        team_members: { name: 'Bob', phone: '+15557654321', sms_consent: true },
      },
    ])
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
