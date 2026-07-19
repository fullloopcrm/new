import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The 1-5 star rating-intercept branch looked up the client's recently
 * completed booking with `.eq('status', 'completed')` only. POST
 * /api/finance/payroll (bulk payroll) or a manual mark-paid flips a
 * booking's status straight to 'paid' well within the 48hr rating window --
 * that only means team-pay happened, it says nothing about whether the
 * client's post-service rating SMS should still be captured. A client
 * texting "5" after their booking had already been bulk-paid fell straight
 * through to the generic inbound-SMS branch: no rating stored on the
 * booking, no low-rating admin alert, no thank-you/review-request reply
 * sent. Same root cause as the finance/dashboard status='paid' blind-spot
 * sweep this session.
 */

const TENANT_ID = 't-1'
const CLIENT_ID = 'c-1'
const BOOKING_ID = 'b-1'

type Row = Record<string, unknown>
let tenant: Row
let client: Row
let booking: Row
let notifications: Row[]
let smsMessages: Row[]

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
          gte: (col: string, val: unknown) => {
            filters.push((r) => (r[col] as string) >= (val as string))
            return c
          },
          like: (col: string, pattern: string) => {
            const needle = pattern.replace(/%/g, '')
            filters.push((r) => String(r[col] || '').includes(needle))
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
      update: (payload: Row) => ({
        eq: async (col: string, val: unknown) => {
          if (booking[col] === val) Object.assign(booking, payload)
          return { data: null, error: null }
        },
      }),
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

  function clientSmsMessagesChain() {
    return {
      insert: async (payload: Row) => {
        smsMessages.push(payload)
        return { data: null, error: null }
      },
    }
  }

  // Only reached by the (buggy, pre-fix) fallthrough into the generic
  // inbound-SMS handler when the rating lookup misses -- no team member
  // exists in this scenario, so always report no match.
  function teamMembersChain() {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }
  }

  // Feedback-campaign-reply lookup always misses here (no campaign_recipients
  // fixture set up) -- irrelevant to the status='paid' rating-blind-spot this
  // file locks down, so the block short-circuits into the rating flow below.
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

  const from = (table: string) => {
    if (table === 'tenants') return tenantsChain()
    if (table === 'clients') return clientsChain()
    if (table === 'bookings') return bookingsChain()
    if (table === 'notifications') return notificationsChain()
    if (table === 'client_sms_messages') return clientSmsMessagesChain()
    if (table === 'team_members') return teamMembersChain()
    if (table === 'campaign_recipients') return campaignRecipientsChain()
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function ratingRequest(digit: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: {
        event_type: 'message.received',
        payload: {
          from: { phone_number: '+15559990000' },
          to: [{ phone_number: '+15551234567' }],
          text: digit,
        },
      },
    }),
  })
}

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
    // Bulk payroll already flipped this to 'paid' well inside the 48hr window.
    status: 'paid',
    check_out_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    notes: '[FOLLOWUP_SENT] sent on schedule',
  }
  notifications = []
  smsMessages = []
})

describe('POST /api/webhooks/telnyx — rating intercept status=paid (bulk payroll) blind spot', () => {
  it('captures a 1-5 rating reply on a booking bulk-paid within the 48hr window', async () => {
    const res = await POST(ratingRequest('5'))
    const json = await res.json()
    expect(json.action).toBe('rating_captured')
    expect(json.rating).toBe(5)
    expect(String(booking.notes)).toMatch(/\[RATING:5\]/)
  })

  it('still sends the rating reply + logs the review_received notification', async () => {
    await POST(ratingRequest('2'))
    expect(smsMessages.some((m) => m.direction === 'outbound')).toBe(true)
    expect(notifications.some((n) => n.type === 'review_received')).toBe(true)
  })
})
