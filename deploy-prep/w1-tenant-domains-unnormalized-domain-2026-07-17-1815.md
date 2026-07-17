# tenant_domains: unnormalized `domain` on two write paths (2026-07-17 18:15)

## Bug
`tenant-lookup.ts`'s `getTenantByDomain()` resolves a request's hostname by
doing `.replace(/^www\./, '')` on the incoming host, then an exact
`.eq('domain', cleanDomain)` against `tenant_domains`/`tenants.domain` — no
lowercasing, no protocol/path stripping on the read side either, but real
Host headers always arrive lowercase/bare in practice, so the write side is
where a mismatch actually gets created. Two write paths never normalized the
`domain` value before storing it, unlike `activate-tenant.ts`'s
`carryHost`/`customHost` (which already do
`.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')`):

1. **POST /api/admin/websites** — inserted `request.json().domain` verbatim.
   The admin page's own submit handler (`src/app/admin/websites/page.tsx`)
   only does `.trim()`, no case/protocol/www normalization. An admin typing
   `Example.com`, `https://example.com/`, or `www.example.com` got a 201 and
   a row in the table — but real traffic for that domain (arriving
   lowercase, bare host, www-stripped by the resolver) can never match it.
   Silent, no error surfaced anywhere.
2. **scripts/onboard-tenant-site.ts** — same gap: writes the raw `--domain`
   CLI arg to `tenants.domain`, `tenants.domain_name`, AND
   `tenant_domains.domain`. Same failure mode, one-time-onboarding-scoped.

Found while re-confirming the schema lane after the primary-invariant close
— same "one write path has a safeguard, sibling write paths don't" shape as
that fix and the earlier `routing_mode`/`type` drift fixes on this same
table.

## Fix (file-only, no push/deploy/DB)
- Found a shared `normalizeDomain()` already exported from
  `src/lib/seo/onboarding.ts` doing exactly this (trim/lowercase/strip
  protocol+path/strip www) for GSC property registration — reused it rather
  than adding a third copy of the same regex chain.
- `src/app/api/admin/websites/route.ts` — POST now normalizes `domain`
  before the uniqueness-relevant insert; rejects (400) if normalization
  collapses the input to empty.
- `scripts/onboard-tenant-site.ts` — `parseArgs()` now normalizes `--domain`
  once at parse time (single source of truth feeding `tenants.domain`,
  `domain_name`, and `tenant_domains.domain` alike); throws if it collapses
  to empty.

## Tests
- `src/app/api/admin/websites/route.test.ts` — 4 new cases: lowercases
  mixed-case input, strips protocol+trailing path, strips leading `www.`,
  rejects an all-whitespace domain (400).
- RED-confirmed via `git apply -R` on a saved patch (not stash — this
  worktree shares a `.git` dir with 3 other active workers and stash was
  flagged tonight as a genuine cross-worktree collision risk; patch-based
  revert avoids that entirely): all 4 new tests failed with the exact
  expected-vs-actual mismatch against pre-fix code, not a generic failure.
  Reapplied, confirmed GREEN.
- `scripts/onboard-tenant-site.ts` has no test coverage — `vitest.config.ts`
  only includes `src/**/*.test.{ts,tsx}`; `scripts/` is out of harness
  reach entirely. Verified by reading, not by a test: `normalizeDomain` is
  a pure function already covered by its own exports' usage elsewhere, and
  the change is a 2-line mechanical wrap at the single point `args.domain`
  is constructed.

## Verification
- `tsc --noEmit`: clean on all touched files (same 4 pre-existing baseline
  errors as last pass — 2 from my own already-committed cron race tests, 1
  admin-auth route-typing quirk, 1 from an untracked sunnyside file that
  isn't part of this lane — none newly introduced).
- `eslint`: 0 new warnings (`onboard-tenant-site.ts`'s pre-existing
  `'exists' is defined but never used` warning confirmed present before my
  change too, via a before/after diff).
- Full suite: 587/587 files, 3172 passed + 1 pre-existing expected-fail, 0
  regressions (4 net new tests vs. the 17:59 baseline of 3168).

## Not touched
- `src/app/site/wash-and-fold-{nyc,hoboken}/_lib/attribution.ts` have the
  same unrelated dead `excludeClickIds` `.not('id','in', ...)` raw-string
  interpolation as the shared `src/lib/attribution.ts` — checked, the param
  is never passed by any caller in either file (dead code), not touched.
- tenant_domains schema lane otherwise reconfirmed intact
  (043/055/056/068/069/2026_07_17_one_primary_per_tenant + this file).

File-only. No push/deploy/DB.
