import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The YES/CONFIRM inbound-SMS branch read the client's next 'scheduled'
 * booking from a plain SELECT snapshot, then flipped it to 'confirmed' with
 * an UNCONDITIONAL update (no WHERE on the prior status) before appending a
 * client note and firing a booking_confirmed notification. Telnyx retries
 * message.received on any non-2xx/timeout, and a client double-texting
 * "YES" produces the exact same shape: two concurrent deliveries both read
 * status='scheduled' and both proceed — duplicate "[Auto] Confirmed via
 * SMS" notes appended to the client record, and a duplicate
 * booking_confirmed admin notification. Fixed by claiming the
 * scheduled -> confirmed transition atomically (`eq('status','scheduled')`
 * in the UPDATE's WHERE) — only the delivery that actually flips the row
 * appends the note and fires the notification; the loser is a no-op 200
 * (matching Telnyx's expectation that redelivery isn't an error).
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
  // fixture set up) -- irrelevant to the YES/CONFIRM double-fire race this
  // file locks down, so the block short-circuits into the confirm flow below.
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
          gte: () => c,
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

beforeEach(() => {
  tenant = {
    id: TENANT_ID,
    name: 'Acme Cleaning',
    telnyx_api_key: 'key',
    telnyx_phone: '+15551234567',
    owner_phone: '+19998887777', // distinct from client `from`, so owner-routing branch is not hit
  }
  client = { id: CLIENT_ID, name: 'Alice', notes: null, tenant_id: TENANT_ID, phone: '+15559990000' }
  booking = {
    id: BOOKING_ID,
    tenant_id: TENANT_ID,
    client_id: CLIENT_ID,
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
  }
  notifications = []
})

describe('POST /api/webhooks/telnyx — YES/CONFIRM double-fire race', () => {
  it('confirms the booking, appends one note, and fires one notification', async () => {
    const res = await POST(yesRequest())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.action).toBe('confirmed')
    expect(booking.status).toBe('confirmed')
    expect(String(client.notes)).toMatch(/Confirmed via SMS/)
    expect(notifications).toHaveLength(1)
  })

  it('does not double-confirm or double-notify when Telnyx redelivers (or the client double-texts) YES', async () => {
    const [r1, r2] = await Promise.all([POST(yesRequest()), POST(yesRequest())])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(booking.status).toBe('confirmed')
    expect(notifications).toHaveLength(1)
    // Only one delivery should have appended the confirmation note — a lost
    // race would append it twice (or the loser would clobber with a second
    // identical line onto the winner's already-updated notes).
    const noteOccurrences = String(client.notes).split('Confirmed via SMS').length - 1
    expect(noteOccurrences).toBe(1)
  })
})
