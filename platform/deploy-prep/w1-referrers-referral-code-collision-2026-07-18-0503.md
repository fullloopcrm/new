# W1 gap/fluidity: referrer signup's auto-generated referral_code had no collision retry

**Date:** 2026-07-18 05:03
**Surface:** `POST /api/referrers` (public, unauthenticated referral-program signup form)

## The bug

`referrers_code_unique UNIQUE (tenant_id, referral_code)` is a real DB
constraint (`src/lib/migrations/019_referral_commissions.sql:24`). But
`generateRefCode(name)` in `src/app/api/referrers/route.ts` drew from a
4-letter name-prefix (`name.replace(/[^a-zA-Z]/g,'').slice(0,4).toUpperCase()`)
plus only ~900 possible 3-digit suffixes (`Math.floor(100 + Math.random()*900)`)
— a much smaller space than a random UUID, and one where two referrers
sharing a common first-name prefix (many "John"/"Joan"/"Joann"-family names
all reduce to `JOHN`/`JOAN`) collide with real, non-negligible probability as
a tenant's referral program grows. The insert had **zero retry** — a
collision threw the raw `23505` up as an unhandled 500 straight to a real
person filling out a public signup form, silently dropping their signup.

This is the same bug class already fixed three times earlier this session
for `clients.pin` / `team_members.pin` (see `randomClientPin()` +
`MAX_CLIENT_PIN_ATTEMPTS` in `client-auth.ts`, and POST /api/team's retry) —
an auto-generated value drawn from a narrow space, backed by a real unique
constraint, minted with no collision handling on a path a real person hits.

## The fix

`src/app/api/referrers/route.ts` — wrapped the insert in the same
regenerate-and-retry loop already established for `quotes.quote_number` /
`invoices.invoice_number` (`quotes/route.ts`, `invoices/route.ts`):
`MAX_CODE_ATTEMPTS = 5`, retry only on `23505`, regenerate a fresh code each
attempt, and return a `409` (not a raw `500`) if every attempt in the budget
still collides — same idiom, same severity tier as the quote/invoice number
generators.

## Continuation checked (closes the class, no fix needed)

Grepped every other `generate*Code`/`generate*Token`/`generate*Id` helper in
`src/lib` and `src/app/api` for the same shape (narrow-space value + real
unique constraint + no retry):

- `invoice.ts`'s `generateInvoicePublicToken`/`generateInvoiceNumber` and
  `quote.ts`'s `generatePublicToken`/`generateQuoteNumber` — already
  retry-protected (pre-existing, this session didn't touch them).
- `client/book/route.ts`'s `generateCleanerToken` — `randomBytes(24)`
  (192 bits), no realistic collision risk, no unique-constraint match found
  in migrations. Clean.
- `pin-reset/route.ts`'s `generateCode` / `portal/auth/token.ts`'s
  `generateCode` — scoped per `member_id`/session, not globally unique;
  collision across two different members is a non-event (verification
  matches on `member_id` + `code` + `used` + `expires_at`, not `code` alone).
  Clean.
- `marketing/combos.ts`'s slug generators — deterministic from
  industry/metro inputs, not random. Not this class.

No other live instance of this bug found.

## Side-finding, flagged not fixed

`POST /api/referrals` (a **different** table, `referrals` — admin-only,
`requirePermission('referrals.create')` gated, used for client-to-client
referral tracking, not the public `referrers` affiliate program) also mints
`referral_code` via `Math.random()` with no retry. Could not confirm a
`referrals.referral_code` unique constraint exists — the `referrals` table
predates this repo's tracked migrations (no `CREATE TABLE referrals` found
in `migrations/*.sql` or `src/lib/migrations/*.sql`). Even if a constraint
exists, severity is much lower than the public-signup case fixed above: it's
an internal staff action behind a permission gate, not a real prospect's
one-shot public form submission — a staff member hitting a rare collision
can just retry the create manually. Left untouched; worth a future pass if
the underlying table's constraints get confirmed.

## Verification

- New test file: `src/app/api/referrers/route.referral-code-collision.test.ts`
  (3 tests) — uses the shared `createFakeSupabase` fixture's
  `_addUniqueConstraint('referrers', 'referral_code')` support, with
  `Math.random` spied to deterministically force/avoid the collision.
  Includes an insert-attempt-count assertion (`randomSpy` call count) as
  direct evidence the retry loop actually executes a second attempt, not
  just that a plausible code came back.
- RED-confirmed: reverted the fix via
  `git diff src/app/api/referrers/route.ts > /tmp/w1-referrers-fix.patch &&
  git apply -R /tmp/w1-referrers-fix.patch` (file-scoped patch revert, not
  `git stash` — stash is disabled in worker worktrees since all 4 share one
  `.git` dir), reran the suite: 2/3 new tests failed for the exact predicted
  reason (`500` instead of `201`/`409`); the third (non-colliding positive
  control) correctly passed under old code too, same discrimination-limit
  caveat documented in prior gap docs for tests whose positive-control case
  can't tell old from new code. Restored via `git apply` (forward), reran:
  all 3 pass.
- `tsc --noEmit --pretty false`: same 5 pre-existing baseline errors only
  (admin-auth route type gen, cron/outreach + cron/payment-reminder tests,
  sunnyside-clean-nyc site-nav), none touching this round's files.
- `eslint` on touched files: 0 errors (2 pre-existing unused-var warnings on
  an untouched destructuring line, confirmed via `git blame` predates this
  session).
- Full suite: 650/650 files, 3422 passed + 1 pre-existing expected-fail
  (3423 total), 0 regressions.

File-only. No push/deploy/DB. `tenant_domains` schema lane (this worker's
nominal owned lane) untouched this round, no drift.
