/**
 * Regression tests for the 2026-08-07 multi-cleaner-payout + tip-at-checkout
 * fix. A 2-person job (lead + 1 extra) checked out via team-portal checkout
 * paid only the lead (Cinthya) and left the extra (Karina) with $0 — extras
 * were never wired into the checkout-triggered payout path. Separately, a
 * tip recorded in `payments` before checkout was silently dropped (checkout
 * payout hardcoded tipCents: 0).
 *
 * Uses the same in-memory fake DB + spied Stripe pattern as
 * cleaner-payout-idempotency.test.ts, extended with the widened
 * UNIQUE(tenant_id, booking_id, team_member_id) index from
 * supabase/migrations/20260807164759_widen_team_member_payouts_unique_index.sql.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const store: Record<string, any[]> = {}
  let seq = 0
  const nextId = (p: string) => `${p}_${++seq}`
  const table = (n: string) => (store[n] ||= [])
  const UNIQUE: Record<string, string[]> = { team_member_payouts: ['tenant_id', 'booking_id', 'team_member_id'] }

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
      insert: (rows: any) => {
        mode = 'insert'
        const arr = Array.isArray(rows) ? rows : [rows]
        const keyCols = UNIQUE[name]
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
          store[name] = keep
          return Promise.resolve({ data: null, error: null }).then(onF, onR)
        }
        if (mode === 'insert') return Promise.resolve({ data: inserted, error: insertError }).then(onF, onR)
        return Promise.resolve({ data: match(), error: null, count: match().length }).then(onF, onR)
      },
    }
    return api
  }

  const transfersCreate = vi.fn(async () => ({ id: 'tr_1' }))
  const payoutsCreate = vi.fn(async () => ({ id: 'po_1' }))
  const telegramSend = vi.fn(async () => {})
  const smsAdminsSend = vi.fn(async () => {})
  const admin = { from: (n: string) => builder(n) }
  const reset = () => {
    for (const k of Object.keys(store)) delete store[k]
    seq = 0
  }
  return { store, admin, reset, transfersCreate, payoutsCreate, telegramSend, smsAdminsSend }
})

vi.mock('../supabase', () => ({ supabaseAdmin: h.admin, supabase: h.admin }))
vi.mock('stripe', () => ({
  default: class {
    transfers = { create: h.transfersCreate }
    payouts = { create: h.payoutsCreate }
  },
}))
vi.mock('../admin-contacts', () => ({ smsAdmins: h.smsAdminsSend }))
vi.mock('../notify', () => ({ sendTenantTelegram: h.telegramSend }))
vi.mock('../secret-crypto', () => ({ decryptSecret: (x: string) => x }))
vi.mock('./post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: false })) }))
vi.mock('../cleaner-pay', () => ({ effectiveCleanerRate: (r: number) => r }))
vi.mock('../nycmaid/tenant', () => ({ isNycMaid: () => false, NYCMAID_TENANT_ID: 'nyc' }))

import { payCleanerAtCheckout, payExtraCrewAtCheckout } from './checkout-payout'

const TENANT = 'tenant-aaaa'
const BOOKING = 'booking-1'
const LEAD = 'tm-lead'
const EXTRA = 'tm-extra'

function seedTenant() {
  h.store.tenants = [{ id: TENANT, stripe_api_key: 'sk_test', telegram_bot_token: 'bot', telegram_chat_id: 'chat' }]
}

beforeEach(() => {
  h.reset()
  vi.clearAllMocks()
  seedTenant()
})

describe('multi-cleaner checkout payout', () => {
  it('pays the lead AND an extra crew member as separate payout rows', async () => {
    h.store.booking_team_members = [
      { tenant_id: TENANT, booking_id: BOOKING, team_member_id: EXTRA, is_lead: false, team_members: { id: EXTRA, name: 'Karina', pay_rate: 30, hourly_rate: null, stripe_account_id: 'acct_extra', global_payouts_recipient_id: null } },
    ]

    await payCleanerAtCheckout({
      tenantId: TENANT, bookingId: BOOKING, teamMemberId: LEAD, teamMemberPayCents: 13950,
      teamMember: { stripe_account_id: 'acct_lead', name: 'Cinthya' }, isLead: true,
    })
    await payExtraCrewAtCheckout({
      tenantId: TENANT, bookingId: BOOKING, leadTeamMemberId: LEAD,
      checkInIso: '2026-08-07T11:50:00Z', checkOutIso: '2026-08-07T16:23:00Z',
      hourlyRate: 69, discountPercent: null, oneTimeCreditCents: null, recurringType: null, maxHours: null, teamSize: 2,
      clientAddress: null, clientName: 'Test Client',
    })

    const payouts = h.store.team_member_payouts || []
    expect(payouts).toHaveLength(2)
    expect(payouts.find((p) => p.team_member_id === LEAD)).toBeTruthy()
    expect(payouts.find((p) => p.team_member_id === EXTRA)).toBeTruthy()
    expect(h.transfersCreate).toHaveBeenCalledTimes(2)
  })

  it('does NOT re-pay the lead when paying the extra (per-member idempotency, not per-booking)', async () => {
    h.store.team_member_payouts = [
      { id: 'p1', tenant_id: TENANT, booking_id: BOOKING, team_member_id: LEAD, status: 'transferred' },
    ]
    h.store.booking_team_members = [
      { tenant_id: TENANT, booking_id: BOOKING, team_member_id: EXTRA, is_lead: false, team_members: { id: EXTRA, name: 'Karina', pay_rate: 30, hourly_rate: null, stripe_account_id: 'acct_extra', global_payouts_recipient_id: null } },
    ]

    await payExtraCrewAtCheckout({
      tenantId: TENANT, bookingId: BOOKING, leadTeamMemberId: LEAD,
      checkInIso: '2026-08-07T11:50:00Z', checkOutIso: '2026-08-07T16:23:00Z',
      hourlyRate: 69, discountPercent: null, oneTimeCreditCents: null, recurringType: null, maxHours: null, teamSize: 2,
      clientAddress: null, clientName: 'Test Client',
    })

    expect(h.transfersCreate).toHaveBeenCalledTimes(1)
    const payouts = h.store.team_member_payouts || []
    expect(payouts).toHaveLength(2)
    expect(payouts.find((p) => p.team_member_id === EXTRA)?.status).toBe('transferred')
  })

  it('a repeat call for the same extra does not double-pay them', async () => {
    h.store.booking_team_members = [
      { tenant_id: TENANT, booking_id: BOOKING, team_member_id: EXTRA, is_lead: false, team_members: { id: EXTRA, name: 'Karina', pay_rate: 30, hourly_rate: null, stripe_account_id: 'acct_extra', global_payouts_recipient_id: null } },
    ]
    const opts = {
      tenantId: TENANT, bookingId: BOOKING, leadTeamMemberId: LEAD,
      checkInIso: '2026-08-07T11:50:00Z', checkOutIso: '2026-08-07T16:23:00Z',
      hourlyRate: 69, discountPercent: null, oneTimeCreditCents: null, recurringType: null, maxHours: null, teamSize: 2,
      clientAddress: null, clientName: 'Test Client',
    }
    await payExtraCrewAtCheckout(opts)
    await payExtraCrewAtCheckout(opts)

    expect(h.transfersCreate).toHaveBeenCalledTimes(1)
    expect((h.store.team_member_payouts || []).filter((p) => p.team_member_id === EXTRA)).toHaveLength(1)
  })

  it('includes an already-recorded tip in the LEAD payout, not hardcoded to 0', async () => {
    h.store.payments = [{ tenant_id: TENANT, booking_id: BOOKING, tip_cents: 1380 }]

    await payCleanerAtCheckout({
      tenantId: TENANT, bookingId: BOOKING, teamMemberId: LEAD, teamMemberPayCents: 6000,
      teamMember: { stripe_account_id: 'acct_lead', name: 'Cinthya' }, isLead: true,
    })

    expect(h.transfersCreate).toHaveBeenCalledTimes(1)
    expect((h.transfersCreate.mock.calls[0] as any)[0].amount).toBe(7380) // 6000 base + 1380 tip
    const payout = (h.store.team_member_payouts || [])[0]
    expect(payout.tip_cents).toBe(1380)
    expect(payout.amount_cents).toBe(6000) // base pay tracked separately from tip
  })

  it('does NOT apply a tip to an extra crew member (tip rides with the lead only)', async () => {
    h.store.payments = [{ tenant_id: TENANT, booking_id: BOOKING, tip_cents: 1380 }]
    h.store.booking_team_members = [
      { tenant_id: TENANT, booking_id: BOOKING, team_member_id: EXTRA, is_lead: false, team_members: { id: EXTRA, name: 'Karina', pay_rate: 30, hourly_rate: null, stripe_account_id: 'acct_extra', global_payouts_recipient_id: null } },
    ]

    await payExtraCrewAtCheckout({
      tenantId: TENANT, bookingId: BOOKING, leadTeamMemberId: LEAD,
      checkInIso: '2026-08-07T11:50:00Z', checkOutIso: '2026-08-07T16:23:00Z',
      hourlyRate: 69, discountPercent: null, oneTimeCreditCents: null, recurringType: null, maxHours: null, teamSize: 2,
      clientAddress: null, clientName: 'Test Client',
    })

    const payout = (h.store.team_member_payouts || []).find((p) => p.team_member_id === EXTRA)
    expect(payout.tip_cents).toBe(0)
  })

  it('sends a Telegram alert (in addition to SMS) when the transfer fails', async () => {
    h.transfersCreate.mockRejectedValueOnce(new Error('card_declined'))

    await payCleanerAtCheckout({
      tenantId: TENANT, bookingId: BOOKING, teamMemberId: LEAD, teamMemberPayCents: 6000,
      teamMember: { stripe_account_id: 'acct_lead', name: 'Cinthya' }, isLead: true,
    })

    expect(h.smsAdminsSend).toHaveBeenCalledTimes(1)
    expect(h.telegramSend).toHaveBeenCalledTimes(1)
    expect((h.telegramSend.mock.calls[0] as any)[2]).toMatch(/FAILED/)
  })
})
