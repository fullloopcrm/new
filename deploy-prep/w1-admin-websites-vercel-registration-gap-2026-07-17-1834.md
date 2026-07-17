# admin/websites POST: domain saved to DB, never attached to Vercel (2026-07-17 18:34)

## Bug
`POST /api/admin/websites` (the "Add domain" action on the admin Website
Network page) only ever inserted a `tenant_domains` row and returned 201 —
it never registered the domain with Vercel.

Every other tenant_domains write path pairs the DB row with a live Vercel
project-domain registration:
- `activate-tenant.ts`'s `domain_routing` step calls `registerCarryingDomain`
  for the `<slug>.fullloopcrm.com` carrying domain and `registerCustomDomain`
  for a tenant's own custom domain, on every activation.
- `registerCustomDomain` (`src/lib/vercel-domains.ts`) is what actually calls
  the Vercel API to attach apex + www as project domains — without it, Vercel
  has no record of the host, so it can't route to it or issue it a TLS cert.

`grep`-confirmed `registerCustomDomain`/`registerCarryingDomain` are called
from exactly 4 places app-wide (`activate-tenant.ts` +
`dashboard/onboarding/activate/route.ts`, both wrapping the same activation
flow, plus `admin/businesses/route.ts` and `admin/businesses/[id]/route.ts`
for tenant create/delete) — `admin/websites/route.ts`'s POST was not one of
them, confirmed by reading the full file (no `vercel` import/reference
anywhere).

Impact: an admin uses the Website Network page to add a domain for an
existing tenant (e.g. a second alias domain, or fixing up a domain that
activation missed) — gets a 201, sees the row appear in the table — but the
domain is dead on arrival at the transport layer. Even with correct
`tenant_domains` normalization (this session's earlier fix) and correct
resolver behavior, real traffic to that host gets Vercel's default
"domain not found"/no-cert response, not the tenant's site. Silent: no
error surfaced anywhere, the admin has no reason to suspect anything is
wrong until a customer reports the domain doesn't work.

## Fix (file-only, no push/deploy/DB)
- `src/app/api/admin/websites/route.ts` — POST now calls
  `registerCustomDomain(domain)` after the DB insert succeeds. Matches
  `registerCustomDomain`'s documented contract ("never throws... failure
  surfaces as status:'error'") — a Vercel-side failure does not roll back or
  block the already-saved `tenant_domains` row, it's reported in the
  response instead (`{ domain, vercel }`).
- `src/app/admin/websites/page.tsx` — `addDomain()` now reads
  `body.vercel.status` and alerts the admin when it's `'error'` or
  `'skipped'`, so a Vercel-layer failure is visible instead of the UI
  reading a 201 as unconditional success.

## Tests
- `src/app/api/admin/websites/route.test.ts` — 3 new cases: registers the
  *normalized* domain with Vercel (not the raw input) and returns the
  result; still returns 201 + the saved row when Vercel errors (DB write
  isn't rolled back); surfaces a `'skipped'` status rather than silently
  reporting success.
- Added a `registerCustomDomain` mock via the same `vi.hoisted`/`h.*` pattern
  the file already uses for `requireAdmin`, matching the mocking convention
  `dashboard/onboarding/activate/route.isolation.test.ts` uses for
  `registerCarryingDomain`.
- RED-confirmed via `git apply -R` on a saved patch of just `route.ts` (same
  patch-based revert as the domain-normalization fix — this worktree shares
  a `.git` dir with 3 other active workers, stash was flagged as a
  cross-worktree collision risk): all 3 new tests failed with exact
  expected-vs-actual mismatches (`json.vercel` undefined) against pre-fix
  code, not a generic failure. Reapplied, confirmed GREEN.

## Verification
- `tsc --noEmit`: clean on all touched files. One new error was introduced
  by the test file's `mockImplementation` typing (a `(domain: string) =>`
  signature isn't assignable to the hoisted mock's `(...args: unknown[]) =>`
  type) — fixed by typing the mock via `args[0] as string` instead; confirmed
  clean after. Same 4 pre-existing baseline errors as the last two passes (2
  cron race tests, 1 admin-auth route-typing quirk, 1 untracked sunnyside
  file outside this lane) — none newly introduced.
- `eslint`: 0 new warnings on touched files (the page's one pre-existing
  `fetchData` hook-order warning is on an untouched line, confirmed present
  before this change too).
- Full suite: 587/587 files, 3175 passed + 1 pre-existing expected-fail, 0
  regressions (3 net new tests vs. the 18:15 baseline of 3172).

## Not touched
- `src/lib/vercel-domains.ts` itself — unmodified, reused as-is.
- Tenant *delete* already detaches `tenant_domains` rows from Vercel
  (`admin/businesses/[id]/route.ts`, confirmed via
  `route.delete-domains.test.ts`) — this was specifically the *add* path
  that was missing the pairing.
- `scripts/onboard-tenant-site.ts` (the CLI onboarding script) was not
  checked for the same gap this pass — flagging, not verified. It's a
  brand-new-tenant path, likely closer to `activate-tenant.ts`'s coverage,
  but not confirmed either way.

File-only. No push/deploy/DB.
