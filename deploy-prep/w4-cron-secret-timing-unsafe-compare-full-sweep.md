# CRON_SECRET / internal-key timing-unsafe compare — full 41-site sweep

**Date:** 2026-07-15 23:xx EDT
**Branch:** p1-w4
**Commit:** c28b4a36

## Finding

Completed the dedicated sweep explicitly deferred at 19:38 this session
(`w4-broad-hunt-2026-07-15-1938.md`): "Same pattern exists at ~40
`CRON_SECRET` Bearer-auth sites across `src/app/api/cron/*` — this is an
established, consistent convention throughout the codebase, not a one-off
bug... recommend only chasing this as a single dedicated pass across all
~40 sites if the leader wants it, not as a one-off patch." That pass also
separately noted `admin/payments/finalize-match` and `admin/selena/monitor`
share the identical non-constant-time pattern for internal-key auth.

The 18:55 timing-unsafe-compare pass (`w4-timing-unsafe-secret-compare-fix.md`)
fixed 4 sites (admin PIN, `ELCHAPO_MONITOR_KEY` x2) but its grep was scoped
to `===` patterns and missed the far larger `!==`-negated-form population —
so it never touched this class. The 17:52 fail-open pass
(`w4-cron-secret-fail-open-on-unset-fix.md`) swept the same ~39 cron sites
for a *different* bug (missing-secret fail-open) and explicitly left the
comparison operator itself untouched.

This pass grepped every `process.env.CRON_SECRET` / `INTERNAL_API_KEY` /
`ELCHAPO_MONITOR_KEY` / `SELENA_TEST_TOKEN` / `PORTAL_SECRET` /
`TEAM_PORTAL_SECRET` / `INGEST_SECRET` reference codebase-wide for any
remaining plain `===`/`!==` comparison. Found and fixed 41 sites:

- 36 cron routes with the direct `authHeader !== \`Bearer ${CRON_SECRET}\`` pattern
- `src/lib/nycmaid/auth.ts`'s shared `protectCronAPI()` helper (covers 5 more cron routes: `anthropic-health`, `phone-fixup`, `confirmation-reminder`, `rating-prompt`, `refresh-job-postings`)
- `admin/seo/apply` (positive-form `bearer === ...`, dual admin-or-cron auth)
- `indexnow` (positive-form, dual cron-or-admin auth)
- `cron/comhub-email` (header + query-param dual check, both fixed)
- `admin/payments/finalize-match` (`x-internal-key` header, the sibling flagged at 19:38 — `admin/selena/monitor` was already fixed by a prior pass, verified clean)

`api/test/email-selena/route.ts` + `cleanup/route.ts` (the other 19:38-flagged
sibling, `SELENA_TEST_TOKEN`) were already fixed by a prior pass — verified,
no action needed.

Left untouched (confirmed not the same class): `x-vercel-cron === '1'`
alt-auth branches compare a public constant, not a secret — no timing
side-channel exists to close.

Impact: all these endpoints are internet-reachable with no other auth layer
(pure Bearer-secret gate), so a timing side-channel is the only defense-in-depth
gap being closed here — same severity class already accepted for the 4 sites
fixed at 18:55 (network jitter makes exploitation hard but non-zero, and
several of these guard destructive/costly actions: `cleanup-videos` deletes
storage objects, `backup` reads all tenant data, `finance-post`/
`release-due-payments` touch payment state).

## Fix

Imported `safeEqual` from `@/lib/secret-compare` (existing helper — already
null/empty/length-safe, `crypto.timingSafeEqual` under the hood) at all 41
sites, replacing the direct `===`/`!==`. Bulk-applied via a scripted regex
pass across the 36 uniform cron sites, hand-verified each diff; the 5
special-form sites (dual-auth, dual-check, protectCronAPI, internal-key)
edited individually since their surrounding logic differs.

Caught and fixed one script side-effect during verification: the bulk
import-insertion heuristic dropped the new import line *inside* two
files' multi-line `import { ... } from '...'` blocks
(`cron/late-check-in`, `cron/reminders`), breaking the parse. Found via
`tsc --noEmit`, corrected by hand in both files.

Behavior-preserving by construction: `safeEqual(a, b)` returns `false` for
null/undefined/empty `a` or `b` and for length-mismatched strings — the same
outcome `!==`/`===` produced for those cases — and only changes comparison
*timing* for genuinely equal-length inputs. No test coverage existed on any
of these 41 auth checks before or after (none of the 41 route files have
route tests), consistent with the no-new-tests precedent set by the 17:52
39-site fail-open pass for the identical file set — a drop-in
constant-time swap with no branching/behavior change doesn't warrant new
route-test scaffolding.

## Verification

- `npx tsc --noEmit` — clean except one pre-existing, unrelated mock-typing
  failure in `bookings/broadcast/route.xss.test.ts` (confirmed present on
  the prior commit too, not introduced by this change).
- `npx vitest run` — full suite, 359/360 files, 1499/1502 tests pass. The
  1 failing test (`cron/tenant-health/status-coverage-divergence.test.ts`)
  is a documented, intentionally-RED invariant test (comment: "This fails
  today") unrelated to auth — confirmed via `git stash` that it fails
  identically against the pre-change baseline. 0 regressions.
- `git diff --stat` — exactly 41 files changed, matching the 41 comparison
  sites found.

File-only, no push/deploy/DB.
