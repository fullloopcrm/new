# Fixed: 3 Stripe webhook side effects had no dedup guard against Stripe's own documented at-least-once redelivery — and the prior session's "already hardened" exclusion for this route was only partially true

**From:** W1, 01:16 order item (1) (fresh-ground surface) + item (2) (continuation).
**Scope:** closes the one webhook surface last round's sweep doc
(`w1-telegram-resend-webhook-redelivery-dedup-2026-07-18-0020.md`, "Not yet
independently swept" section) excluded by claiming it was "already hardened
... confirmed again by exclusion (no change needed, not touched)."

## Correction to that prior claim

That exclusion was true for the parts it checked (`checkout.session.completed`'s
`stripe_session_id` UNIQUE constraint, and the ledger posts via
`journalEntryExists`) but did not audit every branch in
`src/app/api/webhooks/stripe/route.ts`. It wasn't wrong about what it looked
at — it just didn't look at the whole file. Flagging the flip per honesty
rule 26 rather than quietly re-scoping the sweep.

## Why this surface

Same redelivery-dedup class fixed this session on Telnyx, Telegram (x3),
Resend, and Clerk: Stripe's own webhook docs state events may be delivered
more than once (retries on non-2xx/timeout, plus manual Dashboard re-sends),
and recommend deduping on `event.id`. `find src/app/api/webhooks -type f`
confirms `stripe`/`stripe-platform` were the last two routes in this
directory not explicitly re-verified branch-by-branch this session.

## Fixed

Audited every `case` in the 857-line handler against Stripe's redelivery
guarantee. Three branches had zero idempotency guard, all unconditional
inserts/sends that duplicate on a redelivered event:

- `charge.dispute.created` — inserts a fresh `admin_tasks` "chargeback" row
  every delivery. A redelivered dispute-opened event spams a duplicate
  high-priority task for the same dispute.
- `payment_intent.payment_failed` — inserts a fresh `notifications` row AND
  a fresh `admin_tasks` row every delivery.
- `invoice.payment_failed` — re-sends the admin "subscription payment
  failed" email every delivery.

Everything else in the file was already covered: `checkout.session.completed`
by `payments.stripe_session_id` UNIQUE (existing dedicated idempotency test),
`charge.refunded`/`charge.dispute.closed` by `journalEntryExists` on the
ledger post plus the payment/booking status-sync guard added earlier this
session, `account.updated`/`invoice.paid`/`customer.subscription.deleted` by
being plain re-derived-state UPDATEs (naturally idempotent, reprocessing is
harmless).

**Fix:** insert-first-claim on a new `stripe_webhook_events(event_id text
PRIMARY KEY)` table, keyed on Stripe's own `event.id`, claimed once before
the `switch` runs — same shape as `clerk_webhook_events`/
`resend_webhook_events`/`telnyx_webhook_events`: one whole-handler claim
instead of scoping to only the 3 unsafe branches, harmless no-op overhead on
the branches that were already idempotent, and it covers any future case
that forgets its own guard. `23505` short-circuits as an idempotent no-op
before any handler runs; any other claim error (infra hiccup on the dedup
table itself) falls through and processes anyway, so a transient DB blip
can't silently drop a real Stripe event. Migration
`2026_07_18_stripe_webhook_events_dedup.sql`, file-only, not applied. No
backfill — brand-new table.

## Self-caught issue during verification

Adding the claim call broke 2 of 35 existing tests in this route's suite:
`route.payer-email-wildcard.test.ts` carries its own narrow hand-rolled
Supabase stub (not the shared `ledger-supabase-fake`) that never had a
reason to support `.insert()` before. Fixed by adding a no-op `insert()` to
that stub — the test's actual assertions (payer-email ilike wildcard
escaping) are unrelated to this fix and untouched.

## Verification

`npx tsc --noEmit` — 0 new errors (5 pre-existing unrelated baseline errors
carried from every round this session: stale `.next` admin-auth types,
cron/outreach + cron/payment-reminder pre-existing test-signature
mismatches, untracked `sunnyside-clean-nyc/site-nav.ts`; confirmed none
touch `webhooks/stripe`). `npx vitest run src/app/api/webhooks/stripe/` — 6
files, 35/35 passed (was 33/35 before the stub fix above). Broader regression
check `npx vitest run src/lib/finance/ src/app/api/webhooks/` — 30 files,
178/178 passed, zero regressions elsewhere in the finance/webhook surface.

No dedicated duplicate-delivery test added this round (unlike the Telegram/
Resend sweep) — the fake-store convention established there deliberately
does not enforce PK uniqueness for file-only-prep dedup tables (confirmed:
none of the Telnyx/Telegram/Resend/Clerk dedup tables have one either), so a
real test would need the actual DDL applied, which is leader/Jeff-gated.

## Not yet independently swept

`stripe-platform/route.ts` — its own doc comment claims idempotency via
`createTenantFromLead`'s `alreadyConverted` check; read but not
independently re-derived this round, carrying forward as unverified rather
than re-asserting it's fine. Every route under `src/app/api/webhooks/*` has
now been either fixed or independently re-checked branch-by-branch for the
redelivery-dedup class.

## tenant_domains schema lane

Reconfirmed intact, untouched this round — this round's fix is a
webhook-layer dedup table (`stripe_webhook_events`), outside
`tenant_domains`.

File-only, no push/deploy/DB run this round.
