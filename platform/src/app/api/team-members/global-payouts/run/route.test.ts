import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Global Payouts run endpoint. The two behaviors that matter most:
 *   1. A booking already paid (via either rail) is never paid twice.
 *   2. Running out of funds partway through a batch degrades to partial
 *      success (some paid, rest skipped+released for retry) — it must not
 *      throw and abandon bookings that already succeeded.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant_1' }, error: null }),
}))

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

const bookingsData = [
  {
    id: 'book_1',
    team_member_id: 'tm_1',
    team_member_pay: 5000,
    start_time: '2026-08-01T00:00:00Z',
    team_members: { global_payouts_recipient_id: 'acct_recipient_1', name: 'Cleaner One' },
  },
  {
    id: 'book_2',
    team_member_id: 'tm_2',
    team_member_pay: 3000,
    start_time: '2026-08-02T00:00:00Z',
    team_members: { global_payouts_recipient_id: 'acct_recipient_2', name: 'Cleaner Two' },
  },
]

function bookingsChain() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    or: () => chain,
    not: () => chain,
    order: () => Promise.resolve({ data: bookingsData, error: null }),
  }
  return chain
}

function paymentsChain() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => Promise.resolve({ data: [], error: null }),
  }
  return chain
}

const bookingsUpdateMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'tenant_1', stripe_api_key: 'sk_test_x' }, error: null }) }) }) }
      }
      if (table === 'bookings') {
        const chain = bookingsChain()
        // route also calls .update(...).eq(...).eq(...) on bookings after a successful payout
        ;(chain as Record<string, unknown>).update = (row: unknown) => {
          bookingsUpdateMock(row)
          return { eq: () => ({ eq: async () => ({ data: null, error: null }) }) }
        }
        return chain
      }
      if (table === 'payments') return paymentsChain()
      const noop: Record<string, unknown> = {
        select: () => noop, insert: () => noop, update: () => noop, eq: () => noop,
        limit: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }
      return noop
    },
  },
}))

const cleanerAlreadyPaidMock = vi.fn(async (_tenantId: string, bookingId: string) => bookingId === 'book_1')
vi.mock('@/lib/finance/cleaner-payout', () => ({
  cleanerAlreadyPaid: (...args: [string, string]) => cleanerAlreadyPaidMock(...args),
  releaseCleanerPayout: vi.fn(async () => {}),
}))

const claimGlobalPayoutMock = vi.fn(async (..._args: unknown[]) => ({ claimed: true, payoutId: 'payout_1' }))
const finalizeGlobalPayoutMock = vi.fn(async (..._args: unknown[]) => {})
const getStorageFinancialAccountMock = vi.fn(async (..._args: unknown[]) => ({ id: 'fa_1', balance: { available: { usd: { value: 0 } } } }))
const ensureFinancialAccountFundedMock = vi.fn(async (..._args: unknown[]) => ({ toppedUpCents: 3000, stripeTopUpId: 'po_1' }))
const createOutboundPaymentMock = vi.fn(async (..._args: unknown[]) => ({ id: 'op_1', status: 'processing' }))

vi.mock('@/lib/finance/global-payouts', () => ({
  claimGlobalPayout: (...args: unknown[]) => claimGlobalPayoutMock(...args),
  finalizeGlobalPayout: (...args: unknown[]) => finalizeGlobalPayoutMock(...args),
  getStorageFinancialAccount: (...args: unknown[]) => getStorageFinancialAccountMock(...args),
  ensureFinancialAccountFunded: (...args: unknown[]) => ensureFinancialAccountFundedMock(...args),
  createOutboundPayment: (...args: unknown[]) => createOutboundPaymentMock(...args),
}))

vi.mock('stripe', () => {
  class MockStripe {
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

import { POST } from './route'

beforeEach(() => {
  cleanerAlreadyPaidMock.mockClear()
  claimGlobalPayoutMock.mockClear()
  finalizeGlobalPayoutMock.mockClear()
  ensureFinancialAccountFundedMock.mockClear()
  createOutboundPaymentMock.mockClear()
  bookingsUpdateMock.mockClear()
})

describe('POST /api/team-members/global-payouts/run', () => {
  it('skips a booking already paid on another rail and only pays the remaining one', async () => {
    const res = await POST()
    const body = await res.json()

    expect(body.paid).toHaveLength(1)
    expect(body.paid[0].bookingId).toBe('book_2')
    expect(createOutboundPaymentMock).toHaveBeenCalledTimes(1)
    expect(createOutboundPaymentMock).toHaveBeenCalledWith('sk_test_x', expect.objectContaining({ recipientId: 'acct_recipient_2', amountCents: 3000 }))
    expect(bookingsUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ team_member_paid: true }))
  })

  it('degrades to partial success when the outbound payment fails (e.g. still short on funds) — does not throw', async () => {
    cleanerAlreadyPaidMock.mockImplementation(async () => false)
    createOutboundPaymentMock
      .mockImplementationOnce(async () => ({ id: 'op_1', status: 'processing' }))
      .mockImplementationOnce(async () => { throw new Error('insufficient_funds') })

    const res = await POST()
    const body = await res.json()

    expect(body.paid).toHaveLength(1)
    expect(body.skipped).toHaveLength(1)
    expect(body.skipped[0].reason).toMatch(/insufficient_funds/)
  })
})
