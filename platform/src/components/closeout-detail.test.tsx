import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Live bug (Jeff screenshot, 2026-07-23): a real $128 Stripe payment showed
 * as $0.00 in the individual payment row, while the aggregate "Total paid"
 * correctly showed $128. Root cause: the PaymentRow interface/render read
 * `p.amount`, but the API (closeout-summary/route.ts) returns `amount_cents`
 * -- the aggregate is computed server-side from the correct field, so only
 * the per-row display was broken. Same mismatch existed on cleaner payout
 * rows (`p.amount` vs `amount_cents`).
 */

import { CloseoutDetail } from './closeout-detail'

function summaryFixture() {
  return {
    booking: {
      id: 'bk-1', status: 'completed', start_time: '2026-07-23T13:00:00', end_time: '2026-07-23T15:00:00',
      service_type: 'regular', payment_status: 'paid', payment_method: 'stripe', payment_received_at: '2026-07-23T15:05:00',
      cleaner_paid: false, cleaner_paid_at: null, notes: null, client: { name: 'Ben Meyers', email: null, phone: null },
    },
    time: { check_in: '2026-07-23T13:00:00', check_out: '2026-07-23T15:00:00', raw_minutes: 120, half_blocks: 4, remainder_minutes: 0, billed_blocks: 4, billed_hours: 2, max_hours_cap: null, capped_at_max: false },
    bill: { hourly_rate: 64, team_size: 1, gross_cents: 12800, discounts: [], total_discount_cents: 0, final_cents: 12800, cc_cents: 13312 },
    payments: [
      { id: 'pay-1', amount_cents: 8000, tip_cents: 0, method: 'stripe', stripe_session_id: 'sess_1', stripe_payment_intent_id: 'pi_1', reference_id: null, created_at: '2026-07-23T15:05:00' },
      { id: 'pay-2', amount_cents: 4800, tip_cents: 0, method: 'stripe', stripe_session_id: 'sess_2', stripe_payment_intent_id: 'pi_2', reference_id: null, created_at: '2026-07-23T15:06:00' },
    ],
    payment_totals: { paid_cents: 12800, expected_cents: 12800, overpayment_cents: 0, is_overpaid: false, is_underpaid: false, tip_cents: 0 },
    cleaner_payouts: [
      {
        cleaner_id: 'tm-1', name: 'Sarai Aguirre', phone: null, is_lead: true,
        base_cents: 5000, tip_cents: 500, total_due_cents: 5500, total_paid_cents: 5250, outstanding_cents: 250,
        payouts: [
          { id: 'po-1', amount_cents: 3000, method: 'zelle', created_at: '2026-07-23T15:10:00' },
          { id: 'po-2', amount_cents: 2250, method: 'venmo', created_at: '2026-07-23T15:12:00' },
        ],
      },
    ],
    sms_log: [],
  }
}

describe('CloseoutDetail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the real dollar amount on each payment row, not $0.00', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summaryFixture() }))

    render(<CloseoutDetail bookingId="bk-1" />)

    expect(await screen.findByText('$80.00')).toBeInTheDocument()
    expect(screen.getByText('$48.00')).toBeInTheDocument()
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
  })

  it('renders the real dollar amount on a cleaner payout row, not $0.00', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => summaryFixture() }))

    render(<CloseoutDetail bookingId="bk-1" />)

    expect(await screen.findByText('$30.00')).toBeInTheDocument()
    expect(screen.getByText('$22.50')).toBeInTheDocument()
  })
})
