import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/cron/reminders — client SMS/email reminders never checked
 * sms_consent or do_not_service (P1/W2 fresh-ground, 10th call site of this
 * session's missing-consent-check bug class — missed by the prior round's
 * "swept every remaining sendSMS/sendEmail call site" claim because this
 * cron routes client sends through both a direct sendSMS() AND notify(),
 * and both legs skipped the check).
 *
 * BUG (fixed here): the day-based email reminder, the day-based SMS
 * reminder, the hour-based SMS reminder, and the 3-day thank-you email all
 * fired on phone/email presence (plus a tenant-level toggle) alone. A
 * do_not_service (banned) or sms_consent=false (STOP-revoked) client still
 * got real booking-reminder texts/emails on this hourly cron.
 *
 * FIX: every client email send now also gates on `!do_not_service`; every
 * client SMS send now also gates on `sms_consent !== false && !do_not_service`.
 */

const TENANT_ID = 'tid-cron-reminders-consent'

let bookingsRows: Record<string, unknown>[] = []

const notifyMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (opts: Record<string, unknown>) => notifyMock(opts) }))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

vi.mock('@/lib/comms-prefs', () => ({
  getCommPrefs: vi.fn(async () => ({
    timing: { reminder_days: [1], reminder_hours_before: [2] },
    comms: { booking_reminder: { sms: true } },
  })),
}))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ reminder: () => 'client reminder text' })),
}))
vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: vi.fn(async () => []) }))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined

    const dateCmp = (col: string, val: unknown, cmp: (a: number, b: number) => boolean): Filter =>
      (r) => cmp(new Date(r[col] as string).getTime(), new Date(val as string).getTime())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return chain },
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val))
        return chain
      },
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      lte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a <= b)); return chain },
      gt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a > b)); return chain },
      lt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a < b)); return chain },
      not: () => chain,
      or: () => chain,
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      single: async () => {
        const hit = getRows().filter((r) => filters.every((f) => f(r)))
        return hit.length ? { data: hit[0], error: null } : { data: null, error: { code: 'PGRST116' } }
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (limitN != null) hit = hit.slice(0, limitN)
        resolve({ data: hit, error: null })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return makeTable(() => [{
          id: TENANT_ID, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey', telnyx_phone: '+15559990000', resend_api_key: 'rkey',
        }])()
      }
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/reminders', { headers: { authorization: 'Bearer test-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  notifyMock.mockClear()
  sendSMSMock.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/reminders — day-before client reminder — sms_consent/do_not_service gate', () => {
  function setDayBasedTime() {
    vi.useFakeTimers()
    const now = new Date()
    now.setHours(8, 0, 0, 0) // day-based reminders only fire at local hour 8
    vi.setSystemTime(now)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    return tomorrow
  }

  it('BLOCKED: sms_consent=false client is not texted the reminder (email still sent)', async () => {
    const tomorrow = setDayBasedTime()
    bookingsRows = [{
      id: 'b1', tenant_id: TENANT_ID, client_id: 'c-blocked', team_member_id: null, service_type: 'Clean',
      status: 'confirmed', start_time: tomorrow.toISOString(), end_time: tomorrow.toISOString(),
      clients: { name: 'Blocked', phone: '+15551110000', email: 'blocked@x.com', sms_consent: false, do_not_service: false },
      team_members: null,
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-blocked', channel: 'email' }))
  })

  it('BLOCKED: do_not_service=true client gets neither the email nor the SMS', async () => {
    const tomorrow = setDayBasedTime()
    bookingsRows = [{
      id: 'b2', tenant_id: TENANT_ID, client_id: 'c-dns', team_member_id: null, service_type: 'Clean',
      status: 'confirmed', start_time: tomorrow.toISOString(), end_time: tomorrow.toISOString(),
      clients: { name: 'DNS', phone: '+15552220000', email: 'dns@x.com', sms_consent: true, do_not_service: true },
      team_members: null,
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(notifyMock).not.toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-dns' }))
  })

  it('CONTROL: sms_consent=true, do_not_service=false client gets both the email and the SMS', async () => {
    const tomorrow = setDayBasedTime()
    bookingsRows = [{
      id: 'b3', tenant_id: TENANT_ID, client_id: 'c-ok', team_member_id: null, service_type: 'Clean',
      status: 'confirmed', start_time: tomorrow.toISOString(), end_time: tomorrow.toISOString(),
      clients: { name: 'Okay', phone: '+15553330000', email: 'ok@x.com', sms_consent: true, do_not_service: false },
      team_members: null,
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15553330000' }))
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-ok', channel: 'email' }))
  })
})

describe('cron/reminders — hour-before client reminder — sms_consent/do_not_service gate', () => {
  function setHourBasedTime() {
    vi.useFakeTimers()
    const now = new Date('2026-08-05T12:00:00.000Z')
    vi.setSystemTime(now)
    const soon = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    soon.setMinutes(30, 0, 0)
    return soon
  }

  it('BLOCKED: do_not_service=true client is not texted the 2hr reminder', async () => {
    const soon = setHourBasedTime()
    bookingsRows = [{
      id: 'b4', tenant_id: TENANT_ID, client_id: 'c-dns2', team_member_id: null, service_type: 'Clean',
      status: 'confirmed', start_time: soon.toISOString(),
      clients: { name: 'DNS Two', phone: '+15554440000', email: null, sms_consent: true, do_not_service: true },
      team_members: null,
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalledWith(expect.objectContaining({ to: '+15554440000' }))
  })

  it('CONTROL: consenting client is texted the 2hr reminder', async () => {
    const soon = setHourBasedTime()
    bookingsRows = [{
      id: 'b5', tenant_id: TENANT_ID, client_id: 'c-ok2', team_member_id: null, service_type: 'Clean',
      status: 'confirmed', start_time: soon.toISOString(),
      clients: { name: 'Okay Two', phone: '+15555550000', email: null, sms_consent: true, do_not_service: false },
      team_members: null,
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '+15555550000' }))
  })
})

describe('cron/reminders — 3-day thank-you email — do_not_service gate', () => {
  function setThankYouTime() {
    vi.useFakeTimers()
    const now = new Date()
    now.setHours(8, 0, 0, 0) // thank-you pass only fires at local hour 8
    vi.setSystemTime(now)
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(0, 0, 0, 0)
    return threeDaysAgo
  }

  it('BLOCKED: do_not_service=true client gets no thank-you email', async () => {
    const threeDaysAgo = setThankYouTime()
    bookingsRows = [{
      id: 'b6', tenant_id: TENANT_ID, client_id: 'c-dns3', team_member_id: null, service_type: 'Clean',
      status: 'completed', start_time: threeDaysAgo.toISOString(), end_time: threeDaysAgo.toISOString(),
      clients: { name: 'DNS Three', phone: null, email: 'dns3@x.com', sms_consent: true, do_not_service: true },
      team_members: null,
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-dns3' }))
  })

  it('CONTROL: consenting client gets the thank-you email', async () => {
    const threeDaysAgo = setThankYouTime()
    bookingsRows = [{
      id: 'b7', tenant_id: TENANT_ID, client_id: 'c-ok3', team_member_id: null, service_type: 'Clean',
      status: 'completed', start_time: threeDaysAgo.toISOString(), end_time: threeDaysAgo.toISOString(),
      clients: { name: 'Okay Three', phone: null, email: 'ok3@x.com', sms_consent: true, do_not_service: false },
      team_members: null,
    }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'c-ok3', channel: 'email', type: 'follow_up' }))
  })
})
