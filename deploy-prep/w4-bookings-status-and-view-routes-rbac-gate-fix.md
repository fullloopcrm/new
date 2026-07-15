# W4 — bookings status/view routes RBAC gate (fixed)

## Scope of this sweep
Fresh area, not previously swept: the remaining ungated handlers in the
`bookings` module. A prior sweep this session (`w4-booking-payment-rbac-bypass-fix.md`)
closed `bookings/[id]/payment`, `payments/checkout`, `payments/link`. This
sweep covers everything else in `src/app/api/bookings/**` that still called
`getTenantForRequest()` with no `requirePermission` check.

## Findings

### Primary: `PATCH /api/bookings/[id]/status` — real privilege escalation
Zero permission check on a state-mutating write. `staff` has `bookings.view`
+ `bookings.create` by default but **not** `bookings.edit` — yet this route
let any authenticated tenant member drive any booking through the full
status state machine (`pending → scheduled → confirmed → in_progress →
completed → paid`, plus `cancelled`/`no_show`), which also flips the
mirrored `deals` row's `stage` to `sold`/`lost`. The sibling `PUT
/api/bookings/[id]` (full edit) already gates on `bookings.edit` for the
same underlying resource — this PATCH shortcut bypassed it entirely.

### Secondary (defense-in-depth / RBAC-override consistency):
`GET /api/bookings`, `GET /api/bookings/[id]`, `GET /api/bookings/stats`,
`GET /api/bookings/closeout` had no permission check at all. Every role
currently has `bookings.view` by default, so this isn't an escalation today,
but it is the same asymmetric-gating class fixed elsewhere this session
(clients/campaigns/leads/team/schedules): a tenant that revokes
`bookings.view` from a role via its own RBAC override (`selena_config.role_permissions`)
would have that override silently ignored by these four routes, while the
sibling `GET /api/bookings/[id]` PUT/DELETE and `POST /api/bookings` already
honor it. `closeout` additionally exposes `price`/`pay_rate`/`team_pay`
(payroll figures) with zero gate.

## Fix
- `bookings/[id]/status` PATCH → gated on `bookings.edit` (matches sibling PUT).
- `bookings/route.ts` GET, `bookings/[id]/route.ts` GET, `bookings/stats`
  GET, `bookings/closeout` GET → gated on `bookings.view` (matches sibling
  write handlers in the same files/module).
- Removed now-unused `getTenantForRequest` imports where `requirePermission`
  fully replaced the raw call.

## Tests
- New `bookings/[id]/status/route.permission-gate.test.ts`: staff → 403
  (booking status untouched); manager → 200, status transitions.
- Full existing `src/app/api/bookings/**` suite still green: 8 files / 25
  tests pass unchanged.
- `npx tsc --noEmit` clean.

## Status
File-only, no push/deploy/DB. Committed locally. Did not touch
referrers/referral-commissions/team-PIN routes.
