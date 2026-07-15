# W4 — driving-routes module had zero RBAC gate anywhere (fixed)

## Scope of this sweep
Fresh area, not previously swept on this branch: `invoices/public/[token]/*`
and `quotes/public/[token]/*` (token-authenticated public payment/accept/
decline flows — reviewed, clean: tokens are opaque per-row `public_token`
columns looked up directly, no enumeration surface, Stripe checkout scoped to
the invoice's own tenant key), then `clients/[id]/{contacts,export,transcript}`
(reviewed, clean: every query double-scopes `tenant_id` + the path `id`), then
the dispatch **`routes/*`** module (driving-route planning/optimization/SMS
dispatch to team members) — not previously audited on this branch.

## Finding
Every one of the 5 route handlers in `api/routes/*` called
`getTenantForRequest()` directly — which only authenticates the caller and
resolves their tenant + role — with **no `requirePermission()` check at all**.
Unlike every other tenant-mutation module on this branch (bookings, crews,
clients, schedules, finance), which gates on a specific `Permission` from
`lib/rbac.ts`, this module had no permission gate on the server *or* the
client (`app/dashboard/sales/routes/page.tsx` renders the full routes UI with
no role check either). Worse: there is no `routes.*` permission in the RBAC
catalog at all — this feature was wired up without ever being added to the
permission model.

Concretely, `staff` (the default role — `bookings.view`/`create` only, no
`bookings.edit`, no `schedules.edit`) could, via a valid session on the tenant:

- `GET /api/routes`, `GET /api/routes/[id]` — list/read every driving route,
  including the joined `team_members(phone, home_latitude, home_longitude)`
  PII for that day's dispatched staff.
- `POST /api/routes`, `PATCH /api/routes/[id]` — create/reassign/reschedule
  any route.
- `DELETE /api/routes/[id]` — delete any route outright.
- `POST /api/routes/[id]/optimize` — overwrite a route's stop order.
- `POST /api/routes/[id]/publish` — **trigger a real Telnyx SMS send** (the
  tenant's own live API key) to any team member with the route's stop list
  and a Google Maps link.
- `POST /api/routes/auto-build` — bulk-generate (idempotently *replacing*)
  every route for an arbitrary day, deleting existing routes for touched team
  members first.

Same bug class as the booking-payment RBAC bypass fixed earlier this session
(`d439ddb0`): a module bypasses the tenant's own RBAC because it never calls
`requirePermission` at all, while every sibling module does.

## Fix
There's no dedicated `routes.*` permission in the catalog, so — rather than
add a new permission key mid-sweep (out of scope for a security patch) — I
gated all 5 handlers on the closest existing permission pair, matching the
`view`/`edit` split every other module uses:

- `GET /api/routes`, `GET /api/routes/[id]` → `requirePermission('schedules.view')`
- `POST /api/routes`, `PATCH /api/routes/[id]`, `DELETE /api/routes/[id]`,
  `POST /api/routes/[id]/optimize`, `POST /api/routes/[id]/publish`,
  `POST /api/routes/auto-build` → `requirePermission('schedules.edit')`

`staff` has `schedules.view` but not `schedules.edit` — matching its access
to the sibling recurring-schedules module — so it can still see routes but
not mutate/dispatch them; `manager`/`admin`/`owner` are unaffected.

Two files (`[id]/publish/route.ts`, `auto-build/route.ts`) had a local
`const { data: tenant } = await supabaseAdmin.from('tenants')...` in the same
block as the new `const { tenant, error: authError } = await
requirePermission(...)` destructure, which TS correctly flagged as a
same-scope shadow (`tenant` used before its declaration / TDZ). Renamed the
local variable to `tenantRow` in both — no behavior change.

Left `routes.dashboard/sales/routes/page.tsx` (client) untouched — flagging
here rather than fixing: the "Optimize"/"Publish"/"Delete" buttons render
unconditionally for any role that can reach the page. Server-side gate now
blocks the actual mutation (403), but the UI won't grey out those buttons for
`staff`. Noticed, not fixed — same as the client-side gap noted in the prior
booking-payment report, left for a follow-up UI pass.

## Tests
- New `route.permission-gate.test.ts` per handler (5 files, 14 new tests):
  staff → 403 (and, for optimize/publish, asserts `supabaseAdmin.from` /
  `sendSMS` were never called — the gate short-circuits before any DB or SMS
  side effect); manager/admin → passes the gate through to the DB layer.
- Updated the two existing `route.client-scope.test.ts` files (`routes/`,
  `routes/[id]/`) — their `getTenantForRequest` mock needed a `role: 'admin'`
  field so the new `requirePermission` call doesn't fail-closed against their
  existing team_member_id cross-tenant-scoping assertions.
- Mutation-verified: `git stash`'d the 5 fixed route files (kept the new
  permission-gate tests), ran them — all 14 assertions failed RED (pre-fix
  code has no `requirePermission` import; without it mocked,
  `getTenantForRequest()` throws in the test env and every case 500s instead
  of gating — confirms the gate genuinely didn't exist before this fix).
  `git stash pop` restored the fix — re-ran, all GREEN.
- `npx tsc --noEmit` clean.
- Full suite: 282/283 files, 1281/1285 tests pass (2 expected-fail, 1 skip).
  The 1 failing file (`cron/tenant-health/status-coverage-divergence.test.ts`)
  is the same pre-existing self-documented "RED until fixed" invariant test
  flagged in prior W4 reports this session — unrelated to this change.

## Status
File-only, no push/deploy/DB. Committed locally. Did not touch
referrers/referral-commissions/team-PIN routes.
