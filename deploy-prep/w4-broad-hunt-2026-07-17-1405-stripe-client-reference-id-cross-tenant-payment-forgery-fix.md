# W4 — Stripe webhook `client_reference_id` cross-tenant payment forgery — 2026-07-17 14:05

Queue (13:56 LEADER order, item 1 — new fresh-ground surface, worker's call).
Prior tenant_id-DEFAULT write-side class closed 13:55; scanned untouched
top-level API surfaces (`payments/`, `invoices/`, and ~35 others had never
appeared in a deploy-prep filename) and picked `payments/` — financial
surfaces are high value. `payments/checkout` and `payments/link` (creation
side) were clean (permission-gated, tenant-scoped booking lookup, price read
server-side, never client-supplied). The bug is on the consumption side —
`webhooks/stripe/route.ts`'s `checkout.session.completed` handler.

## The bug

`session.client_reference_id` is a public Stripe Payment Link query
parameter — anyone holding a Payment Link URL can overwrite it in their own
browser (`?client_reference_id=<anything>`) before paying; Stripe applies no
validation or signature to it. The webhook's "static pay-link (NYC Maid
parity)" fallback used that value to resolve a booking with **no tenant
filter**:

```ts
if (!bookingId && session.client_reference_id) {
  const { data: refBooking } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id')
    .eq('id', session.client_reference_id)   // <- no .eq('tenant_id', ...)
    .maybeSingle()
  if (refBooking) {
    bookingId = refBooking.id
    tenantId = tenantId || refBooking.tenant_id   // attacker picks this tenant
  }
}
```

Whatever tenant that resolved `refBooking` belongs to becomes the `tenantId`
used for the rest of the handler — payment status, revenue ledger post, and
(if the resolved booking's cleaner has Stripe Connect) a real `stripe.transfers.create`
payout. A payer on NYC Maid's static Payment Link could append any
`bookings.id` from **any tenant** and, depending on how the paid amount
compares to that booking's price, either:
- mark an unrelated tenant's booking `paid`/`partial` with money that never
  went to that tenant, or
- if the attacker's payment amount met/exceeded the target booking's price,
  trigger a real Stripe Connect transfer to that OTHER tenant's cleaner —
  actual funds leaving the wrong Stripe account for a booking the payer never
  serviced.

This is exactly the anti-pattern the file's own `charge.refunded` handler is
already tested against not doing (`route.cross-tenant-refund.isolation.test.ts`:
"an event-supplied identifier must never be trusted to pick the tenant") —
the refund path correctly resolves the tenant from an authoritative DB
lookup on the payment_intent (`tenantFromPaymentIntent`), never from event
data. The `checkout.session.completed` handler's `client_reference_id`
fallback is the same event-supplied-identifier trap, just missed. It also
directly contradicts the pattern 15 lines below it in the same function —
the payer-email recovery fallback (NYC Maid parity) IS correctly scoped with
`.eq('tenant_id', NYCMAID_TENANT_ID)` — strong evidence this was an
accidental omission, not intentional.

## The fix

`platform/src/app/api/webhooks/stripe/route.ts` — added the same
`.eq('tenant_id', NYCMAID_TENANT_ID)` scope the email-recovery fallback
already uses (the "NYC Maid parity" comment on this code confirms this
static link is NYC-Maid-only by design):

```ts
.eq('id', session.client_reference_id)
.eq('tenant_id', NYCMAID_TENANT_ID)
.maybeSingle()
```

A booking belonging to any other tenant now never matches, so it's never
resolved, never updated, and never paid out — regardless of what
`client_reference_id` claims.

Not fixed in this pass (flagged, not actioned — out of the minimal-fix
scope): even scoped to NYC Maid only, the same mechanism still lets a payer
redirect payment attribution to a **different NYC Maid client's** booking
(same-tenant IDOR, bounded severity vs. the cross-tenant case). Closing that
fully means either binding the static link's amount to the specific booking
it's meant for, or dropping `client_reference_id` trust entirely in favor of
metadata set at link-creation time (`createPaymentLink()` already does this
correctly — see below). Flagging for a follow-up pass; did not fix now since
it's a legacy-static-link redesign question, not a one-line scope fix.

## Why the create-side wasn't vulnerable

Checked both session-creation paths in `platform/src/lib/stripe.ts`:
`createCheckoutSession` and `createPaymentLink` both set
`metadata: { tenant_id, booking_id }` directly on the Stripe object, which
Stripe propagates into `session.metadata` untouched by the payer. Only the
*legacy* static NYC Maid link (created by hand in the Stripe dashboard,
outside `createPaymentLink()`, hence "no metadata") relies on
`client_reference_id` — that's the one narrow path this fix closes.

## Verification

- New test `route.client-reference-id-cross-tenant.test.ts`: mock DB
  simulates real `.eq()` filter-narrowing semantics (not a hardcoded
  return), so the test only passes if the route's query actually includes
  the tenant filter. RED before the fix — confirmed the mock chain reached
  `payments.insert`, `bookings.update` (payment_status → `paid`,
  `team_member_paid → true`, `team_member_pay: 5000`) for a booking that
  belongs to `tenant-other`, i.e. reproduced the forged cross-tenant payment
  end-to-end in the test harness. GREEN after the fix — zero calls to
  `bookings.update`, `payments.insert` (for the victim), `transfers.create`,
  or `payouts.create`.
- `npx vitest run src/app/api/webhooks/stripe/ src/app/api/payments/`: 11
  files, 23 tests, all green (includes the 6 pre-existing stripe-webhook
  test files — no regressions).
- `npx tsc --noEmit`: same 3 pre-existing unrelated failures as every prior
  report this session (`bookings/broadcast/route.xss.test.ts` mock-typing,
  `sunnyside-clean-nyc/_lib/site-nav.ts` export-name mismatch across 2
  lines). No new errors from this change.
- No push, no deploy, no DB write this pass.
