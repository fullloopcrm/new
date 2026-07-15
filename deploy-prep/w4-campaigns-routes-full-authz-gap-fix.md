# W4 fresh-area finding: campaigns routes missing RBAC gate entirely (not just asymmetric)

## Bug

`GET /api/campaigns` and all three handlers on `GET`/`PUT`/`DELETE /api/campaigns/[id]` (`platform/src/app/api/campaigns/route.ts`, `platform/src/app/api/campaigns/[id]/route.ts`) called `getTenantForRequest()` directly with **no `requirePermission` check** — despite `campaigns.view`/`campaigns.create`/`campaigns.send` being defined RBAC permissions. Sibling `POST /api/campaigns` already requires `campaigns.create`, and `campaigns/send/route.ts` (POST + PUT) already requires `campaigns.create`/`campaigns.send`.

Unlike this session's other RBAC-gate fixes (`leads/*`, `schedules/*`, `clients/*`), this one is **not** an RBAC-override edge case — it's a full default-role gap:
- `staff` has **zero** `campaigns.*` permissions by default (`platform/src/lib/rbac.ts`)
- `manager` has only `campaigns.view` (no create/send)

So with the pre-fix code, **any authenticated tenant member of any default role, including `staff`**, could:
- list every campaign, including draft subject/body content and recipient filters (`GET /api/campaigns`)
- read a single campaign's full record (`GET /api/campaigns/[id]`)
- **edit** any campaign's name/type/subject/body/recipient_filter/status/scheduled_at (`PUT /api/campaigns/[id]`)
- **delete** any campaign (`DELETE /api/campaigns/[id]`)

None of these four handlers are in the excluded team-PIN/referrers/referral-commissions set.

## Fix

- `GET /api/campaigns` → `requirePermission('campaigns.view')`
- `GET /api/campaigns/[id]` → `requirePermission('campaigns.view')`
- `PUT /api/campaigns/[id]` → `requirePermission('campaigns.create')`
- `DELETE /api/campaigns/[id]` → `requirePermission('campaigns.create')`

There is no separate `campaigns.edit`/`campaigns.delete` permission defined in the RBAC catalog. Used `campaigns.create` for the two mutating handlers, matching the existing convention: `campaigns/send/route.ts`'s `PUT` (retry-failed-recipients, also a mutating non-create action) already gates on `campaigns.create`, establishing it as this feature's general write permission.

Files:
- `platform/src/app/api/campaigns/route.ts`
- `platform/src/app/api/campaigns/[id]/route.ts`

## Verification

- Confirmed against `platform/src/lib/rbac.ts`: `owner`/`admin` have `campaigns.view`+`campaigns.create`+`campaigns.send`; `manager` has `campaigns.view` only; `staff` has none. This fix changes behavior for `staff` (now correctly blocked from all four operations) and for `manager` on `PUT`/`DELETE` (now correctly blocked, previously could edit/delete despite lacking any create permission) — both are closing a real gap, not a UI regression, since no dashboard surface exposes campaign edit/delete to staff or manager.
- New `route.permission-gate.test.ts` in both `campaigns/` and `campaigns/[id]/` (8 new tests total): `GET` denies `staff`/allows `manager`; `PUT`/`DELETE` deny `manager` (has view but not create) and allow `admin` (has create).
- Mutation-verified: `git stash`'d the two source fixes (tests untouched) and reran — all 4 "denied" assertions (`GET` staff, `[id] GET` staff, `PUT` manager, `DELETE` staff) went RED at 200 against the pre-fix code. Restored via `git stash pop`, reran — all 8 GREEN.
- `npx tsc --noEmit`: clean.
- `npx vitest run`: 302/303 files, 1337/1341 tests pass (1 pre-existing self-documented "RED until fixed" `cron/tenant-health/status-coverage-divergence.test.ts` invariant test flagged in prior W4 reports, plus 2 expected-fail + 1 skipped — all unrelated).

File-only, no push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.
