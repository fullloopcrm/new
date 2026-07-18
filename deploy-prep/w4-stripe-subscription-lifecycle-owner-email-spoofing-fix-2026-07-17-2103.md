# Stripe subscription lifecycle events matched tenants by spoofable email — fixed

Per the 20:44 LEADER order, item (1): fresh-ground surface. File-only, no push/deploy/DB.

## What was wrong

`POST /api/webhooks/stripe`'s three platform-subscription-billing handlers —
`invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` —
located the target `tenants` row by matching the Stripe-supplied email
(`invoice.customer_email` / the subscription's Stripe customer's email)
against `tenants.owner_email`, instead of the `stripe_subscription_id`
already stored on the tenant row at signup (`checkout.session.completed`,
same file, line ~169).

Two problems with an email match here:

1. **`owner_email` is not unique.** Nothing in the schema or app logic
   prevents two tenants (e.g. a multi-location owner, or two prospects who
   both used a shared/agency inbox) from sharing one `owner_email`. A
   billing event for tenant A's subscription would resolve to whichever
   tenant with that email the query happened to return first, silently
   corrupting an unrelated tenant's `billing_status`.
2. **`owner_email` is attacker-reachable.** `POST /api/prospects` is public,
   unauthenticated intake and accepts any `owner_email` verbatim (capped at
   2000 chars, no ownership/verification check — see
   `src/app/api/prospects/route.ts`). Once a Full Loop admin approves that
   prospect, `admin/prospects/[id]/route.ts` creates a Stripe Checkout
   session with `customer_email: prospect.owner_email` — i.e. the
   attacker-chosen string becomes the literal Stripe customer email on a
   real subscription. Someone willing to submit a prospect application with
   a known/guessed victim tenant's `owner_email` (visible on that tenant's
   own public marketing site in most cases), get it approved, and run their
   own real subscription through to a payment failure or cancellation,
   could flip the **victim** tenant's `billing_status` to `past_due` /
   `cancelled` — using their own Stripe object, without ever touching the
   victim's actual subscription.

**Severity note:** confirmed `billing_status` does not currently gate any
dashboard/feature access anywhere in the app (grepped all consumers — it's
read only by `src/app/admin/businesses/*` display pages and
`create-tenant-from-lead.ts`'s initial value). So today this is a
data-integrity / internal-dashboard-accuracy bug, not an auth-bypass or
account-lockout — but it's the exact kind of loose identity binding that
becomes a real incident the moment someone wires `billing_status` into an
actual access gate (a natural next step for this field), and the fix is
cheap, so fixed now rather than left as a landmine.

## The fix

Added `subscriptionIdFromInvoice()` (extracts the subscription id via
`invoice.parent?.subscription_details?.subscription` — this Stripe API
version, `2025-04-30.basil`, moved `Invoice.subscription` under `.parent`;
confirmed against `node_modules/stripe/types/Invoices.d.ts`, no top-level
`subscription` field exists anymore). All three handlers now:

- `invoice.paid` / `invoice.payment_failed`: look up the tenant by
  `.eq('stripe_subscription_id', subscriptionId)`. No subscription id on
  the event → `break` (no email fallback — these events only ever fire for
  the platform-subscription flow, which always carries a subscription id,
  per the "Setup is paid by bank wire out of band" comment already in this
  file).
- `customer.subscription.deleted`: matches by the subscription object's own
  `.id` directly against `stripe_subscription_id` — this also drops the
  now-unnecessary `stripe.customers.retrieve()` round-trip that only
  existed to resolve the email.

## Verification

- RED-confirmed: `git diff -- route.ts > patch && git apply -R patch`,
  reran the new test file — 2 of 4 assertions failed against the pre-fix
  code (the "no subscription id → no tenant touched" case, since old code
  fell back to email; the `customer.subscription.deleted` case, since old
  code required `stripe.customers.retrieve` which no longer resolves
  anything useful once callers stop supplying an email-bearing customer).
  Reapplied the patch → all 4 GREEN.
- New file: `route.subscription-id-tenant-match.test.ts` (4 tests) —
  proves the legitimate subscription-id match still works, and that an
  event carrying another tenant's `owner_email` but a *different*
  subscription id no longer touches that tenant.
- Updated `route.payment-failed-html-injection.test.ts` (today's earlier
  20:23 fix, tenant.name HTML-escaping in the admin alert) to construct its
  mock invoice with `parent.subscription_details.subscription` instead of
  bare `customer_email`, and gave the mock tenant a
  `stripe_subscription_id` — otherwise that test would now short-circuit
  before ever reaching the email-escaping code it's meant to exercise.
- `npx tsc --noEmit`: clean, same 3 pre-existing baseline errors (unrelated
  files — `bookings/broadcast/route.xss.test.ts`,
  `sunnyside-clean-nyc/_lib/site-nav.ts` x2), 0 new.
- `webhooks/stripe/` suite: 9/9 files, 20/20 tests pass.
- Full suite: 612/614 files, 2168/2172 tests. 2 failures, both pre-existing
  and unrelated to this diff:
  - `cron/generate-recurring/route.duplicate-occurrence-race.test.ts` —
    reproduced the same failure running in isolation on this same commit
    (flaky race test, already flagged as such in this session's 19:48/20:40
    reports).
  - `cron/tenant-health/status-coverage-divergence.test.ts` — the
    self-documented "INVARIANT (RED until fixed)" test, intentionally red
    by design, pre-existing, untouched by this diff.

## Files changed

- `src/app/api/webhooks/stripe/route.ts` — the fix.
- `src/app/api/webhooks/stripe/route.payment-failed-html-injection.test.ts`
  — updated mock to match the new lookup key.
- `src/app/api/webhooks/stripe/route.subscription-id-tenant-match.test.ts`
  — new regression test.

File-only. No push/deploy/DB — this is pure application code, no migration
needed (`stripe_subscription_id` column already exists and is already
populated at signup).
