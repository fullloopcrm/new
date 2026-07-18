# Gap/fluidity: referrer ledger silently drifted when bumpReferrerTotal failed

**Session date:** 2026-07-18, P1/W1 fresh-ground sweep.

## The gap

`bumpReferrerTotal()` (`src/lib/referrer-ledger.ts`) is the CAS-retry helper
that adds a delta to `referrers.total_earned`/`total_paid` — the two columns
shown directly to the referrer as real money owed/paid
(`src/app/referral/[code]/page.tsx`: `pendingAmount = total_earned -
total_paid`). It already has correct retry logic (its own test suite proves
concurrent bumps don't lose updates) and a documented, tested failure mode:
it returns `false` — without throwing — when a read errors or all 5 CAS
attempts lose the race.

All 3 real call sites ignored that return value:

- `src/app/api/referral-commissions/route.ts` POST (create commission,
  line ~160): `await bumpReferrerTotal(...)`, result discarded.
- Same file, PUT (mark commission paid, line ~238): same pattern.
- `src/app/api/team-portal/checkout/route.ts` (line ~187): worse —
  `bumpReferrerTotal(...).catch(() => {})`, a bare fire-and-forget that would
  also swallow a *thrown* error, not just a `false` return.

In all 3 cases the primary record (the `referral_commissions` row) is
created/updated successfully first — that part is correct and durable. The
bump only adjusts the referrer's aggregate total afterward. If the bump
fails, the commission itself is fully correct in the ledger table, but the
referrer-facing `total_earned`/`total_paid` figure silently stops reflecting
it, with zero log line, zero notification, zero admin_tasks row — nothing
that would ever surface the drift. A referrer's portal balance would simply
be wrong, permanently, with no trail pointing at why.

## Why now

This is the same silent-ignored-write-result class fixed repeatedly this
session (booking_team_members reassign upsert error, job_payments void
reversal, etc.), just on a money-adjacent helper that was itself hardened
against races in a prior pass but never had its callers checked. Found while
sweeping for tables/helpers with a proven-but-unchecked failure path as this
round's fresh-ground surface.

## The fix

Added `bumpReferrerTotalOrFlag()` alongside the existing `bumpReferrerTotal()`
in `referrer-ledger.ts`: same call, but on a `false` result it
`console.error`s and inserts a `high`-priority `admin_tasks` row (type
`referrer_ledger_drift`, `related_type`/`related_id` pointing at the
commission or booking) describing exactly which referrer/field/amount needs
manual reconciliation — the same "flag instead of swallow" shape already
used by the Stripe webhook's `partial_payment` admin_tasks insert. All 3 call
sites now use `bumpReferrerTotalOrFlag` instead of the bare function.

Deliberately NOT changed:
- `bumpReferrerTotal` itself — its CAS logic and return contract are correct
  and already tested; only its callers were the gap.
- No request now fails/500s because of a ledger-bump failure — the
  commission write already succeeded and stays the source of truth; the fix
  only makes the drift visible instead of invisible.

## Verification

- RED-confirmed: `git diff` capture + `git apply -R` on `referrer-ledger.ts`
  alone (not `git stash` — this worktree hook flags stash-based RED/GREEN
  passes as a shared-stash collision risk with other concurrent workers, so
  every fix this pass used diff+apply -R instead), reran
  `referrer-ledger.test.ts`: both new tests failed with `TypeError:
  bumpReferrerTotalOrFlag is not a function` (the predicted reason — the
  wrapper didn't exist pre-fix). Re-applied, both green.
- `src/lib/referrer-ledger.test.ts`: 2 new tests (success path leaves no
  admin_tasks row; failure path opens exactly one high-priority row with the
  right tenant/type/related_id/title/description). 6/6 pass.
- Updated 1 existing test mock
  (`route.referral-commission-email-escape.test.ts`) that stubbed
  `bumpReferrerTotal` and broke when the route switched to
  `bumpReferrerTotalOrFlag` — added the new export to the same `vi.mock`.
- `npx tsc --noEmit`: clean on all 4 touched files (pre-existing unrelated
  baseline errors elsewhere: admin-auth route generated-types mismatch, 2
  cron test files, sunnyside-clean-nyc site-nav.ts — none touched by this
  pass).
- Targeted suite (`referrer-ledger.test.ts` +
  `api/referral-commissions/` + `api/team-portal/checkout/`): 7 files, 28/28
  tests green, 0 regressions.
- Full suite: launched in background, not yet confirmed at time of writing
  this doc — see LEADER-CHANNEL report for the follow-up confirmation.

File-only. No DB migration needed (`admin_tasks` table already exists,
migration 011). No push/deploy/DB.
