# W4 — SEO surface: property-scoped delete gap + enrich.ts orphaned-proposal gap
2026-07-17 12:52 ET

## Context

Continuation of the 12:41 LEADER order's 3-deep queue: (1) continue the
`src/lib/seo/*` surface (content.ts/blog-data.ts/schema.ts/technical.ts/
competitors.ts/photos.ts/gsc.ts per the prior session's own next-target list),
(2) continue whichever file (1) opens up, (3) keep gap/fluidity current.

First landed the two batches that were already fixed-but-uncommitted from the
prior session (finance/backfill price-overwrite guard + bank-txn/suggest rate
limit — commit `4e20f82f`; seo autopilot human-review-bypass + orphaned-proposal
supersede — commit `ac25fd0c`), confirmed `tsc --noEmit` clean on both before
committing.

## Findings this pass

### 1. `runTechnicalScan`/`runCompetitorScan` — global delete, partial re-populate (commit `169b9112`)

Both `technical.ts` and `competitors.ts` open with the same "fresh slate"
pattern: delete ALL open issues of a type, then loop properties re-inserting
fresh ones. Both loops accept `opts.propertyLimit`, wired live from
`?properties=N` on their cron routes (`/api/cron/seo-technical`,
`/api/cron/seo-competitors`). When `propertyLimit` is set, the delete still
fires globally but the re-populate only covers the first N properties —
every property beyond the limit loses its `not_indexed` / `competitor_gap`
issues with nothing to restore them until the next full run. Same failure
mode (minus the query param) whenever a property errors/gets skipped
mid-loop: its issues were already wiped by the upfront global delete before
its own scan even started.

Fixed by moving the delete inside each property's own write path
(`inspectAndDetect` for technical.ts, `detectCompetitorGaps` for
competitors.ts), scoped `.eq('property', prop.property)`. A property never
reached this run — because it was outside `propertyLimit`, or because an
earlier step in its own try block threw — now keeps its existing issues
instead of losing them.

Live-fire status: `seo-technical` IS in `vercel.json` crons (Tue 7am), but
the schedule entry never passes `properties`, so the schedule itself doesn't
trigger the bug — a manual/debug call with `?properties=N` (CRON_SECRET-gated)
would. `seo-competitors` isn't in `vercel.json` crons at all yet. Real bug,
not currently live-firing via the schedule.

### 2. `enrich.ts` — same orphaned-proposal class as the 12:41 autopilot fix, missed here (commit `c6351a26`)

Confirmed via `src/lib/migrations/2026_07_04_seo_detection_fn.sql` line 10:
`seo_run_detection()` unconditionally deletes all `open` `seo_issues` and
reinserts fresh rows (fresh UUIDs) every run, including `deep_underperformer`
(the type `enrich.ts` consumes). `enrichOne()` still deduped its
`seo_changes` writes by `issue_id` — the exact bug already fixed this session
in `recipes.ts`/`remediate.ts`/`competitor-remediate.ts` but missed in this
sibling file. Two consequences:

- The quality-gate-reject path's `UPDATE ... WHERE issue_id = issue.id` is a
  silent no-op on the common path: `issue.id` is a brand-new UUID from
  *this* run's detection, so it can never match a row inserted by a *prior*
  run (no row exists yet for today's fresh id at reject time).
- The accept path's dedup-then-insert, matched on the same stale key, leaves
  a prior run's still-`proposed` draft as an orphaned duplicate with a stale
  `before_metric` snapshot instead of being superseded.

Fixed both call sites to match/supersede by `target_url` (+ `field`) instead
of `issue_id`, same pattern as the sibling fix.

Live-fire status: `seo-enrich` isn't wired into `vercel.json` crons yet (same
as `seo-competitors`, `seo-autopilot`, `seo-improve`) — real bug in the code
today, not currently scheduled.

## Surface coverage

Read every file in `src/lib/seo/` this session across both passes:
`autopilot.ts`, `apply` chain, `safety-gate.ts` (12:41 pass) +
`recipes.ts`/`remediate.ts`/`competitor-remediate.ts` (12:41 pass) +
`content.ts`, `blog-data.ts`, `schema.ts`, `photos.ts`, `gsc.ts` (this pass —
all static/pure-transform, no mutation bugs) + `technical.ts`, `competitors.ts`
(fixed) + `enrich.ts` (fixed) + `verify-revert.ts`, `detect.ts`, `ingest.ts`,
`serp.ts`, `overrides.ts` (this pass — read end-to-end, no further findings).
Not yet read: `onboarding.ts`, `auto-verify.ts` (already touched by W2 per
`e19f8301`/`c8a00704`), `health.ts` (checked for the same propertyLimit shape
only — clean, no `propertyLimit` param), `intent.ts`, `commercial.ts`,
`locations.ts`, `services.ts`, `tenant-seo.ts`, `tenant-sitemap.ts`. Grepped
every file in the directory for `delete()` + `propertyLimit` co-occurrence —
confirmed exactly the 2 sites fixed here have this shape.

## Tests

No test files added for these 3 fixes, consistent with this module's
established convention (checked `git log -- src/lib/seo/` — zero prior
commits in this directory have ever included a test file; the module has no
existing test coverage to extend). Verified instead via `tsc --noEmit` +
manual end-to-end re-read of every changed function.

## Verification

- `tsc --noEmit --pretty false`: clean, same 2 pre-existing unrelated errors
  only (`route.xss.test.ts` mock-callable issue, `site-nav.ts` named-export
  mismatch — both in untouched files).
- Full suite: 564/566 files, 2081/2085 tests passing. 2 failures, both
  pre-existing and previously flagged repeatedly: `status-coverage-divergence`
  (intentional RED, documented every prior report) and
  `generate-recurring/route.duplicate-occurrence-race` (parallel-load flake,
  untouched file — re-ran in isolation, 2/2 passing).

No push/deploy/DB write. All 4 commits this session file-only:
`4e20f82f`, `ac25fd0c`, `169b9112`, `c6351a26`.
