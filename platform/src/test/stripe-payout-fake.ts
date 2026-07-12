/**
 * Shared Stripe transfers/payouts spy factory for processPayment payout-branch
 * tests (P1/W1). payment-processor-payout.test.ts, payment-processor-
 * nycmaid-rate-floor.test.ts, and payment-processor-payout-ledger-wiring.test.ts
 * each stood up an identical `{ transfers, payouts }` vi.fn() pair. Extracted
 * here so the literal spy bodies live in one place.
 *
 * Each file still calls its OWN `vi.hoisted(() => makeStripePayoutSpies())` and
 * `vi.mock('stripe', ...)` — those must stay top-level/hoisted per-file
 * (hoisting is file-scoped), only the factory logic they call is shared.
 */
import { vi } from 'vitest'

export function makeStripePayoutSpies() {
  return {
    transfers: vi.fn((args: Record<string, unknown>) => Promise.resolve({ id: 'tr_1', ...args })),
    payouts: vi.fn(() => Promise.resolve({ id: 'po_1' })),
  }
}
