import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * bookings.start_time is stored naive-ET (no tz) -- exactly what was typed
 * in. The YES/CONFIRM inbound-SMS branch found the client's "next upcoming
 * booking" via `.gte('start_time', new Date().toISOString())` -- a real-UTC
 * clock reading -- string-compared against the naive-ET column. During the
 * evening ET window (UTC already on the next calendar day, ET hasn't), that
 * lower bound sits hours in the future relative to real ET "now", so a
 * booking later tonight silently fails the >= filter: `nextBooking` comes
 * back null, the booking is never flipped to 'confirmed', no note is
 * appended, and the notification fires with `booking_id: null` -- yet the
 * webhook still returns `{ action: 'confirmed' }`, so nothing looks wrong
 * from the outside. Same bug class already fixed on schedule/calendar,
 * crew/schedule, and admin+cron system-check this session.
 *
 * Real time in this test: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5.
 * Booking starts 2026-01-05T21:00:00 (naive ET, 9pm -- 1.5h away, genuinely
 * still upcoming) and must still be found and confirmed.
 */

const TENANT_ID = 't-1'
const CLIENT_ID = 'c-1'
const BOOKING_ID = 'b-1'

type Row = Record<string, unknown>
let tenant: Row
let client: Row
let booking: Row
let notifications: Row[]

vi.mock('@/lib/webhook-verify', () => ({
  verifyTelnyx: () => ({ valid: true }),
  isWebhookVerifyDisabled: () => true,
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn(() => false) }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn(async () => null) }))

vi.mock('@/lib/supabase', () => {
  function tenantsChain() {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [{ ...tenant }], error: null }),
          }),
        }),
      }),
    }
  }

  function clientsChain() {
    return {
      select: () => {
        const filters: Array<(r: Row) => boolean> = []
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            filters.push((r) => r[col] === val)
            return c
          },
          single: async () => {
            const match = filters.every((f) => f(client))
            return match ? { data: { ...client }, error: null } : { data: null, error: null }
          },
          maybeSingle: async () => {
            const match = filters.every((f) => f(client))
            return match ? { data: { ...client }, error: null } : { data: null, error: null }
          },
        }
        return c
      },
      update: (payload: Row) => ({
        eq: async (col: string, val: unknown) => {
          if (client[col] === val) Object.assign(client, payload)
          return { data: null, error: null }
        },
      }),
    }
  }

  // Feedback-campaign-reply lookup always misses here (no campaign_recipients
  // fixture set up) -- irrelevant to the YES/CONFIRM ET-boundary bug this file
  // locks down, so the block short-circuits into the confirm flow below.
  function campaignRecipientsChain() {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              in: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }
  }

  function bookingsChain() {
    return {
      select: () => {
        const filters: Array<(r: Row) => boolean> = []
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            filters.push((r) => r[col] === val)
            return c
          },
          in: (col: string, vals: unknown[]) => {
            filters.push((r) => vals.includes(r[col]))
            return c
          },
          // Real postgrest string-compares an ISO lower bound against a
          // naive-ET TIMESTAMP column -- reproduce that here instead of the
          // confirm-race test's no-op stub, so this test can actually catch
          // the boundary bug.
          gte: (col: string, val: unknown) => {
            filters.push((r) => String(r[col]) >= String(val))
            return c
          },
          order: () => c,
          limit: () => c,
          single: async () => {
            const match = filters.every((f) => f(booking))
            return match ? { data: { ...booking }, error: null } : { data: null, error: null }
          },
        }
        return c
      },
      update: (payload: Row) => {
        const filters: Array<(r: Row) => boolean> = []
        let selected = false
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => {
            filters.push((r) => r[col] === val)
            return c
          },
          select: () => {
            selected = true
            return c
          },
          then: (resolve: (v: { data: unknown; error: null }) => void) => {
            const match = filters.every((f) => f(booking))
            if (match) {
              Object.assign(booking, payload)
              resolve({ data: selected ? [{ id: booking.id }] : null, error: null })
            } else {
              resolve({ data: selected ? [] : null, error: null })
            }
          },
        }
        return c
      },
    }
  }

  function notificationsChain() {
    return {
      insert: async (payload: Row) => {
        notifications.push(payload)
        return { data: null, error: null }
      },
    }
  }

  const from = (table: string) => {
    if (table === 'tenants') return tenantsChain()
    if (table === 'clients') return clientsChain()
    if (table === 'bookings') return bookingsChain()
    if (table === 'notifications') return notificationsChain()
    if (table === 'campaign_recipients') return campaignRecipientsChain()
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function yesRequest(): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: {
        event_type: 'message.received',
        payload: {
          from: { phone_number: '+15559990000' },
          to: [{ phone_number: '+15551234567' }],
          text: 'YES',
        },
      },
    }),
  })
}

describe('POST /api/webhooks/telnyx — YES/CONFIRM boundary must use ET, not true-UTC', () => {
  beforeEach(() => {
    tenant = {
      id: TENANT_ID,
      name: 'Acme Cleaning',
      telnyx_api_key: 'key',
      telnyx_phone: '+15551234567',
      owner_phone: '+19998887777',
    }
    client = { id: CLIENT_ID, name: 'Alice', notes: null, tenant_id: TENANT_ID, phone: '+15559990000' }
    booking = {
      id: BOOKING_ID,
      tenant_id: TENANT_ID,
      client_id: CLIENT_ID,
      start_time: '2026-01-05T21:00:00', // naive ET, 9pm -- 1.5h from "now" below
      status: 'scheduled',
    }
    notifications = []
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('still confirms a booking starting later tonight ET', async () => {
    const res = await POST(yesRequest())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.action).toBe('confirmed')
    expect(booking.status).toBe('confirmed')
    expect(String(client.notes)).toMatch(/Confirmed via SMS/)
    expect(notifications).toHaveLength(1)
    expect(notifications[0].booking_id).toBe(BOOKING_ID)
  })
})
