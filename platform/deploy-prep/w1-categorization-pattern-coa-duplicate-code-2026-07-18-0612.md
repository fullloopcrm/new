# Gap/fluidity doc — two unswept unique-constraint collision sites (2026-07-18, ~06:12)

**Session:** P1/W1 (schema+backfill lane, broad fresh-ground sweep this round)
**Commit:** 662853c5 (fix + tests, single commit)
**Scope:** file-only, no push/deploy/DB

## Why this round

The prior round (clients.pin sweep, commit `7fb2b201`, doc
`w1-clients-pin-collision-retry-sweep-2026-07-18-0600.md`) explicitly flagged
under "Noticed (not fixed, flagging per scope discipline)":

> Did not do a full second sweep of *every other* `CREATE UNIQUE INDEX` in
> the repo for this same "constraint exists, some app-layer insert(s) never
> got a retry" pattern — this round was scoped specifically to
> `idx_clients_tenant_pin_unique`. A broader sweep across every
> unique-constrained column is a separate, larger pass.

This round did that broader pass: grepped every `CREATE UNIQUE INDEX` /
`ADD CONSTRAINT ... UNIQUE` across `src/lib/migrations/*.sql`, classified
each by whether the constrained value is (a) a caller-typed identifier
(invoice_number, quote_number, chart-of-accounts code — same family as the
already-fixed referral_code/clients.pin), (b) an idempotency/dedup key
(webhook events, journal_entries source_id, payouts, notifications — these
already correctly no-op on 23505 across the codebase, confirmed by grep),
or (c) a derived/computed key whose write-side logic doesn't actually match
the constraint's column set (the new class found this round).

## Findings

### 1. `categorization_patterns` — pattern corrections silently discarded (real, fixed)

**File:** `src/app/api/finance/bank-transactions/[id]/route.ts` (PATCH handler,
"Update learning pattern" block)

`idx_categ_patterns_tenant_pattern` (migration with `categorization_patterns`)
constrains `(tenant_id, pattern)` — **two columns**. `categorize-ai.ts`'s
cascading suggestion engine reads it the same way: `opts.patterns.find(p =>
p.pattern === norm)`, i.e. it expects exactly one row per pattern and treats
that row's `coa_id` as the current best-known category.

The write side didn't match: its existence check filtered on
`.eq('tenant_id', tenantId).eq('pattern', pattern).eq('coa_id', body.coa_id)`
— three columns. So the very first time a user corrected an
already-learned pattern to a *different* category (the entire point of the
"learning" feature — the AI suggests, the user overrides when wrong), the
existence check came back null (the existing row's `coa_id` didn't match
the new one), the code fell into the `insert` branch, and that insert
collided with the real 2-column unique index — a **guaranteed** 23505 on
every single correction, not a rare race.

Worse: the insert's result was never captured or checked at all —
`await supabaseAdmin.from('categorization_patterns').insert({...})` with no
destructuring. The 23505 vanished into nothing; the route still returned
`{ ok: true }` (the main journal-entry write had already succeeded), so
there was zero surface-level indication anything failed. The practical
effect: once a pattern was learned, a user's correction to it never stuck —
`categorize-ai.ts` kept resurfacing the stale, wrong suggestion on every
future matching transaction, forever, silently.

**Fix:** look up the existing row by `(tenant_id, pattern)` only (matching
the real constraint and the read side). If found and `coa_id` matches →
increment `hit_count` (unchanged behavior). If found and `coa_id` differs →
`UPDATE` that row's `coa_id` (the correction), resetting `hit_count` to 1 —
the old count measured confidence in the *old* mapping, carrying it forward
into a brand-new one would misrepresent confidence. If not found → insert,
unchanged. The write's error is now captured and logged
(`console.error`) instead of discarded, matching this codebase's convention
elsewhere for non-fatal best-effort side effects.

### 2. `chart_of_accounts.code` — bare 500 on a real duplicate (real, fixed)

**File:** `src/app/api/finance/chart-of-accounts/route.ts` (POST handler)

`idx_coa_tenant_code` constrains `(tenant_id, code)`. `code` is a value the
finance user types in when creating an account (e.g. "6100" for a new
expense category) — the same shape as `invoices.invoice_number` and
`quotes.quote_number`, both of which this session already fixed earlier
(`Pre-fix this threw the raw 23505 as an unhandled 500...` comments in
`invoices/route.ts` / `quotes/route.ts`) with a 409 + friendly message when
the caller-supplied value collides. `chart_of_accounts` was the third
sibling in this exact family and was the one left behind.

Pre-fix: `if (error) throw error` unconditionally, caught generically by the
route's outer `catch` and turned into `{ error: 'Failed' }` with status 500.
Confirmed this is not just a theoretical concern —
`src/app/dashboard/finance/accounts/page.tsx` does
`setErr((await res.json()).error || 'Failed')` and displays it verbatim, so
a finance user who fat-fingers a code that's already in their chart of
accounts gets a bare "Failed" toast with no hint about *why*, no different
than any other unrelated server error.

**Fix:** same convention as invoices/quotes — catch `error.code === '23505'`
specifically and return `409 { error: 'That account code is already in use' }`
before falling through to the generic 500. Not a retry (unlike PIN/token
mints, a chart-of-accounts code is a deliberate choice the user should pick
differently themselves, not have silently substituted).

## Also checked this round, confirmed clean (no fix needed)

- **`domain_notes`** (`idx_domain_notes_tenant_domain_unique`) — POST already
  uses `.upsert(..., { onConflict: 'tenant_id,domain' })`. Correct, no gap.
- **`entities`** (`idx_entities_tenant_default`, is_default partial unique) —
  POST unsets any existing default first, then inserts; not airtight against
  a true concurrent double-submit but is a pre-existing accepted pattern
  (single-admin-action, not public-facing), out of scope for this pass.
- **`bank_import_batches`** (sha256 unique) — POST already pre-checks and
  returns a clean 409 ("This exact file was already imported") before the
  insert. No gap.
- **`idx_team_members_tenant_pinhash`** — mirrors `team_members.pin`
  (already fixed with retry logic in an earlier round this session); `pin_hash`
  is derived from the same regenerated pin in the same retry loop, so a
  collision here is the same event already handled, not a separate site.
- **`categorization_patterns`'s own insert-vs-race** in `finance/bank-import`
  and `categorize-ai.ts`'s `suggestPending()` bulk path — both are read-only
  or single-writer batch contexts, not the interactive per-transaction
  correction path; not touched.
- All other `CREATE UNIQUE INDEX` sites repo-wide (webhook event dedups,
  `journal_entries` source_id, `team_member_payouts`/`payroll_payments`
  idempotency, `referral_commissions`, `notifications`/`schedule_issues`
  dedup-once, `seo_*` tables) are system-generated idempotency keys, not
  caller-typed identifiers or misaligned-column derived keys — every one
  already 23505-catches as a correct no-op (grepped and spot-verified a
  sample of each; this is the existing, correct convention across the whole
  webhook/cron layer from earlier sessions).

## Verification

- `tsc --noEmit --pretty false`: same 4 pre-existing baseline errors only
  (admin-auth route type gen, cron/outreach + cron/payment-reminder tests,
  sunnyside-clean-nyc site-nav — all unrelated to these 2 files), 0 new.
- New tests (2 files, 6 tests):
  - `route.categorization-pattern-fix.test.ts` — fresh-pattern insert,
    same-category hit_count increment, **cross-category overwrite (the bug
    repro: asserts exactly 1 row survives, not 2, with `coa_id` updated and
    `hit_count` reset to 1)**, and a second/different transaction's
    brand-new pattern still inserting normally (proves the fix didn't
    over-collapse distinct patterns).
  - `route.duplicate-code.test.ts` — duplicate code → 409 with the specific
    message + confirms no duplicate row landed; unique code still succeeds
    (200, row created).
- Full `npx vitest run`: 662/662 files, 3450 passed + 1 pre-existing
  expected-fail (3451 total), 0 regressions (was 660/660, 3444+1 before this
  pass — net +2 files/+6 tests, exactly the new coverage added).

File-only, no push/deploy/DB. Both production files fixed are outside the
`tenant_domains` schema+backfill lane (P1-SCHEMA-SPEC.md); that lane's own
work (055/056/068/069 migrations) is complete and untouched this round.

## Noticed (not fixed, flagging per scope discipline)

- `categorize-ai.ts`'s bulk `suggestPending()` reads `categorization_patterns`
  once per tenant-scan and never re-reads mid-loop — if a huge backlog of
  pending transactions is processed in one run and an early transaction's
  manual categorization (via the now-fixed PATCH path, if run concurrently)
  changes a pattern the bulk job already cached, the bulk job would use the
  stale in-memory value for the rest of its pass. Low-probability overlap
  (bulk suggest is a distinct action from interactive per-transaction
  correction) and not a data-loss issue (worst case: one stale suggestion,
  correctable), so left alone — flagging in case a future pass wants to
  address it.
- Did not extend this pass to non-unique-constraint "silent insert error"
  sites in general (only the ones directly tied to a unique-constraint
  collision were in scope this round) — a broader "every `.insert()` whose
  result is never captured, regardless of constraint" sweep would be a
  separate, larger pass across the whole `src/app/api` tree.
