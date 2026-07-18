# A won dispute never reversed its own chargeback loss (2026-07-18 01:12)

## Fresh-ground discovery (surface (1) opened this up)

Continuing directly off the refund-status-sync fix immediately before this:
while reading `charge.dispute.created`'s handler (`postChargebackToLedger`,
`DR 6110 Chargebacks / CR 1050`) to confirm it wasn't affected by the refund
change, `grep -n "case '"` across the whole webhook switch showed no
`charge.dispute.closed` (or `charge.dispute.funds_reinstated`) handler at
all. Stripe's own `Dispute.status` field documents `'won'` as a terminal
status — when a merchant wins a dispute, Stripe returns the disputed funds —
but nothing in this codebase ever posted a reversing entry.

Same defect shape as the fix immediately before it (a webhook posts a
one-directional money entry with no counterpart for the case where the money
comes back), just on the chargeback rail instead of the refund rail. Net
effect: **every dispute the merchant has ever won still shows as a permanent
loss in the ledger**, understating revenue/net income indefinitely, with no
existing code path that could ever correct it.

## Fix (file-only, no push/deploy/DB)

- **`src/lib/finance/post-adjustments.ts`** — added
  `postChargebackReversalToLedger(opts: { tenantId, sourceId, amountCents,
  memo? })`: posts `DR 1050 Undeposited Funds / CR 6110 Chargebacks` (the
  exact reverse of `postChargebackToLedger`), keyed `source=
  'chargeback_reversal'` under the SAME `sourceId` (the dispute id) as the
  original chargeback but a different `source` value, so it can't collide
  with — or be mistaken for a duplicate of — the original loss entry.
  Guarded: refuses to post (`reason: 'no_original_chargeback'`) unless the
  original `source='chargeback'` entry for that dispute id actually exists,
  so a dispute resolved 'won' for a tenant/period with no recorded
  chargeback (e.g. tenant onboarded after the original event) can't create
  an orphan reversal that credits 6110 with nothing to cancel out.
- **`src/app/api/webhooks/stripe/route.ts`** — new `charge.dispute.closed`
  case: resolves the tenant via the same `tenantFromPaymentIntent` used by
  `charge.dispute.created`, and only when `dispute.status === 'won'` calls
  `postChargebackReversalToLedger`. `'lost'` needs no action (the original
  entry is already correct); other terminal/non-terminal statuses
  (`warning_closed`, etc.) move no money and are left alone.

## Verification

- New tests in `src/lib/finance/money-adjustments.test.ts`
  (`postChargebackReversalToLedger — dispute won, reverse the loss`, 3
  cases, run against the real ledger spine + in-memory RPC fake, same
  convention as every other case in that file): refuses an orphan reversal
  with no original chargeback; posts the correct DR 1050/CR 6110 (balanced,
  and nets the chargeback account back to zero across both entries when
  summed); refuses zero/negative amounts and is idempotent by dispute id.
- New tests in `src/app/api/webhooks/stripe/refund-dispute-wiring.test.ts`
  (`charge.dispute.closed → postChargebackReversalToLedger wiring`, 4
  cases): won → reverses, keyed by the same dispute id + amount; lost → no
  reversal; non-final status (`warning_closed`) → no reversal; unresolved
  tenant → no reversal. All existing tests in both files (11 + 3 chargeback-
  created cases) still pass unmodified.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  as every pass this session).
- `eslint` on all touched files: 0 errors, 0 new warnings.
- Full suite: `npx vitest run` — 623/623 files, 3338 passed + 1 pre-existing
  expected-fail (net +7 tests over the refund-sync fix immediately before
  this, 0 new files, 0 regressions).

## Not fixed / flagged, not touched

- **Operational dependency, not a code gap**: `charge.dispute.closed` must
  actually be in the Stripe webhook endpoint's subscribed event list for
  Stripe to ever deliver it. That subscription list lives in the Stripe
  Dashboard (or via `stripe.webhookEndpoints.create/update`'s
  `enabled_events`), not in this repo — grepped for
  `webhookEndpoints`/`enabled_events` and found only a read-only listing in
  `onboarding-verify.ts` with no event-type assertions. This fix is correct
  and tested, but inert until the leader/Jeff confirms (or adds)
  `charge.dispute.closed` in each tenant's/the platform's Stripe webhook
  endpoint config. Flagging explicitly rather than assuming it's already
  subscribed.
- Did not touch the `admin_tasks` row opened by `charge.dispute.created` —
  resolving/closing it when the dispute is won would be reasonable follow-up
  polish, but there's no dispute-id column on `admin_tasks` to match against
  (only `related_type`/`related_id`, which points at the booking, not the
  dispute), so doing it correctly would need its own migration. Left as a
  Noticed item, not a money-accuracy bug.
- Did not backfill historical won disputes that are still sitting as losses
  in any tenant's ledger from before this fix — file-only/no-DB per standing
  rules; a one-time correction the leader/Jeff can run once this lands,
  scoped to tenants with dispute history.
- tenant_domains schema lane reconfirmed intact, no drift.

File-only. No push/deploy/DB.
