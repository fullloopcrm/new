/**
 * GET /api/cron/phone-fixup — the old dedup scanned `notifications` for
 * type='phone_fix_email' rows within the last 7 days and regex-parsed
 * `cleaner_id=...` out of the message text to build a skip-set, but that
 * notification row is only inserted AFTER sendEmail() resolves. Check and
 * write never raced against each other correctly: two overlapping
 * invocations (a retried cron delivery, a manual re-trigger while a prior
 * run is still mid-flight emailing up to CAP=10 cleaners per tenant) could
 * both read zero matching notifications rows for the same cleaner before
 * either write landed, and both email that cleaner the phone-confirmation
 * link. Same bug class as confirmation-reminder/payment-followup-daily's
 * claim-before-send fix.
 *
 * Fix: a compare-and-swap update on team_members.phone_fix_email_sent_at
 * (conditioned on it being older than the 7-day window) BEFORE sending, so
 * the losing side of an overlap affects 0 rows and skips instead of sending
 * a duplicate. Claim is released back to the epoch on any send failure, so
 * a transient error still retries the next day (matching the old
 * notifications-based dedup, which only ever recorded a SUCCESSFUL send).
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
const sendEmail = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}))

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/phone-fixup', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

const NOW = new Date('2026-07-17T18:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.ADMIN_PASSWORD = 'test-admin-password'
  sendEmail.mockClear()
  h.seq = 0
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Tenant A', status: 'active', domain: 'tenant-a.example', website_url: null }],
    team_members: [{
      id: 'cleaner-1', tenant_id: 'tenant-A', name: 'Jane Cleaner', email: 'jane@example.com',
      phone: '123', status: 'active', phone_fix_email_sent_at: '1970-01-01T00:00:00+00',
    }],
    notifications: [],
  }
})

describe('GET /api/cron/phone-fixup — claim-before-send', () => {
  it('writes phone_fix_email_sent_at BEFORE calling sendEmail, not after', async () => {
    let claimedAtSendTime: unknown = 'not-yet-checked'
    sendEmail.mockImplementationOnce(async () => {
      claimedAtSendTime = h.store.team_members.find((c) => c.id === 'cleaner-1')!.phone_fix_email_sent_at
      return { success: true }
    })

    await GET(req() as never)

    expect(claimedAtSendTime).not.toBe('not-yet-checked')
    expect(claimedAtSendTime).not.toBe('1970-01-01T00:00:00+00')
  })

  it('claims phone_fix_email_sent_at before sending, and only sends once', async () => {
    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(h.store.team_members.find((c) => c.id === 'cleaner-1')!.phone_fix_email_sent_at).not.toBe('1970-01-01T00:00:00+00')
  })

  it('two overlapping invocations racing the same cleaner only send once', async () => {
    // Real-world precondition: both invocations' SELECTs read the same
    // cleaner with phone_fix_email_sent_at outside the 7-day window before
    // either's CAS claim lands (this cron loops every active tenant with no
    // run-lock). The losing invocation's claim must affect 0 rows since the
    // row no longer matches the `.lt(sevenDaysAgo)` condition it read.
    const [first, second] = await Promise.all([GET(req() as never), GET(req() as never)])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const firstJson = await first.json()
    const secondJson = await second.json()

    expect(firstJson.sent + secondJson.sent).toBe(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('does not re-email a cleaner already claimed within the last 7 days', async () => {
    h.store.team_members[0].phone_fix_email_sent_at = '2026-07-16T18:00:00.000Z' // 1 day ago

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('does re-email a cleaner whose claim has aged out of the 7-day window', async () => {
    h.store.team_members[0].phone_fix_email_sent_at = '2026-07-01T18:00:00.000Z' // >7 days ago

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it('releases the claim back to the epoch when sendEmail reports failure, so it retries the next day', async () => {
    sendEmail.mockResolvedValueOnce({ success: false })

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(json.errors).toEqual(['jane@example.com: send failed'])
    expect(h.store.team_members.find((c) => c.id === 'cleaner-1')!.phone_fix_email_sent_at).toBe('1970-01-01T00:00:00+00')
  })

  it('releases the claim back to the epoch when sendEmail throws, so it retries the next day', async () => {
    sendEmail.mockRejectedValueOnce(new Error('smtp down'))

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(json.errors).toEqual(['jane@example.com: smtp down'])
    expect(h.store.team_members.find((c) => c.id === 'cleaner-1')!.phone_fix_email_sent_at).toBe('1970-01-01T00:00:00+00')
  })

  it('does not consider a cleaner with a valid phone', async () => {
    h.store.team_members[0].phone = '2125551234' // valid NANP number

    const res = await GET(req() as never)
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(json.eligible).toBe(0)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
