/**
 * The three platform-billing Stripe `lookup_key` constants, in one place.
 *
 * These MUST mirror the module-private constants in `src/lib/platform-billing.ts`
 * (ADMIN_LOOKUP / MEMBER_LOOKUP / SETUP_LOOKUP). Tests that stub `stripe.prices.list`
 * key their returned prices off these, so if the source constants ever drift, the
 * fakes stop matching and `ensurePlatformPrices()` falls through to a create — which
 * the fakes throw on, failing LOUD rather than minting a phantom price. Centralized
 * so that drift only has to be reconciled in one test-side location.
 *
 * (Extracted from the copies previously inlined in platform-billing-checkout,
 * money-math-edge-cases, and the seat-quantity-divergence / ensure-prices tests —
 * P1/W1 DRY sweep.)
 */
export const PLATFORM_ADMIN_LOOKUP = 'fl_admin_seat_monthly_2500'
export const PLATFORM_MEMBER_LOOKUP = 'fl_team_seat_monthly_250'
export const PLATFORM_SETUP_LOOKUP = 'fl_setup_fee_onetime'
