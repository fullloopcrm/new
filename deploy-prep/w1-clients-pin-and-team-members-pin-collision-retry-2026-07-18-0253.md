# Two clients.pin/team_members.pin write paths failed real users outright on a PIN collision instead of retrying (2026-07-18 02:53)

## Fresh-ground discovery (LEADER item 1)

`2026_07_17_clients_pin_unique.sql` (this session's own earlier work, per its
own header) had already flagged — but deliberately deferred — a known gap:
`idx_clients_tenant_pin_unique` uniquely constrains `(tenant_id, pin)`, but
none of the three write paths that mint a `clients.pin` (`client/collect`,
`client/verify-code`, `client/book`) checked for a collision before
inserting. That migration's own comment called this "a natural follow-up
once this index is confirmed live" — a concrete, self-flagged continuation
target, not a new discovery, but genuinely unclosed work in this same
schema+backfill lane.

Checked what actually happens on a collision today: all three routes throw
the raw insert error up to an outer `catch`, which returns a generic 500.
Concretely:

- `client/collect` — a real lead's first form submission fails outright.
- `client/verify-code` — worse: this is mid-login, AFTER the caller already
  proved ownership of the email/phone by supplying the code just sent to
  it. A collision here fails a legitimate login/account-creation for
  someone who just verified.
- `client/book` — worst: the public self-service booking funnel. A
  collision here fails a real customer's booking (and its revenue)
  outright.

6-digit PIN (100000-999999, ~900k values) makes this a real, if
low-probability-per-tenant, failure mode that grows with a tenant's client
count (birthday paradox) — not hypothetical, and each occurrence loses a
real lead/login/booking for no reason, since a fresh PIN is trivially safe
to regenerate and retry.

## Fix

Added `randomClientPin()` + `MAX_CLIENT_PIN_ATTEMPTS` to
`src/lib/client-auth.ts` (the existing home for `clients.pin` session logic).
All three write paths now loop up to `MAX_CLIENT_PIN_ATTEMPTS` (5), catching
`error.code === '23505'` and regenerating a fresh PIN each attempt before
giving up — same pattern `POST /api/invoices`/`POST /api/quotes` already use
for `invoice_number`/`public_token` collisions (regenerate-and-retry for an
auto-generated value; a caller-supplied value would get a clean 409 instead,
but PINs are never caller-supplied so that branch doesn't apply here).

Updated `2026_07_17_clients_pin_unique.sql`'s header comment (now stale) to
record that the flagged follow-up landed, instead of leaving it reading as
still-open.

## Continuation (LEADER item 2 — the surface (1) opened up)

Fixing the `clients.pin` class raised the obvious question: is
`team_members.pin` (the sibling login-credential column, same
per-tenant-unique-index shape via `idx_team_members_tenant_pin_unique`,
014_security_hardening.sql) exposed the same way? Checked both
`team_members`-creating write paths:

- `provisionApprovedApplicant()` (`src/lib/team-provisioning.ts`, the
  team-application-approval path) — already retries on collision. Its own
  comment says so explicitly ("The DB enforces PIN uniqueness per tenant;
  retry on collision.").
- `POST /api/team` (`src/app/api/team/route.ts`, the direct admin/API
  add-team-member path) — did NOT retry, despite its own comment claiming
  "a collision returns a 500 and the caller retries." Grepped the entire
  dashboard frontend for any caller of this endpoint's POST — found none;
  the in-app "add team member" flow goes exclusively through
  applications->approve (already covered). This endpoint is still real and
  documented (`/admin/docs` lists it as a supported API), so any direct/API
  caller hit the same unhandled-collision failure the stale comment denied.

Worse odds than `clients.pin`: team PINs are only 4 digits (1000-9999, 9000
possible values vs. clients' ~900k), so collision probability climbs much
faster with headcount. Fixed with the same regenerate-and-retry loop,
matching the idiom already established in `team-provisioning.ts` (4
attempts, retry only on a duplicate/unique-violation message — team_members
has no other unique constraint this insert could hit, so no risk of
retrying uselessly on an unrelated conflict).

## Files (file-only, no push/deploy/DB)

- `src/lib/client-auth.ts` — new `randomClientPin()` + `MAX_CLIENT_PIN_ATTEMPTS`.
- `src/app/api/client/collect/route.ts` — retry loop on insert.
- `src/app/api/client/verify-code/route.ts` — retry loop on insert.
- `src/app/api/client/book/route.ts` — retry loop on insert.
- `src/app/api/client/verify-code/route.test.ts` — updated its
  `@/lib/client-auth` mock to also export `randomClientPin`/
  `MAX_CLIENT_PIN_ATTEMPTS` (existing tests route through the create-new-
  client branch and would otherwise call an undefined mock function).
- `src/app/api/team/route.ts` — retry loop on insert, matching
  `team-provisioning.ts`'s existing idiom.
- `src/lib/migrations/2026_07_17_clients_pin_unique.sql` — header comment
  updated to reflect the follow-up landing (was previously honest about it
  being open; now honest about it being closed).
- New tests: `client/collect/route.pin-conflict.test.ts`,
  `client/verify-code/route.pin-conflict.test.ts`,
  `client/book/route.pin-conflict.test.ts`,
  `team/route.pin-conflict.test.ts` — 8 tests total, each covering (a)
  retry-and-succeed within the attempt cap, (b) give-up-cleanly (not
  infinite) once the cap is exhausted.

## Verification

- `tsc --noEmit --pretty false`: 5 pre-existing baseline errors only (same
  count as every pass this session), 0 new.
- `eslint` on all touched/added files: 0 errors. One pre-existing warning
  (`_pin` unused destructure at `team/route.ts:28`, untouched by this diff,
  confirmed via `git diff --stat` showing only the POST handler changed).
- New tests: 8/8 pass. The retry-and-succeed tests assert the exact insert
  attempt count (e.g. 2 seeded collisions -> exactly 3 insert calls), which
  only passes if the loop actually re-invokes insert on error — this is
  direct evidence the retry executes, not just pattern-matched confidence.
  The give-up tests assert the attempt count stops exactly at the cap (5 for
  clients.pin, 4 for team_members.pin) with 999 simulated collisions,
  confirming no infinite-retry regression.
- Existing suite for all 4 touched routes: all prior tests still pass
  (`client/collect`, `client/verify-code`, `client/book`, `team` route test
  files), including the just-updated `verify-code/route.test.ts` mock.
- Full `npx vitest run`: 635/635 files, 3369 passed + 1 pre-existing
  expected-fail (was 631/631, 3361+1 before this pass — +4 files/+8 tests,
  0 regressions).

File-only, no push/deploy/DB. Both the app-code fixes and the migration
comment update are within the schema+backfill lane; nothing here requires a
new SQL file since the constraint itself already exists in a prior
migration — this only fixes application-layer handling of it.

## Noticed (not fixed, flagging per scope discipline)

- Did not sweep every OTHER `CREATE UNIQUE INDEX` migration in this repo for
  the same "constraint exists, no app-layer retry" pattern beyond
  `clients.pin`/`team_members.pin` — those two were checked because they're
  directly comparable (both mint a random credential value with no
  caller-supplied alternative, both are login-critical). A broader sweep of
  every unique-constrained column against every insert site is a larger,
  separate pass.
- Did not verify whether `POST /api/team` has any real external caller
  today beyond its own test file and the `/admin/docs` listing — grepped the
  dashboard frontend exhaustively and found none, but an external API
  consumer outside this repo (if one exists) was out of reach to check.
  Fixed regardless since the endpoint is live and documented.
