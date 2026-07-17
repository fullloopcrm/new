import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 fresh-ground — `syncBookingRefundStatus`, the piece that was missing
 * entirely: a Stripe refund processed OUTSIDE Selena chat (Stripe Dashboard,
 * any other integration) posted the ledger reversal via postRefundToLedger
 * but never touched `bookings.payment_status`, unlike Selena's own
 * `handleProcessStripeRefund` tool which sets it immediately. Every
 * booking-driven finance report (dashboard, P&L, cash-flow, AR-aging) reads
 * `bookings.payment_status`, not the ledger, so the booking kept reading
 * paid/partial forever and revenue stayed permanently overstated by the
 * refund amount.
 *
 * Locks: the update targets the right tenant + booking, sets exactly
 * payment_status='refunded', and touches nothing else on the row.
 */

const h = vi.hoisted(() => {
  const calls: Array<{ table: string; payload: Record<string, unknown>; tenantId?: string; id?: string }> = []
  return {
    calls,
    reset: () => { calls.length = 0 },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => {
        const call: { table: string; payload: Record<string, unknown>; tenantId?: string; id?: string } = { table, payload }
        h.calls.push(call)
        const builder = {
          eq: (col: string, val: string) => {
            if (col === 'tenant_id') call.tenantId = val
            if (col === 'id') call.id = val
            return builder
          },
        }
        return builder
      },
    }),
  },
}))

import { syncBookingRefundStatus } from '@/lib/finance/post-adjustments'

beforeEach(() => {
  h.reset()
})

describe('syncBookingRefundStatus — flips the booking so overstated revenue reports stop lying', () => {
  it('updates bookings.payment_status to refunded, scoped to the exact tenant + booking', async () => {
    await syncBookingRefundStatus({ tenantId: 'tenant-A', bookingId: 'bk_123' })

    expect(h.calls).toHaveLength(1)
    const call = h.calls[0]
    expect(call.table).toBe('bookings')
    expect(call.payload).toEqual({ payment_status: 'refunded' })
    expect(call.tenantId).toBe('tenant-A')
    expect(call.id).toBe('bk_123')
  })

  it('does not bleed one tenant/booking\'s update into another\'s scoping', async () => {
    await syncBookingRefundStatus({ tenantId: 'tenant-A', bookingId: 'bk_A' })
    await syncBookingRefundStatus({ tenantId: 'tenant-B', bookingId: 'bk_B' })

    expect(h.calls).toHaveLength(2)
    expect(h.calls[0]).toMatchObject({ tenantId: 'tenant-A', id: 'bk_A' })
    expect(h.calls[1]).toMatchObject({ tenantId: 'tenant-B', id: 'bk_B' })
  })
})
