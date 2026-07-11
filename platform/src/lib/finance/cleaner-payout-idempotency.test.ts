/**
 * Regression tests for the double cleaner-payout HIGH findings.
 *
 * Exercises processPayment() (the checkout / cleaner-report payout path) with an
 * in-memory fake DB (which enforces the UNIQUE(tenant_id, booking_id) index on
 * team_member_payouts) + spied Stripe client, and proves the cleaner is paid
 * EXACTLY ONCE via the CLAIM-before-transfer design:
 *   1. repeat checkout        → processPayment twice → 1 transfer.
 *   2. webhook-then-checkout  → a payout row already exists → 0 transfers.
 *   3. TRUE CONCURRENCY       → two processPayment in flight together → the DB
 *      unique index makes exactly one claim win → 1 transfer.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const store: Record<string, any[]> = {}
  let seq = 0
  const nextId = (p: string) => `${p}_${++seq}`
  const table = (n: string) => (store[n] ||= [])
  // Tables whose inserts must enforce a composite unique key (mirrors the
  // migration's partial UNIQUE index; only enforced when all key cols are set).
  const UNIQUE: Record<string, string[]> = { team_member_payouts: ['tenant_id', 'booking_id'] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function builder(name: string): any {
    const preds: Array<(r: any) => boolean> = []
    let inserted: any[] | null = null
    let insertError: any = null
    let patch: any = null
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
    const match = () => table(name).filter((r) => preds.every((p) => p(r)))
    const api: any = {
      select: () => api,
      order: () => api,
      range: () => api,
      limit: () => api,
      eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), api),
      in: (c: string, vs: unknown[]) => (preds.push((r) => vs.includes(r[c])), api),
      gt: (c: string, v: number) => (preds.push((r) => Number(r[c]) > Number(v)), api),
      insert: (rows: any) => {
        mode = 'insert'
        const arr = Array.isArray(rows) ? rows : [rows]
        const keyCols = UNIQUE[name]
        // Atomic uniqueness check + push (no await between) — models the DB index.
        for (const r of arr) {
          if (keyCols && keyCols.every((k) => r[k] != null)) {
            const clash = table(name).some((x) => keyCols.every((k) => x[k] === r[k]))
            if (clash) {
              insertError = { code: '23505', message: 'duplicate key value violates unique constraint' }
              inserted = null
              return api
            }
          }
        }
        inserted = arr.map((r) => ({ id: r.id ?? nextId('row'), ...r }))
        for (const r of inserted) table(name).push(r)
        return api
      },
      update: (p: any) => ((patch = p), (mode = 'update'), api),
      delete: () => ((mode = 'delete'), api),
      maybeSingle: () => Promise.resolve({ data: insertError ? null : (inserted ? inserted[0] : match()[0]) ?? null, error: insertError }),
      single: () => Promise.resolve({ data: insertError ? null : (inserted ? inserted[0] : match()[0]) ?? null, error: insertError }),
      then: (onF: any, onR: any) => {
        if (mode === 'update') {
          const rows = match()
          for (const r of rows) Object.assign(r, patch)
          return Promise.resolve({ data: rows, error: null }).then(onF, onR)
        }
        if (mode === 'delete') {
          const keep = table(name).filter((r) => !preds.every((p) => p(r)))
          const removed = table(name).length - keep.length
          store[name] = keep
          return Promise.resolve({ data: null, error: null, count: removed }).then(onF, onR)
        }
        if (mode === 'insert') return Promise.resolve({ data: inserted, error: insertError }).then(onF, onR)
        return Promise.resolve({ data: match(), error: null, count: match().length }).then(onF, onR)
      },
    }
    return api
  }

  const transfersCreate = vi.fn(async () => ({ id: 'tr_1' }))
  const payoutsCreate = vi.fn(async () => ({ id: 'po_1' }))
  const admin = { from: (n: string) => builder(n) }
  const reset = () => {
    for (const k of Object.keys(store)) delete store[k]
    seq = 0
  }
  return { store, admin, reset, transfersCreate, payoutsCreate }
})

vi.mock('../supabase', () => ({ supabaseAdmin: h.admin, supabase: h.admin }))
vi.mock('stripe', () => ({
  default: class {
    transfers = { create: h.transfersCreate }
    payouts = { create: h.payoutsCreate }
  },
}))
vi.mock('../sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('../admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('../notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('../secret-crypto', () => ({ decryptSecret: (x: string) => x }))
vi.mock('./post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: false })) }))
vi.mock('./post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: false })) }))
vi.mock('../cleaner-pay', () => ({ effectiveCleanerRate: (r: number) => r }))
vi.mock('../nycmaid/tenant', () => ({ isNycMaid: () => false, NYCMAID_TENANT_ID: 'nyc' }))
vi.mock('../dates', () => ({ parseTimestamp: (s: string) => new Date(s) }))

import { processPayment } from '../payment-processor'

const TENANT = 'tenant-aaaa'
const BOOKING = 'booking-1'

const tenant = {
  id: TENANT,
  name: 'Test Co',
  stripe_api_key: 'sk_test',
  telnyx_api_key: null,
  telnyx_phone: null,
}

function seedBooking() {
  h.store.bookings = [
    {
      id: BOOKING,
      tenant_id: TENANT,
      team_member_id: 'tm-1',
      client_id: 'client-1',
      team_member_pay: 5000,
      actual_hours: 2,
      hourly_rate: 69, // expected = 2 * 69 * 100 = 13800
      pay_rate: 35,
      price: 13800,
      check_in_time: null,
      start_time: null,
      team_member_paid: false,
      clients: { name: 'Client', phone: null, address: null },
      team_members: { name: 'Cleaner', phone: null, sms_consent: false, stripe_account_id: 'acct_1', hourly_rate: 35, pay_rate: 35, preferred_language: 'en' },
    },
  ]
}

const input = () => ({ tenant, bookingId: BOOKING, clientId: 'client-1', method: 'cash', amountCents: 13800, referenceId: `cleaner-checkout-${BOOKING}` })

beforeEach(() => {
  h.reset()
  vi.clearAllMocks()
})

describe('cleaner payout idempotency (claim-before-transfer)', () => {
  it('repeat checkout pays the cleaner exactly once', async () => {
    seedBooking()
    const r1 = await processPayment(input())
    const r2 = await processPayment(input())

    expect(r1?.status).toBe('paid')
    expect(h.transfersCreate).toHaveBeenCalledTimes(1)
    expect(h.payoutsCreate).toHaveBeenCalledTimes(1)
    expect((h.store.team_member_payouts || []).filter((p) => p.booking_id === BOOKING)).toHaveLength(1)
    expect(r2).not.toBeNull()
  })

  it('webhook-then-checkout: a pre-existing payout row blocks the checkout payout', async () => {
    seedBooking()
    h.store.team_member_payouts = [
      { id: 'payout-webhook', tenant_id: TENANT, booking_id: BOOKING, team_member_id: 'tm-1', amount_cents: 5000, status: 'transferred' },
    ]

    const r = await processPayment(input())

    expect(r?.status).toBe('paid')
    expect(h.transfersCreate).not.toHaveBeenCalled()
    expect(h.payoutsCreate).not.toHaveBeenCalled()
    expect((h.store.team_member_payouts || []).filter((p) => p.booking_id === BOOKING)).toHaveLength(1)
  })

  it('TRUE CONCURRENCY: two simultaneous checkouts → the unique claim gates to one transfer', async () => {
    seedBooking()
    // Both fire together; both pass the cheap pre-check, then race to CLAIM. The
    // UNIQUE(tenant_id, booking_id) insert lets exactly one win.
    const [ra, rb] = await Promise.all([processPayment(input()), processPayment(input())])

    expect(ra).not.toBeNull()
    expect(rb).not.toBeNull()
    expect(h.transfersCreate).toHaveBeenCalledTimes(1)
    expect(h.payoutsCreate).toHaveBeenCalledTimes(1)
    expect((h.store.team_member_payouts || []).filter((p) => p.booking_id === BOOKING)).toHaveLength(1)
  })
})
