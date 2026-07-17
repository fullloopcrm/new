import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/payments/confirm-match — the team-member "payment
 * received" tip SMS never checked team_members.sms_consent (P1/W2
 * fresh-ground, same missing-check shape as lib/payment-processor.ts's own
 * team-member finish-up SMS — that one already gates on sms_consent for this
 * exact message shape; this route's copy of the same notification never did).
 *
 * team_members.sms_consent is a real, crew-editable column since the
 * team-portal/preferences fix — a crew member who revoked SMS consent still
 * got texted "Payment received from <client>" on every Zelle/Venmo match an
 * admin confirmed.
 *
 * FIX: the send now also gates on `tm.sms_consent !== false`.
 *
 * `bookings` gets a hand-rolled table mock (not the shared
 * createTenantDbHarness) because the route's SELECT does a real foreign-table
 * join (`team_members!bookings_team_member_id_fkey(...)`) the shared harness
 * doesn't resolve, and this test needs to control exactly what that join
 * returns.
 */

type Row = Record<string, unknown>

function makeBookingsTable(rows: Row[]) {
  return () => {
    const filters: Array<(r: Row) => boolean> = []
    let op: 'select' | 'update' = 'select'
    let updateValues: Row = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      update: (values: Row) => { op = 'update'; updateValues = values; return chain },
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      single: async () => {
        const hit = rows.filter((r) => filters.every((f) => f(r)))
        return hit.length ? { data: { ...hit[0] }, error: null } : { data: null, error: { code: 'PGRST116' } }
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        const hit = rows.filter((r) => filters.every((f) => f(r)))
        if (op === 'update') hit.forEach((r) => Object.assign(r, updateValues))
        resolve({ data: hit, error: null })
      },
    }
    return chain
  }
}

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], bookingsRows: [] as Row[] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => (t === 'bookings' ? makeBookingsTable(holder.bookingsRows)() : holder.from!(t)),
  },
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

import { POST } from './route'

function bookingsSeed(): Row[] {
  return [
    {
      id: 'bk-blocked', tenant_id: CTX_TENANT, client_id: 'c-1', team_member_id: 'tm-blocked',
      hourly_rate: 50, actual_hours: 2, price: null,
      clients: { name: 'Client A', phone: null },
      team_members: { name: 'Blocked Crew', phone: '3005551111', preferred_language: 'en', sms_consent: false },
    },
    {
      id: 'bk-control', tenant_id: CTX_TENANT, client_id: 'c-1', team_member_id: 'tm-control',
      hourly_rate: 50, actual_hours: 2, price: null,
      clients: { name: 'Client A', phone: null },
      team_members: { name: 'Control Crew', phone: '3005552222', preferred_language: 'en', sms_consent: true },
    },
  ]
}

function seed() {
  return {
    unmatched_payments: [
      { id: 'up-blocked', tenant_id: CTX_TENANT, method: 'zelle', amount_cents: 10000, sender_name: 'Client A', status: 'pending' },
      { id: 'up-control', tenant_id: CTX_TENANT, method: 'zelle', amount_cents: 10000, sender_name: 'Client A', status: 'pending' },
    ],
    payments: [],
    notifications: [],
    tenants: [{ id: CTX_TENANT, name: 'Alpha', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.bookingsRows = bookingsSeed()
  sendSMSMock.mockClear()
})

function req(unmatchedPaymentId: string, bookingId: string) {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ unmatchedPaymentId, bookingId }) })
}

describe('admin/payments/confirm-match POST — sms_consent gate on team-member tip SMS', () => {
  it('BLOCKED: a crew member who revoked sms_consent is not texted the payment-received SMS', async () => {
    const res = await POST(req('up-blocked', 'bk-blocked'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: a consented crew member is still texted the payment-received SMS', async () => {
    const res = await POST(req('up-control', 'bk-control'))
    expect(res.status).toBe(200)
    expect(sendSMSMock).toHaveBeenCalledWith(expect.objectContaining({ to: '3005552222' }))
  })
})
