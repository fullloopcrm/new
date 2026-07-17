# W4 broad-hunt — 2026-07-17 17:45 — categorization_patterns key mismatch + stale-client-count outreach bug

Queue (17:37 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface. (2) continue whichever surface (1) opens up.
(3) keep gap/fluidity current.

## (1) Fresh ground: the last two unreviewed Postgres RPC groups, then pivoted to JS-side counter bumps

Per the 17:30 checkpoint's remaining next-target: "the remaining Postgres RPC
functions as a group: `seo_*`... `cpa_token_bump_usage`... not yet reviewed
for the same missing-function-vs-caller or TOCTOU shapes."

**`cpa_token_bump_usage`** (`039_atomic_ledger_and_hardening.sql`): a single
`UPDATE ... SET use_count = COALESCE(use_count,0) + 1` -- genuinely atomic,
no read-then-write in application code. The route's own comment ("avoids
read-then-write races") is correct. Clean, no action.

**`seo_*` family**: `seo_refresh_rollup` is a plain non-concurrent matview
refresh (explicitly documented as such, cron-only). `seo_run_detection` has
two `CREATE OR REPLACE FUNCTION` definitions across two migration files --
looked like a duplicate-definition bug at first glance, but the second
(`2026_07_05_seo_competitors.sql`) is a deliberate, commented override that
narrows the `DELETE ... WHERE status='open'` to just the GSC-owned issue
types, specifically so the weekly SERP-scan-produced `competitor_gap` issues
survive the daily GSC detection run's reset. Intentional, not a bug.

Both remaining RPC groups from the 17:30 checkpoint are now clean -- the
`comhub_get_or_create_*` / `seo_*` / `cpa_token_bump_usage` Postgres RPC
sweep is complete for this session.

With the RPC surface exhausted, pivoted to the JS-side version of the same
bug class: read-then-write counter bumps done in application code instead
of SQL. Grepped `app/api/` for `+ 1` near count/total/balance-shaped field
names (`grep -rnE "\+\s*1\b" | grep -iE "count|total|balance|..."`). Found
~20 hits; most are in-memory aggregation locals (safe). Two were real DB
writes worth digging into.

## (2) Continuing the surface: two real findings

**Finding A -- `categorization_patterns` lookup key doesn't match its unique
index (not a race, a 100%-reproducible mismatch).** Three call sites
(`bank-transactions/[id]` PATCH, `bank-transactions/accept-suggestions`,
`finance/receipts/attach`) all "bump or create" a learned bank-description
category the same way: `SELECT ... WHERE tenant_id=X AND pattern=Y AND
coa_id=Z`, insert if not found. But the table's only unique index
(`idx_categ_patterns_tenant_pattern`, `032_ledger.sql`) is on
`(tenant_id, pattern)` -- **no `coa_id` column**. `categorize-ai.ts`'s
`suggestCoa` (the read side) confirms the intended shape: it fetches all
patterns per tenant keyed by `pattern` text alone, with no coa_id
dimension -- one learned category per description, not one per
(description, category) pair.

So the moment the same normalized description gets categorized to a
*different* account than whatever's already on file (an entirely ordinary
sequential re-categorization, e.g. correcting a wrong auto-suggestion --
no concurrency needed), the 3-column SELECT finds nothing, falls to the
insert branch, and that insert collides with the 2-column unique index.
**None of the three call sites checked that insert's `error`** -- so the
23505 never threw, never surfaced as a response error, and never got
caught by any try/catch. It just silently vanished: `hit_count` quietly
stopped incrementing (and the mis-keyed row was never corrected) the first
time any recurring vendor got recategorized. This degrades the
self-learning categorization feature's suggestion quality over time with
zero observability -- the same "destructures only `data`, discards `error`"
shape as several other findings this session (`portal/messages`, etc.),
just on a write instead of a read.

**Fix** (all 3 sites, same shape): drop `.eq('coa_id', ...)` from the
lookup so it matches the real unique key and the read side's own
assumption. Left the existing row's `coa_id` untouched on a hit -- bumping
only `hit_count`/`last_used_at` -- rather than overwriting it to the newly
chosen category. Whether a manual recategorization *should* retrain the
learned mapping is a genuine product question (a one-off miscategorization
would otherwise flip the whole learned association), deliberately left
open rather than assumed, matching this session's precedent for
`post-labor.ts`/`postDepositToLedger`. Added defense-in-depth for the
*genuine* concurrent case too (two requests racing to insert the same
brand-new pattern): catch 23505 on insert, bump the winner's row -- same
house idiom as `sales-contacts.ts` / `clients/import` / `finance/bank-import`.

RED-confirmed via `git apply -R` against 3 new regression tests (one per
call site) -- old code returned success but left `hit_count` unchanged.
15/15 relevant tests green after. Committed as
`fix(finance/categorization): fix pattern-lookup key mismatch, drop
hit_count silently`.

**Finding B -- `deals/at-risk` POST (action: `touch`) trusts a
client-supplied counter.** `outreach_count: (current_count || 0) + 1` where
`current_count` comes straight from the request body, never read
server-side. This is a wider staleness window than a normal race: a sales
rep loads the "workable client" list, reads it, decides to place a call,
clicks "touch" -- an entire human-think-time gap during which another touch
(same rep in another tab, or a teammate) can land first. The stale value
silently drops that intervening touch. Grepped the whole `src/app/`
tree for any frontend caller of this endpoint/action -- **none exists yet**,
so this is currently latent rather than actively exploited; still fixed
now since it's the same bug class and cheap, before a frontend gets wired
to it. Fix: drop `current_count` from the request entirely, read
`outreach_count` fresh server-side before incrementing. RED-confirmed via
`git apply -R` -- old code under-incremented by exactly the dropped touch.
Committed separately as `fix(deals/at-risk): stop trusting client-supplied
outreach_count`.

## Reviewed and confirmed clean (same surface, no action needed)

- **`health-check` cron `retry_count`**: already correctly claim-guarded --
  the UPDATE re-checks `status='failed'` (compare-and-swap) before
  incrementing, with an explicit comment calling out the overlapping-cron
  scenario. Already matches the house idiom.
- **`invoices|quotes|documents` public-token `view_count` bumps**: plain
  read-then-write counters with no unique-index collision risk (unlike
  Finding A, there's no key mismatch -- just an ordinary lost-increment race
  under true concurrent hits). Cosmetic analytics only, same accepted-risk
  class as other simple counters left untouched elsewhere this session --
  not treated as a new bug.
- **`recurring-expenses` cron `failure_count`**: cron-internal, no
  concurrent caller path found; not dug into further given the two real
  findings above already fill this pass's budget.

## Verification

- `npx tsc --noEmit --pretty false`: same 2 pre-existing unrelated errors as
  every prior report this session (`bookings/broadcast/route.xss.test.ts`,
  `sunnyside-clean-nyc/_lib/site-nav.ts`) -- no new TS diff.
- Full `npx vitest run`: 596 passed / 2 pre-existing unrelated failures
  (`cron/generate-recurring/route.duplicate-occurrence-race.test.ts`,
  `cron/tenant-health/status-coverage-divergence.test.ts` -- the latter is
  an explicitly-named "RED until fixed" invariant-lock test from a prior
  pass, neither touched by this diff) -- confirmed pre-existing via `git
  diff --stat` showing zero changes under `cron/` this pass.

No push/deploy/DB write this pass. Two commits, both file-only TS + test
changes.
