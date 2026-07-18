# Deploy-hook only re-aliased *.fullloopcrm.com, silently orphaning bespoke tenants' own custom domains on manual deploys (2026-07-18 01:30)

## Fresh-ground discovery

New surface for this pass (LEADER item (1)): `POST /api/internal/deploy-hook`
(`src/app/api/internal/deploy-hook/route.ts`), the Vercel deploy webhook that
re-points every carrying domain at a fresh production deployment so a manual
`vercel --prod` can never orphan them (`DEPLOYMENT_NOT_FOUND`) — the exact
outage class documented in this repo for 2026-07-04 (see `8e02ef34`,
`vercel-domains.ts`'s own comment: "a pinned alias points at one immutable
deployment and 404s the moment a new `vercel --prod` ships — which is exactly
what took every carrying domain down").

The hook discovered re-alias targets via the team-wide `GET /v4/aliases` list,
then filtered to hosts `endsWith('.fullloopcrm.com')`. That heuristic silently
dropped every bespoke tenant's own custom domain — `registerCustomDomain()`
in `vercel-domains.ts` registers a bespoke tenant's apex + www as **project
domains on this exact same Vercel project** (`vercelEnv().project`, default
`'fullloopcrm'`), and `059_backfill_vercel_project.sql` +
`activate-tenant.ts` both confirm several bespoke tenants ARE determinably
served by this project today (the 4 `FL_SIGNAL_BESPOKE_SLUGS`:
`the-florida-maid`, `consortium-nyc`, `the-nyc-interior-designer`,
`the-nyc-marketing-company`, plus any of the 18 "unknown" slugs from that
migration's own audit that have since cut over). Those domains are project
domains exactly like the carrying subdomains this hook exists to protect —
same registration mechanism, same stranding risk — but because
`floridamaid.com` doesn't end in `.fullloopcrm.com`, the old filter never
included it in the re-alias sweep. A manual production deploy would orphan
that tenant's live site with nothing to catch it: the exact same silent
failure mode the hook was built to close, just on the one domain type its
own filter excluded.

## Fix (file-only, no push/deploy/DB)

- **`src/app/api/internal/deploy-hook/route.ts`** — replaced the team-wide
  `GET /v4/aliases` + suffix-filter discovery with the project-scoped `GET
  /v9/projects/{project}/domains` endpoint (same one `vercel-domains.ts`
  already uses for register/verify), where `project` is
  `process.env.VERCEL_PROJECT_ID || 'fullloopcrm'` — matching
  `vercel-domains.ts`'s own fallback so both files agree on which project
  they're talking about. Every domain name returned is added to the re-alias
  set, except the platform's own `fullloopcrm.com` / `www.fullloopcrm.com`
  (those are the git-connected Production Branch domain, which Vercel
  already re-aliases natively — no change to that exclusion).
  - This is strictly safer than widening the old suffix filter would have
    been: `/v4/aliases` is team-wide and could in principle surface aliases
    belonging to a bespoke tenant's *own standalone* Vercel project (the 18
    "unknown" slugs from 059's audit that have NOT cut over) — accidentally
    re-aliasing one of those to this deployment would hijack a domain this
    project doesn't own. The project-scoped domains endpoint can only ever
    return domains actually attached to this project, so that failure mode
    is structurally impossible now, not just avoided by care.
  - Updated the file's header comment and the summary log line to match
    (no longer claims to only cover "carrying domains").

## Verification

- New `src/app/api/internal/deploy-hook/route.domain-discovery.test.ts` (3
  cases, first-ever coverage of this route): rejects an invalid signature
  with 0 fetch calls (baseline regression guard); discovery hits
  `/v9/projects/{project}/domains` with `teamId`, never `/v4/aliases`; a
  bespoke tenant's apex + www from that project's domains list are both
  re-aliased alongside the `*.fullloopcrm.com` wildcard, while the
  platform's own `fullloopcrm.com` / `www.fullloopcrm.com` are excluded.
- RED confirmed: reverted `route.ts` via `git diff > patch && git apply -R`,
  re-ran the new test file — 2/3 failed (discovery URL was `/v4/aliases`,
  `floridamaid.com` never appeared in the alias set), 1/3 passed (the
  invalid-signature baseline, unaffected by this fix). Re-applied the patch
  — all 3 GREEN.
- `tsc --noEmit --pretty false`: 0 new errors (same 5 pre-existing baseline
  as every pass this session — `admin-auth` route-types, 2 unrelated
  pre-existing test files, `sunnyside-clean-nyc` nav import — none touch
  this file).
- `eslint` on both touched files: 0 errors, 0 warnings.
- Full suite: `npx vitest run` — 624/624 files, 3341 passed + 1 pre-existing
  expected-fail, 0 regressions.

File-only, no push/deploy/DB. No live Vercel API call made or needed — this
is a pure discovery-source change, not a data backfill; nothing to run
against prod.
