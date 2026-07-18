# clients.pin has no uniqueness guarantee -> login lockout + duplicate-client creation (2026-07-17 20:24)

## Surface (fresh-ground, opened up while auditing the pin-hash follow-up)
`2026_07_16_client_team_pin_hash.sql`'s header comment (last session) already
flagged that `clients.pin` (the client-portal login credential) has **no**
uniqueness guarantee — `idx_clients_pin` (`011_parity_with_nycmaid.sql`) is a
plain index, not unique — and explicitly deferred both the collision check
and the fix: "Before tightening to UNIQUE, the leader should run: `select
tenant_id, pin, count(*) from clients where pin is not null group by
tenant_id, pin having count(*) > 1`." Investigating that flagged-but-open gap
surfaced two live runtime bugs plus the schema fix itself.

Confirmed via reading `node_modules/@supabase/postgrest-js/src/
PostgrestBuilder.ts` directly (not assumed): `.maybeSingle()` does **not**
protect against a 2+-row match the way its name suggests. For a GET-style
`select()`, the client-side code explicitly checks `data.length > 1` and, if
true, sets `data: null` with a `PGRST116` error — the *exact same* error
shape it uses for the legitimate 0-row case. Any call site that destructures
`{ data }` without checking `error` cannot tell "not found" from "found too
many" apart. This is the same underlying failure class as this session's
`.single()`-on-unconstrained-column fixes (webhooks/telnyx, portal/auth
send_code), just via `.maybeSingle()` instead of `.single()`.

## Bug 1 — client/login/route.ts: permanent lockout
The PIN-login lookup (`clients.pin`, no uniqueness) used `.maybeSingle()`
directly. Two clients in the same tenant sharing a PIN (a real birthday-
paradox risk on a 6-digit space, actively growing since every PIN-minting
site inserts with no collision check) meant the second client's PIN
permanently resolved to `data: null` -> "Invalid PIN" 401, indistinguishable
from an actually-wrong PIN. Total self-service login lockout, same shape as
this session's other phone-lookup lockout fixes.

## Bug 2 — client/book/route.ts: silent duplicate-client creation
The existing-client dedupe lookups (`byEmail` via `clients.email`, `byPhone`
via `clients.phone` — also both unconstrained) used `.maybeSingle()`. A
duplicate email/phone row meant the "does this client already exist" check
silently came back empty, and the route created a **brand-new** duplicate
client instead of reusing the match — fragmenting that client's booking and
contact history across two rows. Different failure shape than Bug 1 (data
integrity, not access denial) but same root cause and same fix pattern.

## Fix (file-only, no push/deploy/DB)
- `src/app/api/client/login/route.ts` — PIN lookup: `.maybeSingle()` ->
  `.order('id').limit(2)`, pick first deterministically, `console.error` if
  ambiguous (tenant + count + winning id only — never logs the PIN itself,
  it's a credential).
- `src/app/api/client/book/route.ts` — `byEmail`/`byPhone` lookups: same
  `.order('id').limit(2)` pattern, logs the matched email/phone (PII, not a
  secret — matches this session's existing convention of logging phone in
  the portal/auth fix).
- `src/lib/migrations/2026_07_17_clients_pin_dedupe.backfill.sql` (new,
  file-only) — closes the deferred check from `2026_07_16_client_team_pin_
  hash.sql`: for every `(tenant_id, pin)` collision group, keeps the oldest
  row's PIN and regenerates a fresh, tenant-unique 6-digit PIN for every
  other row in the group (bounded-retry collision avoidance in-SQL).
  Clears `pin_hash`/`pin_hash_set_at` on regenerated rows rather than
  recomputing the HMAC here (no access to `ADMIN_TOKEN_SECRET`) — re-running
  `2026_07_16_client_team_pin_hash.backfill.sql` afterward fills the gap
  correctly since that file is idempotent on `pin_hash is null`. Fail-loud
  verification block confirms zero collisions remain.
- `src/lib/migrations/2026_07_17_clients_pin_unique.sql` (new, file-only) —
  adds `idx_clients_tenant_pin_unique` (partial unique index, mirrors
  `idx_team_members_tenant_pin_unique` from `014_security_hardening.sql`),
  gated by its own pre-flight collision check so a wrong run order fails
  with a clear named error instead of a raw Postgres 23505.
- Run order (leader, after Jeff approves): dedupe backfill -> re-run
  `2026_07_16_client_team_pin_hash.backfill.sql` -> unique-index migration.

## Not fixed this round — flagged
The three PIN-minting write sites (`client/collect`, `client/verify-code`,
`client/book`'s new-client-via-email branch) still insert a fresh
crypto-random PIN with zero collision check. Once the unique index above is
live, a collision there surfaces as a raw insert failure (generic 500) —
correct in that it no longer silently duplicates, but not a graceful
retry-on-23505 loop the way `065_unique_payments_reference.sql`'s
`processPayment()` was updated in the same commit as its index. Deliberately
deferred: this pass is schema + the two read-path lockout/dedupe bugs;
retry-on-collision at the three write sites is a natural, scoped follow-up
once the index is confirmed live in prod (can't safely land the retry logic
before the constraint it's retrying against actually exists).

## Tests
- `client/login/route.duplicate-pin.test.ts` (new) — two clients sharing a
  PIN: login still succeeds (200, sets cookie), not a 401; a genuinely wrong
  PIN still 401s (0-row case unaffected); a `do_not_service` row among the
  colliding set is still correctly rejected (gate applies post-fix).
- `client/book/route.duplicateClientLookup.test.ts` (new) — two clients
  sharing an email+phone: booking reuses one of the existing client ids via
  both the email path and the phone-fallback path, zero new `clients`
  inserts in either case.
- Both mutation-verified: `git diff > patch`, `git apply -R` (stash
  disabled, shared `.git` dir across workers), confirmed RED against
  pre-fix code with the exact predicted failure (401 instead of 200 for
  login; a spurious `clients` insert for book), restored, confirmed GREEN.
  The book test's hand-rolled `maybeSingle()` mock initially papered over
  the bug (always returned the first filtered row regardless of count) —
  caught by the RED-check itself, not by inspection; fixed the mock to
  reproduce postgrest-js's actual 2+-row-swallow-as-null behavior before
  trusting the test.

## Verification
- `tsc --noEmit`: 0 new errors on any touched file (baseline pre-existing
  errors elsewhere -- `admin-auth`, `cron/outreach` and `cron/payment-
  reminder` test files, `sunnyside-clean-nyc/_lib/site-nav.ts` -- confirmed
  via `git status` to be untouched by this diff, unrelated to this pass).
- `eslint` on touched TS files: 0 issues.
- Targeted: `src/app/api/client/` (21 files, 87 tests) + `src/app/api/team-
  portal/auth` — all passed, 0 regressions.

Commits: pending this round's commit.
File-only. No push/deploy/DB.
