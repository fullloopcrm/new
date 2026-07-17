# W1 — webhooks/stripe cleaner Connect payout tenant-key fix (2026-07-17 17:37)

Continuation of 16:45's queue item 1 (stripe-onboard tenant-key fix). That
doc's "NOTICED, not touched" section flagged `webhooks/stripe/route.ts` as
having "a second, separate instance of tonight's exact bug class in this same
file" at its `stripe.transfers.create` call (~line 505 then, ~518 now). This
round picked that up as the fresh surface and confirmed + fixed it.

## Fixed

**`webhooks/stripe/route.ts`'s cleaner auto-payout (`checkout.session.completed`
step 4 — `stripe.transfers.create` + NYC-Maid-only `stripe.payouts.create`)
used the module-level no-arg `getStripe()`, i.e. the platform's global
`process.env.STRIPE_SECRET_KEY`, always — never `tenant.stripe_api_key`.**

Same bug class as tonight's earlier `stripe-onboard` fix, and the file even
already gets this right elsewhere for a different code path
(`customer.subscription.deleted`'s `getStripe()` fallback is correctly
platform-only there, since Full Loop's own subscription billing always runs
through the platform account — that one's NOT a bug). The one that IS a bug:
`team-members/[id]/stripe-onboard` creates the cleaner's Connect Express
sub-account under the TENANT's own Stripe account when `tenant.stripe_api_key`
is configured. This webhook then tries to `transfers.create({ destination:
tm.stripe_account_id })` from the PLATFORM's account instead — Stripe returns
resource-not-found, the transfer throws, and the catch block (line ~554) logs
+ opens an `admin_tasks` row (`type: 'payout_failed'`) but the cleaner never
actually gets auto-paid. Silent in the sense that no client/cleaner-facing
signal fires — only an admin task, forever, on every single booking payment,
for any tenant with their own Stripe key configured.

`payment-processor.ts`'s own transfer path (a separate manual/cron payout
route) already uses `getStripe(tenant.stripe_api_key)` correctly — this
webhook's auto-pay-on-checkout path was the one outlier left after tonight's
`stripe-onboard` fix.

Fixed by widening `getStripe()`'s signature to accept an optional key
(`decryptSecret()`-with-plaintext-passthrough, same convention as
`stripe-status.ts`/`payment-processor.ts`), adding `stripe_api_key` to the
existing `tenants(...)` embed on the booking select (it already selected
`telnyx_api_key`/`telnyx_phone` for SMS — just missing this one column), and
constructing a separate tenant-scoped client (`stripeForPayout`) for the
transfer + instant-payout calls only. Left webhook signature verification
(line 68, no-arg) and the subscription-deleted customer lookup (line 772,
`stripe ?? getStripe()`) on the platform key — both correctly platform-scoped,
unrelated to this bug.

**Confirmed the class is now fully closed app-wide**, not just this file —
grepped every `stripe.transfers.create` / `stripe.payouts.create` /
`stripe.accounts.create` / `accountLinks.create` / `stripe.accounts.retrieve`
call site in `src/`:
- `stripe-onboard/route.ts` — fixed earlier tonight (`getStripe(tenant key)`)
- `stripe-status/route.ts` — already correct
- `onboarding-verify.ts` — already correct (takes `stripe_api_key` as a param)
- `payment-processor.ts` — already correct
- `webhooks/stripe/route.ts` — fixed this round

No remaining call site anywhere in the app still defaults to the platform key
for a Connect-account operation.

3 new tests (`route.tenant-payout-key.test.ts`): env-fallback control (no
tenant key — matches most tenants today, so live blast radius was narrow) and
tenant-key-used on the transfer/payout client, verifying the signature client
stays on env while the payout client switches. RED-confirmed via `git apply
-R` on the source diff alone (control passed, tenant-key case failed for the
right reason pre-fix). Reapplied clean. Commit `1b5d104e`.

## NOTICED, not touched — same escalated item as 16:45, still open

`webhooks/stripe/route.ts`'s signature verification still uses ONLY the
single global `STRIPE_WEBHOOK_SECRET` — no per-tenant webhook-secret column
exists anywhere (`tenants` has `stripe_api_key`/`stripe_account_id`, nothing
resembling `stripe_webhook_secret`). Re-confirmed this is unchanged from
16:45's note and still needs Jeff/leader triage before any fix: whether any
live tenant has an independent (non-Connect-sub-account) Stripe account
sending webhooks here, and whether their checkout-confirmation flow already
relies on client-side polling rather than this webhook. Not re-litigating
further this round — same open architectural question, not a one-file patch.

## tenant_domains schema lane

Reconfirmed intact, no drift: 043/055/056/059/068/069 all present.

## Verification

- `git apply -R` RED-confirmed the fix on the source diff alone (not stash —
  worker worktrees share one stash stack, per this session's hook guard).
- `tsc --noEmit`: clean (same 2 pre-existing baseline errors — admin-auth type
  quirk + untracked `sunnyside-clean-nyc/_lib/site-nav.ts`, both unrelated).
- `eslint` on both touched/new files: 0 warnings.
- Full suite: 584/584 files, 3160/3161 tests (1 pre-existing expected-fail),
  zero regressions.
- File-only, no push/deploy/DB.
