# W2 gap/fluidity refresh — 2026-07-17 08:24

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-running-late-portal-collect-admin-auth-write-scope-2026-07-17-0813.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) pivot fresh-ground hunting to a new bug class (write-scope thread closed), (3) keep gap/fluidity current. All 3 done — see below.

## Archetype depth

Added `sim-all-trades.ts` section 5a-37: proves the 3 write-scope fixes from last round (team-portal/running-late, portal/collect, admin-auth) round-trip against the live `bookings`/`sms_conversations`/`tenant_members` tables, same pattern as 5a-36. Not yet executed — leader-run-only. `npx tsc --noEmit` clean, eslint 0 new warnings.

## Fresh-ground hunting — new bug class found and fixed (pin_hash leak)

With the write-side tenant-scope thread closed, pivoted the hunt to sensitive-column exposure: does any API route return a raw secret/credential-hash column to the browser via an unredacted `select('*')`? This codebase already has an established, deliberate invariant for this — `GET /api/settings` has a `NEVER_RETURNED_FIELDS` allowlist stripping `google_tokens`/`telegram_bot_token`/`telegram_webhook_secret` ("zero read-back consumers... stripped even for authorized viewers"), and `GET /api/admin/users` + `GET /api/admin/businesses/[id]/users` both select `tenant_members.pin_hash` internally but only ever return derived `has_pin`/`pin_set_at`/`last_login` — never the raw hash.

Grepped every `.from('tenants')`/`.from('tenant_members')` call for `select('*')` in `src/app/api` (3 hits) and checked each against that invariant:

- **`GET /api/settings`** — `.from('tenants').select('*')`, but this IS the `NEVER_RETURNED_FIELDS`-guarded route itself. Correct as-is (already the reference implementation).
- **`GET /api/admin/businesses/[id]`** and **`GET /api/admin/tenants/[id]`** — both do `.from('tenant_members').select('*').eq('tenant_id', id)` and return the array verbatim as `members` in the JSON response, unredacted. **Real instance of the bug class**: `pin_hash` (deterministic HMAC-SHA256 of the tenant admin's live login PIN, `lib/admin-pin.ts`) shipped to the browser on every platform-admin business/tenant detail page load. Neither frontend actually reads `members[].pin_hash` — `admin/tenants/[id]/page.tsx`'s `Member` type is `id/clerk_user_id/role/name/email` only, and `admin/businesses/[id]/page.tsx` doesn't consume `data.members` at all — so this is a pure drift from the established invariant, not a deliberate tradeoff like the settings route's API-key exposure (which the settings route's own comment justifies as "prefills these into editable inputs... stripping them would blank the field").

**Severity**: not a direct account-takeover (`admin-auth`'s check derives a hash FROM a caller-supplied PIN — it never accepts a raw hash as a bearer credential), but real credential-material exposure: a leaked `pin_hash` combined with a leaked/weakened `ADMIN_TOKEN_SECRET` collapses to a sub-second 6-digit PIN brute-force (1,000,000 HMAC computations). Same OWASP "sensitive data exposure" class as returning a password hash in a user-list API.

**Fixed**: both routes now select an explicit column list (`id, tenant_id, clerk_user_id, role, name, email, phone, created_at`) instead of `select('*')` on `tenant_members`. 2 new `route.pin-hash-redaction.test.ts` files. The shared `tenant-isolation-harness`'s `select()` ignores its column argument (always returns the full seeded row regardless), so it would false-positive-pass this probe whether or not the fix was applied — wrote a small dedicated column-projecting stub instead so the test is a genuine probe. Mutation-verified: reverted both route.ts changes (`git diff > patch`, `git apply -R`), watched both new tests go RED for the right reason (`pin_hash` present in the response body), restored (`git apply`), watched GREEN.

**Checked and clean (no second instance, ruled out rather than assumed)**: initially suspected `GET /api/dashboard/hr/[id]`'s `.from('hr_employee_profiles').select('*')` might leak `tax_ssn_encrypted` the same way — verified against `migrations/030_finance.sql` and `053_hr_foundation.sql` directly: `tax_ssn_encrypted`/`tax_ssn_last4` live on `team_members`, not `hr_employee_profiles` (which only holds comp/dates/emergency-contact/DOB fields, no encrypted secrets), and that same route's `team_members` fetch already uses an explicit column list that omits both tax fields. Swept every `.from('team_members').select('*')` in `src/app/api` (1 hit, `cron/backup/route.ts` — an internal ops backup cron whose result is never returned to a client) and every other `tax_ssn_last4` call site (`finance/payroll-prep`, `finance/tax-export`, `finance/year-end-zip` — all three explicitly select only `tax_ssn_last4`, never `tax_ssn_encrypted`, and mask it as `***-**-${last4}` in exports). Not fabricating a second bug to fill the slot — one real instance this round, honestly reported as one.

`npx tsc --noEmit`: clean. `eslint` on all 4 touched files: 0 errors, 0 warnings. Full suite: 551 files (was 549), 2459 tests (was 2455) — 2422 passed + 37 skipped, 0 failed, 0 regressions.

No DB migration needed — no schema change, `tenant_members` columns already exist.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from `w2-fresh-ground-sweep-no-new-bug-plus-dead-column-2026-07-17-0747.md`, items 1-17. No new items this round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `test(sim)` archetype-depth, 1× `fix`+tests, 1× `docs`).
