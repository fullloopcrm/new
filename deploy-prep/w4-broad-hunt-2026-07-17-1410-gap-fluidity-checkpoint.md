# W4 gap/fluidity — 2026-07-17 14:10

Queue (13:56 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface, worker's call — tenant_id-stamping class exhausted
(2) continue whichever surface (1) opens up
(3) keep gap/fluidity current

This file is (3). Full detail in
`w4-broad-hunt-2026-07-17-1405-stripe-client-reference-id-cross-tenant-payment-forgery-fix.md`.

## This pass — 1 closed, fresh surface picked and worked

**Surface selection**: grepped every top-level `platform/src/app/api/*`
directory against every prior `deploy-prep/*.md` filename this session
produced — `payments/`, `invoices/`, and ~35 others had never been named in
a report. Picked `payments/` (financial = high value). Checkout/link
creation endpoints were clean (permission-gated, server-priced, tenant
scoped). The consumption side — `webhooks/stripe/route.ts` — was not.

**CLOSED**: `checkout.session.completed`'s "static pay-link (NYC Maid
parity)" fallback resolved a booking from `session.client_reference_id` —
a public Stripe Payment Link query param any payer can overwrite in their
own browser — with **no tenant filter**. Reproduced end-to-end in a test:
a booking belonging to a different tenant got `payment_status: 'paid'`,
`team_member_paid: true`, and a real payout amount recorded, from a
payment made on an unrelated Payment Link. Fixed by scoping the lookup to
`NYCMAID_TENANT_ID`, matching the pattern the email-recovery fallback 15
lines below it (and the `charge.refunded` handler's
`tenantFromPaymentIntent`) already use. `47253ed6`.

## Continuation on the same surface (item 2)

Followed the same file's other `client_reference_id` consumer — the
Full-Loop-signup `prospectId` path (`prospectId = metadata?.prospect_id ||
client_reference_id`). Same untrusted-identifier shape, but bounded
severity: `prospects.id` is a `gen_random_uuid()` PK
(`037_leads_qualification.sql`), not enumerable, and even a successful
forgery only lets a payer claim a DIFFERENT prospect's signup (using that
prospect's own business_name/owner_email — the resulting invite goes to the
victim, not the attacker) rather than gaining anything for themselves.
Flagged, not fixed — no attacker-favorable exploit path without an
independent UUID leak, unlike the booking-payment case which had one
(anyone holding the static link).

Also checked `invoices/public/[token]/checkout` (public-token invoice pay)
and `invoices/[id]/record-payment` (manual Zelle/cash/check entry) as the
next-most-obvious extension of "payments" — both clean: public checkout
sets `metadata.invoice_id`/`tenant_id` directly (never trusts
`client_reference_id`), amount is server-computed from the invoice balance;
record-payment is permission-gated, tenant-scoped, validates against
remaining balance, and already has an existing double-submit race guard
(rolls back the losing payment if `amount_paid_cents` exceeds
`total_cents` after insert).

## Verification

- `npx vitest run src/app/api/webhooks/stripe/ src/app/api/payments/`: 11
  files, 23 tests, green (RED confirmed before the fix — see full report).
- `npx tsc --noEmit`: same 3 pre-existing unrelated failures as every prior
  report this session (`bookings/broadcast/route.xss.test.ts` mock-typing,
  `sunnyside-clean-nyc/_lib/site-nav.ts` export-name mismatch, 2 lines).
- No push, no deploy, no DB write this pass. 1 commit (`47253ed6`).
