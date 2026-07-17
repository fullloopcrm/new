/**
 * GET /api/cron/outreach — seasonal outreach SMS claim race.
 *
 * The per-moment `alreadyTexted` SELECT is a point-in-time snapshot, not a
 * lock. Two overlapping invocations (a slow run + a manual re-trigger, or a
 * scheduler retry) could both see a client as un-texted for the same moment
 * and both call sendSMS -- the outreach_log unique constraint on
 * (tenant_id, client_id, moment_id) only deduped the log *row* afterward,
 * not the actual SMS send. Fix: insert the log row first (claim), and only
 * send if the insert wins the unique constraint.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

process.env.CRON_SECRET = 'test-secret'

const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  // Composite UNIQUE(tenant_id, client_id, moment_id) collapses to a
  // client_id-only constraint here: every scenario below only ever targets
  // one client + one moment, so a single-column claim on client_id
  // exercises the same race the real composite index guards.
  fake._addUniqueConstraint('outreach_log', 'client_id')
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({ comms: { retention: { sms: true } } })),
}))

vi.mock('@/lib/outreach', () => ({
  getActiveMoments: vi.fn(() => [{ id: 'spring', name: 'Spring check-in', sendMonth: 3, sendDayStart: 1, sendDayEnd: 5, messages: ['hi'] }]),
  pickMessage: vi.fn(() => 'Hey there! Seasonal check-in.'),
  qualifiesForMoment: vi.fn(() => true),
}))

const smsSends: string[] = []
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async ({ to }: { to: string }) => { smsSends.push(to) }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(): Request {
  return new Request('http://x/api/cron/outreach', {
    headers: { authorization: 'Bearer test-secret' },
  })
}

beforeEach(() => {
  fake._store.clear()
  smsSends.length = 0
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Acme', status: 'active', telnyx_api_key: 'key', telnyx_phone: '+15551234567', selena_config: null } as Row,
  ])
  fake._seed('clients', [
    {
      id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jane Doe', phone: '+15559990000',
      pet_name: null, pet_type: null, do_not_service: false, sms_marketing_opt_out: false,
      sms_consent: true, status: 'active', outreach_count: 0,
    } as Row,
  ])
  fake._seed('bookings', [])
  fake._seed('recurring_schedules', [])
  fake._seed('deals', [])
  fake._seed('outreach_log', [])
})

describe('GET /api/cron/outreach — double-fire race', () => {
  it('two concurrent runs only text the client once for the same moment', async () => {
    const [a, b] = await Promise.all([GET(req()), GET(req())])
    const [aJson, bJson] = await Promise.all([a.json(), b.json()])

    expect(smsSends.length).toBe(1)
    expect(smsSends[0]).toBe('+15559990000')
    expect((aJson.sent as number) + (bJson.sent as number)).toBe(1)

    const logRows = fake._store.get('outreach_log') || []
    expect(logRows.length).toBe(1)
  })

  it('a sequential re-run does not re-text a client already claimed for the moment', async () => {
    const first = await GET(req())
    const firstJson = await first.json()
    expect(firstJson.sent).toBe(1)

    const second = await GET(req())
    const secondJson = await second.json()
    expect(secondJson.sent).toBe(0)
    expect(smsSends.length).toBe(1)
  })

  it('releases the claim on SMS send failure so a later run can retry', async () => {
    const { sendSMS } = await import('@/lib/sms')
    vi.mocked(sendSMS).mockRejectedValueOnce(new Error('telnyx down'))

    const first = await GET(req())
    const firstJson = await first.json()
    expect(firstJson.sent).toBe(0)
    expect((fake._store.get('outreach_log') || []).length).toBe(0)

    const second = await GET(req())
    const secondJson = await second.json()
    expect(secondJson.sent).toBe(1)
    expect(smsSends.length).toBe(1)
  })
})
