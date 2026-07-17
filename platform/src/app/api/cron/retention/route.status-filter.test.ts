import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * cron/retention's dormant-client query filtered on `clients.active` (a
 * boolean stuck at its `true` default forever — nothing in the codebase ever
 * flips it; cron/lifecycle's own 90-day dormancy sweep only ever writes
 * status:'inactive'). A client already marked inactive, or explicitly
 * do_not_contact, still read active:true and got win-back texted anyway.
 * Fixed to filter on `status` instead, matching the codebase's established
 * `.not('status', 'in', '(...)')` idiom used elsewhere (bookings, invoices).
 */

const { sendSMSMock } = vi.hoisted(() => ({
  sendSMSMock: vi.fn(async (..._args: unknown[]) => ({})),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))

const TENANT_ID = 'tenant-retention-status'
// 45 days before the real wall-clock "now" (the route uses `new Date()`
// directly, unmocked) — safely inside the cron's 30-90 day dormancy window.
const LAST_BOOKING_END = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()

// Both clients are dormant (last booking 45 days ago, none upcoming, zero
// prior retention texts) and both still carry `active: true` — the only
// difference the pre-fix code could ever see was ignored; the only real
// distinguishing signal is `status`.
const CLIENTS = [
  { id: 'client-active', tenant_id: TENANT_ID, name: 'Ann Active', phone: '+15550000001', active: true, status: 'active', sms_consent: true },
  { id: 'client-inactive', tenant_id: TENANT_ID, name: 'Ivy Inactive', phone: '+15550000002', active: true, status: 'inactive', sms_consent: true },
  { id: 'client-dnc', tenant_id: TENANT_ID, name: 'Dana DoNotContact', phone: '+15550000003', active: true, status: 'do_not_contact', sms_consent: true },
]

function clientsChain(): unknown {
  const filters: Array<{ col: string; op: string; val: unknown }> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
    not: (col: string, op: string, val: unknown) => { filters.push({ col, op: `not.${op}`, val }); return c },
    limit: () => c,
    then: (res: (v: unknown) => unknown) => {
      const rows = CLIENTS.filter((row) => filters.every((f) => {
        if (f.op === 'eq') return (row as Record<string, unknown>)[f.col] === f.val
        if (f.op === 'not.in') {
          // val shape: '(inactive,do_not_contact)'
          const excluded = String(f.val).replace(/[()]/g, '').split(',')
          return !excluded.includes(row.status)
        }
        return true
      }))
      return Promise.resolve({ data: rows, error: null }).then(res)
    },
  }
  return c
}

function bookingsChain(): unknown {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    in: () => c,
    order: () => c,
    limit: () => c,
    gte: () => c,
    single: () => Promise.resolve({ data: { id: 'bk-1', end_time: LAST_BOOKING_END }, error: null }),
    then: (res: (v: unknown) => unknown) => Promise.resolve({ count: 0, data: [], error: null }).then(res),
  }
  return c
}

function notificationsChain(): unknown {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    gte: () => c,
    limit: () => c,
    insert: () => Promise.resolve({ data: null, error: null }),
    then: (res: (v: unknown) => unknown) => Promise.resolve({ count: 0, data: [], error: null }).then(res),
  }
  return c
}

function tenantsChain(): unknown {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    limit: () => c,
    then: (res: (v: unknown) => unknown) =>
      Promise.resolve({
        data: [{ id: TENANT_ID, name: 'Test Tenant', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }],
        error: null,
      }).then(res),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsChain()
      if (table === 'clients') return clientsChain()
      if (table === 'bookings') return bookingsChain()
      if (table === 'notifications') return notificationsChain()
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://x/api/cron/retention')
}

beforeEach(() => {
  sendSMSMock.mockClear()
})

describe('cron/retention — dormant-client filter excludes inactive/do_not_contact by status, not the dead active column', () => {
  it('texts only the client whose status is active, skipping inactive and do_not_contact', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)

    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const [call] = sendSMSMock.mock.calls[0] as [{ to: string }]
    expect(call.to).toBe('+15550000001')
  })
})
