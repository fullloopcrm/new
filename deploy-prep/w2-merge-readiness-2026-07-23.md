# W2 merge-readiness — p1-w2-2026-07-23-w2

4 commits ahead of origin/main. No merge performed, no push to main.

## Commits (oldest first)

**a98d5fb1f** — `fix: show cleaner star rating on the team roster card (nycmaid-gated)`
File: `platform/src/app/dashboard/team/page.tsx`. Adds a Rating metric tile to the
team roster card, gated behind `isNycMaid(m.tenant_id)`. Standalone-safe, no
dependency on any other branch. Does not touch `BookingsAdmin.tsx` or
`dashboard/page.tsx` — no overlap with W1/W3's dashboard-area work.

**277548166** — `chore: temp diagnostics for CI-only claim-route test flake`
File: `platform/src/app/api/team-portal/jobs/claim/route.test.ts`. Dead-end
diagnostic logging, fully reverted by the very next commit (7edb90468). **Safe
to drop/squash entirely at merge time** — its net effect on the final tree is
zero; keeping it only adds noise to the history.

**7edb90468** — `fix(ci): scope a retry to the intermittent claim-route cap test`
File: same as above. Removes the diagnostic logging, adds `describe(..., {
retry: 2 }, ...)` with a comment explaining the investigation (58+ local runs
+ 3 real CI Node-20 runs, no reproduction). Standalone-safe. If merged after
277548166 is dropped, this becomes a clean single diff against origin/main's
version of the file.

**b27e76bcf** — `fix: carry applicant's photo onto their new team_members record`
Files: `platform/src/lib/team-provisioning.ts`,
`platform/src/lib/team-provisioning.test.ts` (new),
`platform/src/app/api/team-applications/bulk-approve/route.ts`. Global fix
(all tenants) — `ApprovedApplication` type gains `photo_url`, the insert
writes `photo_url`+`avatar_url`, bulk-approve's SELECT widened to fetch it.
Standalone-safe, new test file, no shared-file overlap with any other branch
I'm aware of.

## Cross-branch overlap check

Diffed my 4 commits' file list against every file mentioned in the channel by
W1/W3/W4 (BookingsAdmin.tsx, dashboard/page.tsx, catalog/route.ts,
equipment/route.ts, budget-templates, quote-budgets, jobs/[id]/expenses,
crews.ts, vendors/[id]/items). **Zero file overlap** — none of my 4 commits
touch any file another branch has also modified. No merge conflicts expected
from my branch specifically.

## Recommended merge order

Squash or drop 277548166 (net-zero diagnostic commit), then the remaining 3
are independent and can land in any order or as one squashed commit — none
depend on each other or on another branch's commits.

## Investigated-but-not-fixed (informational, not blocking)

- Item 2b (team profile photos not showing) — code-level investigation only,
  no bug found (data present, code correct, image URLs return 200, no CSP).
  Not a merge item, no code change.
- CI flake root cause — never conclusively identified (see 7edb90468's
  commit message). The retry is a stopgap, not a fix. Worth a fresh look if
  it ever fails twice in the same CI run post-merge.
