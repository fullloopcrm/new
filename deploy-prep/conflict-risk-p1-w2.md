# Conflict-risk report — p1-w2 → origin/main

**Refreshed:** 2026-07-13 16:38 EDT by W4 (fleet-wide refresh, LEADER order
16:34). **Original report (below, preserved) was by W2, 2026-07-12, and found
ZERO conflicts.** That is no longer true — see New Conflicts below.
**Method:** `git merge-tree --write-tree origin/main origin/p1-w2` (git 2.39
real merge-ort simulation, not the legacy 3-arg plumbing tool used in the
2026-07-12 pass). Read-only — no ref updated, no working tree touched,
nothing merged/pushed.
**Merge base (unchanged):** `2cca5daa0fe953b8be89b541ff7e7488c4bb4a14`
**origin/main HEAD:** `6a052a58` · **p1-w2 vs merge-base:** 344 files changed
(up from 88 commits/lower file count at the 07-12 pass) · **origin/main vs
merge-base:** 81 files changed · **files touched by both sides:** 4 ·
**real conflicts: 3 — ALL NEW since the 2026-07-12 pass**

## ⚠ Result: 3 NEW conflicts (was 0)

New commits landed on `p1-w2` since the last audit that collide with work
`main` had already done. This is a genuine regression in mergeability, not
measurement noise — confirmed by diffing p1-w2 against the same unchanged
merge-base both times.

Root cause: 3 specific commits landed on `p1-w2` after the 07-12 audit:

```
b73c936a fix(payments): idempotencyKey audit — instant payouts, refunds, Connect account/customer create (P1/W2 c)
02980084 fix(payments): Stripe idempotency key on cleaner payout transfers (P1/W2 c)
5a3df581 fix(security): rate-limit-db fail-closed for 9 auth callers (cherry-pick 038428f8)
```

### 1. `platform/src/lib/payment-processor.ts` — NEW, and the important one

**Why:** Both `main` and `p1-w2` independently fixed the same
double-payout/duplicate-transfer risk on the cleaner auto-pay path, but with
**fundamentally different, non-overlapping mechanisms**:

- **`origin/main`**: claim-before-transfer via a `claimCleanerPayout()` /
  `finalizeCleanerPayout()` / `releaseCleanerPayout()` triple, backed by a
  `UNIQUE(tenant_id, booking_id)` DB index. Claims the payout slot *before*
  calling Stripe; a unique-index conflict means another path already claimed
  it, so no transfer happens. Handles the concurrency window at the DB layer.
- **`p1-w2`** (new commit `02980084`): adds Stripe `idempotencyKey:
  \`payout-${bookingId}\`` to the `transfers.create()` and
  `payouts.create()` calls themselves. Handles duplicate-suppression at the
  Stripe API layer — a retried/duplicated call with the same idempotency key
  returns the original result instead of creating a second transfer.

**These are not interchangeable and not automatically compatible.** Main's
approach guards against two *concurrent* code paths racing to pay the same
booking (e.g. webhook + manual checkout landing at the same time — the DB
claim is the arbiter). Idempotency keys guard against the *same* code path
being invoked twice with the same logical operation (e.g. a webhook retry) —
but two genuinely concurrent callers with the same booking ID would generate
the same idempotency key too, so idempotency keys **also** happen to cover
the race main's claim mechanism covers, just via a different backend
(Stripe's dedup window vs. a Postgres unique index). The real question for
whoever integrates this is whether to run **one** mechanism or **both**:
running both is strictly safer (belt-and-suspenders) but means reconciling
two different code shapes in the same function, not a trivial "pick a side."

**Suggested resolution:** do not blindly take one side. Recommend keeping
`main`'s `claimCleanerPayout` DB-claim mechanism (it also handles the
ledger/payout-row bookkeeping main's side does that p1-w2's simpler version
doesn't) **and** layering p1-w2's `idempotencyKey` onto the `stripe.transfers.create`
/ `stripe.payouts.create` calls inside main's already-claimed branch. This
needs a human decision, not an automatic merge — flag for whoever runs the
actual integration to review both diffs side by side.

### 2. `platform/src/app/api/webhooks/stripe/route.ts` — NEW, same root cause as #1

**Why:** Identical pattern to #1, in the webhook handler's cleaner-payout
branch instead of the direct payment-processor path. `main` uses
`claimCleanerPayout`/`finalizeCleanerPayout` before transferring; `p1-w2`
(same commit `02980084`) adds `idempotencyKey: \`payout-${bookingId}\`` and
`idempotencyKey: \`payout-instant-${bookingId}\`` directly on the Stripe
calls, and writes to `team_member_payouts` via a plain `.insert()` instead of
going through `finalizeCleanerPayout`.

**Suggested resolution:** same as #1 — this should be resolved consistently
with #1 since it's the same underlying design decision applied to a second
call site. Do not resolve these two files independently of each other.

### 3. `platform/src/app/api/team-portal/auth/route.ts` — NEW, same root cause as w1/w4

**Why:** Same PIN-enumeration rate-limit conflict documented in
`conflict-risk-p1-w4.md` and `conflict-risk-p1-w1.md`. New commit
`5a3df581` (cherry-picked from `038428f8`) added `{ failClosed: true }` to
the *same vulnerable pre-lookup call* `main` deletes — byte-identical change
to what p1-w1 independently picked up (both are cherry-picks of the same
source commit `038428f8`).

**Suggested resolution:** identical to w1/w4 — take `origin/main`'s
post-failure dual-bucket version; p1-w2's `failClosed` addition doesn't fix
the enumeration bug, it's orthogonal hardening on code main is removing.

## Net assessment — escalate #1/#2 specifically

Conflicts #1 and #2 are the most consequential new finding across this whole
refresh: two lanes independently hardened the *same* payment-duplication
vulnerability with genuinely different mechanisms, and picking wrong (or
picking only one without considering whether both should compose) has real
money-movement risk if resolved carelessly during integration. This is worth
flagging to Jeff specifically as part of the Q3 decision, not just noting as
routine merge noise. Conflict #3 is routine (same low-risk resolution as the
other two lanes).

---

## Original 2026-07-12 report (superseded — preserved for history)

**Generated:** 2026-07-12 18:xx EDT, by W2 (file-only, no push/deploy/DB)
**Method:** `git merge-tree $(git merge-base origin/main p1-w2) origin/main p1-w2` (textual diff scan) + verified with a real `git merge --no-commit --no-ff origin/main` dry-run in this worktree, then `git merge --abort` to restore state (no commits, no push).

merge-base: `2cca5daa0fe953b8be89b541ff7e7488c4bb4a14`
p1-w2 is 88 commits ahead of merge-base; origin/main has diverged with its own commits since that point.

### Result: ZERO merge conflicts (at that time)

`git merge --no-commit --no-ff origin/main` completed with **"Automatic merge went well; stopped before committing as requested"** — no `CONFLICT` sections, no `UU` (unmerged) entries in `git status`.

### FYI — 2 files touched by both branches, auto-merged cleanly (at that time)

| File | Why both sides touched it | Suggested resolution owner |
|---|---|---|
| `platform/src/app/api/team-portal/checkout/route.ts` | p1-w2 converted the route to `tenantDb()` (drops manual `.eq('tenant_id', ...)` filters, relies on auto-scoping). main (`b8e4c800`) added a claim-before-transfer double-payout guard (`cleanerAlreadyPaid`) further down the same file. Hunks don't overlap. | W2 (tenantDb owner) — sanity-check that the payout guard still runs against a `tenantDb`-scoped booking read after integration. |
| `platform/src/app/api/webhooks/stripe/route.ts` | p1-w2 (`cba595ea`, this branch's own earlier history) added an idempotency check on the payment-insert error path. main (`b8e4c800`) added the same claim-before-transfer payout guard as above, in a different part of this file. Hunks don't overlap. | Whoever owns payments/webhooks on main — re-run `platform/src/app/api/webhooks/stripe/*.test.ts` post-merge to confirm both idempotency guards compose correctly. |

**Note the irony:** this file (`webhooks/stripe/route.ts`) was flagged here as a *clean* auto-merge on 07-12. New commits since then turned it into a real conflict (see New Conflicts #2 above) — exactly the kind of drift this refresh exists to catch.
