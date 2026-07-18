# SEO technical scan's URL Inspection failures were silently indistinguishable from a clean scan (2026-07-18 09:40)

## Origin
LEADER's 09:23 pivot order: diagnose why `not_indexed` detection (`seo/detect.ts` +
`seo/technical.ts`, feeding `jefe/health.ts`) is stale/absent for several
tenant sites despite fresh ingest today — specifically `cleaningservicesunnysideny.com`,
`debtserviceratioloan.com`, `thenycinteriordesigner.com`, `theroadsidehelper.com`,
`consortiumnyc.com` (zero `not_indexed` rows ever) vs `thenycmaid`/
`thenyctowingservice`/`wepayyoujunkremoval`/`homeservicesbusinesscrm` (stale
07-16 rows). Asked: scheduling gap, classification bug, or intentional —
fix if real.

## Two contributing causes, not one

**1. Scheduling (already confirmed by W3, not re-litigated here):** `not_indexed`
detection only runs via `cron/seo-technical`, scheduled `0 7 * * 2` — weekly,
Tuesdays only (`vercel.json`). No other code path calls `runTechnicalScan()`.
For any property onboarded after the most recent Tuesday run, or any run that
didn't reach every property before `maxDuration=300` elapsed, "no rows yet" is
expected, not a bug.

**2. Classification/observability bug (this fix):** `runTechnicalScan()` could
not tell "scanned this property, confirmed zero `not_indexed` pages" apart
from "every URL Inspection API call for this property failed." Both produced
`inspected:0, problems:0` for that property, and the property was still
counted in `out.scanned` — nothing was recorded anywhere except a
`console.error` line nobody reads after a cron run:

```ts
async function inspectOne(prop, url, now) {
  try {
    r = await inspectUrl(prop.property, url)
  } catch (e) {
    console.error(...)
    return { inspected: false }   // <-- same shape whether "not attempted" or "API rejected it"
  }
  ...
}
```

`inspectUrl()` throws on any non-2xx from Google's URL Inspection endpoint —
permission-denied (service-account grant covering Search Analytics but not
URL Inspection scope — plausible for a newly-verified property added to GSC
by a different flow/grant than older ones), the ~2k/day/property quota, or a
transient API error. If every URL selected for a property hits this, the
property finishes the run with 0 successful inspections and 0 problems —
exactly the same numbers a genuinely 100%-indexed site would produce. This is
the same "swallowed failure reads as success" class already fixed elsewhere
in this codebase (e.g. `handleSendPin`'s ignored UPDATE error).

Notably, `seo_properties.permission` (the GSC `permissionLevel`, e.g.
`siteFullUser` vs `siteRestrictedUser`) is already captured at ingest
(`ingest.ts`'s `upsertProperty`) but nothing anywhere — cron output, admin UI —
ever reads or surfaces it. The diagnostic signal needed to confirm *which*
specific mechanism (permission grant vs quota vs transient) is hitting the 5
named domains already exists in the DB; this worktree has no DB/live-GSC
access to query it (file-only, no-DB-command constraint), so the live
confirmation for those specific 5 properties is a hand-off, not something
this fix itself proves.

## Fix
`inspectOne` now returns `failed`/`failReason` distinctly from `inspected`.
`inspectAndDetect` aggregates a `failed` count and the first `failReason`
seen. `runTechnicalScan` only increments `out.scanned` when at least one
inspection actually succeeded for that property; a property where every
attempted inspection failed is pushed into the existing `out.skipped`
diagnostic array (the same channel already used for the "no URLs to
inspect" case) with the failure count and last error, e.g.:

```
consortiumnyc.com: 20/20 URL inspections failed, 0 succeeded (last error: URL inspect failed: 403 ...) — check seo_properties.permission for this property
```

This doesn't fix the underlying GSC-side cause (unknown without live access —
could be permission scope, quota, or something else entirely) but it turns a
previously invisible failure mode into an actionable one: the next cron run's
JSON response (or whoever reads it) can now tell "confirmed clean" from
"totally broken, go check this property's permission level" instead of the
two looking identical.

## What to check next (hand-off, needs live DB/GSC access this worktree doesn't have)
For the 5 zero-`not_indexed` domains: query `seo_properties.permission` and
compare against a working domain like `thenycmaid.com`. If it differs
(anything other than `siteFullUser`/`siteOwner`), that's very likely the root
mechanism — the GSC verification/grant flow for newly-onboarded bespoke
tenants needs to request full-access scope, not just Search Analytics
read access. Also worth one manually-triggered run of
`GET /api/cron/seo-technical?properties=5` (cron-secret-gated) scoped to just
those 5 to read the new `skipped` output directly, rather than waiting for
next Tuesday.

## Verification
New test file (none existed before for `technical.ts`):
`technical.silent-inspection-failure.test.ts` — seeds a property with real
ingest data (so it's a legitimate scan candidate) and mocks `inspectUrl` to
throw for every call. RED-confirmed via `git apply -R` on the diff (pre-fix:
`scanned:1, skipped:[]` — the bug, reproduced); GREEN after. Full suite
681/681 files, 3509+1 pass, 0 regressions. tsc clean (4 pre-existing
unrelated baseline errors: `.next` generated types, 2 unrelated cron test
files, `site-nav.ts` — none touching this change). eslint 0 warnings.
File-only, no push/deploy/DB.
