# dashboard/settings' "Broadcast to All Team Members" + "Run Backup Now" buttons never worked, always claimed success (2026-07-18 02:18)

## Fresh-ground discovery (LEADER item 1)

Swept `src/app/dashboard` for the exact anti-pattern the tenant_domains lane
keeps surfacing this session in other forms: a client action that reports
success unconditionally, no matter what actually happened server-side.
`grep -n "^\s*await fetch(" src/app/dashboard --include="*.tsx"` found 47
call sites where the `fetch()` result is discarded outright (no `res.ok`
check). Most are DELETE/toggle actions where a discarded response is a
lesser "silent local-state drift on failure" bug (already a known, lower-
severity class). Two, both in `dashboard/settings/page.tsx`, were worse: the
target route doesn't reach the intended handler **at all**, so the button has
never worked once, ever, for any tenant — yet both show an unconditional
"success" alert regardless.

**`broadcastGuidelines()`** (Settings → guidelines tab → "Broadcast to All
Team Members") POSTed to `/api/settings/broadcast-guidelines` — a path that
has never existed anywhere in the API tree (confirmed via `find`). Every
click 404s. The real route, `/api/admin/broadcast-guidelines`, already
existed, already worked correctly (tenant-scoped via
`requirePermission('team.edit')`, has its own 9-test suite), and was simply
never wired to this button. The frontend never checked `res.ok` either, so
even a correct call would have shown "sent" on a real failure.

## Continuation, worse instance (LEADER item 2)

**`runBackup()`** (Settings → Danger Zone → "Run Backup Now", copy reads
"Automated daily backups run at midnight... Run Backup Now") was broken on
every axis at once, not just the URL:

1. POSTed to `/api/cron/backup`, which only exports a `GET` handler — Next
   returns 405 automatically before the route body ever runs.
2. That route is `verifyCronSecret`-gated (bare `Authorization: Bearer
   <CRON_SECRET>` compare) — the browser never sends that header, so even a
   `POST` handler would 401.
3. Worse than (1)/(2): even with both fixed, the route's actual behavior is
   platform-wide — it loops **every active tenant** and snapshots each one
   to storage. Wiring this button straight to that route (the naive fix)
   would let any tenant's own owner/admin trigger a full-platform export of
   every OTHER tenant's data from their own settings page. This is the
   "worse instance" this LEADER queue shape usually finds on the second
   pass — not just a wrong URL like (1), but a scope mismatch that a
   one-line URL swap would have turned into a cross-tenant data-exposure
   bug instead of just fixing the 404.

**Fix:** extracted the per-tenant backup body (data reads + storage upload)
out of `cron/backup/route.ts`'s loop into a shared `backupTenant(tenant)` in
new `src/lib/tenant-backup.ts` — same snapshot shape, same
`backups/<slug>/<date>.json` storage path, `upsert: true`. `cron/backup`'s
`GET` now calls it once per tenant in its existing loop (pure extraction,
verified via `git diff` — logic unchanged). New `POST /api/settings/backup`
calls it exactly once, for only the calling tenant, gated by
`requirePermission('settings.edit')` — the same permission scope the rest of
`/api/settings/*` already uses. Both `broadcastGuidelines()` and
`runBackup()` in `settings/page.tsx` now point at the correct routes, check
`res.ok`, and surface the real error (or, for the broadcast, the real
`sent`/`total` counts) instead of an unconditional alert.

Confirmed via `find`/`grep` that none of the other 45 discarded-`fetch()`
call sites hit a genuinely nonexistent route or wrong HTTP verb (spot-checked
the ones with the least-obviously-matching paths: `bookings/broadcast`,
`admin/schedule-issues/fix`, `social/accounts`, `finance/cpa-tokens`,
`connect/messages`, `dashboard/onboarding/profile`, `google/reviews`,
`google/posts`, `sales-applications` — all exist). This specific "route
literally doesn't reach its handler" severity appears fully swept for
`dashboard/*`; the remaining 45 sites are the lesser silent-local-state-drift
class, not fixed here (see Noticed below).

## Files (file-only, no push/deploy/DB)

- `src/lib/tenant-backup.ts` — new. `backupTenant(tenant)`, extracted
  verbatim from `cron/backup`'s loop body.
- `src/lib/tenant-backup.test.ts` — new, 3 tests: uploads a dated snapshot
  and returns ok, returns `ok:false` with the storage error message on
  upload failure, catches a thrown read error instead of rejecting.
- `src/app/api/cron/backup/route.ts` — loop body replaced with a call to
  `backupTenant()`; `GET`/`verifyCronSecret` gate and all-tenants behavior
  unchanged.
- `src/app/api/settings/backup/route.ts` — new. `POST`,
  `requirePermission('settings.edit')`, backs up only `ctx.tenantId`.
- `src/app/api/settings/backup/route.test.ts` — new, 3 tests: propagates the
  permission error unchanged, backs up only the calling tenant (asserts the
  exact `{id, slug}` passed to `backupTenant`, not "every tenant"), returns
  500 with the underlying error on failure.
- `src/app/dashboard/settings/page.tsx` — `broadcastGuidelines()` now calls
  `/api/admin/broadcast-guidelines`, checks `res.ok`, alerts real
  `sent`/`total` counts or the real error. `runBackup()` now calls
  `/api/settings/backup`, checks `res.ok`, alerts the real error on failure.

## Verification

- `tsc --noEmit --pretty false`: 0 new errors — same 5 pre-existing baseline
  errors as every pass this session (`admin-auth` route-types, 2 unrelated
  pre-existing test files, `sunnyside-clean-nyc` nav import), confirmed via
  before/after diff of the full error list.
- `eslint` on all 6 touched/added files: 0 errors. The 2 warnings in
  `settings/page.tsx` (`_staleSelenaConfig`, `maskKey` unused) are
  pre-existing, unrelated to this change.
- New tests: 6/6 pass (`tenant-backup.test.ts` ×3, `settings/backup/
  route.test.ts` ×3).
- `cron/backup/route.ts` extraction verified as behavior-preserving via
  `git diff` — the loop body is a straight extraction into `backupTenant()`,
  no logic changed (no prior test file existed for this route to regress).
- Full suite: `npx vitest run` — 630/630 files, 3356 passed + 1 pre-existing
  expected-fail (was 628/3350+1 at session start today, +2 files/+6 tests,
  0 regressions).

File-only, no push/deploy/DB. No schema/migration involved — both bugs and
their fixes are pure application code (routing + auth-scope + response
handling); `tenant_domains` itself is unchanged this round.

## Noticed (not fixed, flagging per scope discipline)

- The other 45 `dashboard/*` call sites that discard their `fetch()` result
  (DELETE/PATCH toggles like `settings/services/[id]`, `catalog`,
  `schedules/[id]/pause`, `team/[id]`, etc.) have the lesser "silently drifts
  local UI state from DB state on a failed request" bug, not the "route
  doesn't exist" severity fixed here. Genuinely fixing all 45 well (checking
  `res.ok`, reverting optimistic state, surfacing the error) is a much larger
  and more product-judgment-laden sweep than this item — flagging for
  Jeff/leader rather than folding into this pass.
- `dashboard/settings/page.tsx`'s `deleteAllData()` (Danger Zone) is a stub —
  `prompt('Type DELETE...')` then just `alert('Contact support to complete
  this action.')`, no fetch at all. Intentional stub, not a bug — noting only
  because it sits directly next to the two real bugs fixed here.
