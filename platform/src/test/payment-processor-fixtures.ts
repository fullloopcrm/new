/**
 * Shared seed fixtures for processPayment tests (P1/W1).
 *
 * payment-processor-math.test.ts (client-side expected/threshold/tip math) and
 * payment-processor-payout.test.ts (cleaner-side auto-payout math) each stood up
 * an identical `tenant` fixture + `seedBooking`/`seedPriorPayment`/`pay` scaffold.
 * Extracted here so the two files share one definition; each keeps its OWN
 * `vi.mock(...)` block because those are hoisted per-file and the two files mock
 * different surfaces (payout also mocks `stripe`).
 *
 * `seedBooking`'s `tm` is optional: omit it for the no-team-member case (math),
 * pass one to exercise the payout branch (payout).
 */

/** Minimal store handle: the `{ store }` half of the hoisted test handle. */
export interface SeedHandle {
  store: Record<string, Array<Record<string, unknown>>>
}

export const TENANT = 'tenant-pp'

/** Both key fields DEFINED → hydrateTenant short-circuits (no tenants query);
 *  null telnyx keeps every SMS branch inert; null stripe_api_key makes getStripe
 *  fall back to env STRIPE_SECRET_KEY. NOT the nycmaid tenant → no rate floor. */
export const tenant = {
  id: TENANT,
  name: 'Acme',
  stripe_api_key: null,
  telnyx_api_key: null,
  telnyx_phone: null,
} as const

export interface SeedTeamMember {
  stripe_account_id?: string | null
  pay_rate?: number | null
  hourly_rate?: number | null
  preferred_language?: string | null
}

export interface SeedBooking {
  actual_hours?: number | null
  hourly_rate?: number | null   // CLIENT rate (drives expectedCents)
  price?: number | null
  pay_rate?: number | null      // booking-level cleaner-rate fallback
  team_member_pay?: number | null
  tm?: SeedTeamMember | null     // omit → no team member (payout branch skipped)
}

/** Seed one tenant-scoped booking. With no `tm`, team_members is null and the
 *  payout branch never runs (the math-test case). */
export function seedBooking(h: SeedHandle, id: string, b: SeedBooking = {}): void {
  ;(h.store.bookings ||= []).push({
    id,
    tenant_id: TENANT,
    team_member_id: b.tm ? 'tm-1' : null,
    client_id: 'client-1',
    team_member_pay: b.team_member_pay ?? null,
    actual_hours: b.actual_hours ?? null,
    hourly_rate: b.hourly_rate ?? null,
    pay_rate: b.pay_rate ?? null,
    price: b.price ?? null,
    check_in_time: null,
    start_time: null,
    clients: { name: 'Pat', phone: null, address: null },
    team_members: b.tm
      ? {
          name: 'Sam',
          phone: null,
          sms_consent: false,
          stripe_account_id: b.tm.stripe_account_id ?? null,
          hourly_rate: b.tm.hourly_rate ?? null,
          pay_rate: b.tm.pay_rate ?? null,
          preferred_language: b.tm.preferred_language ?? null,
        }
      : null,
  })
}

export function seedPriorPayment(h: SeedHandle, bookingId: string, amountCents: number): void {
  ;(h.store.payments ||= []).push({
    id: `prior-${bookingId}-${amountCents}`, tenant_id: TENANT, booking_id: bookingId, amount_cents: amountCents,
  })
}
