# W4 — booking-payment RBAC bypass (fixed)

## Scope of this sweep
Fresh area, not previously swept on this branch: `quotes/public/[token]/*`
(token-authenticated public accept/decline/deposit-checkout — reviewed, clean,
192-bit random token via `randomBytes(24)`, atomic compare-and-swap on status
already guards concurrent accept/decline), then `payments/*` and the sibling
`bookings/[id]/payment` route.

## Finding
`PATCH /api/bookings/[id]/payment`, `POST /api/payments/checkout`, and
`POST /api/payments/link` all called `getTenantForRequest()` (session-auth
only) with **zero `requirePermission` check**. Every other booking-mutation
endpoint in this module gates on `bookings.edit` — most directly, the sibling
`PUT /api/bookings/[id]` requires `bookings.edit` to write the exact same
`team_pay`/`team_paid`/`price` fields this route also writes via a different
path. `staff` (the default role) has `bookings.view` + `bookings.create` but
**not** `bookings.edit` and no `finance.*` permission at all, yet could:

- `PATCH /api/bookings/[id]/payment` — mark any booking `paid` without an
  actual payment (writes `payment_status`, `payment_date`, `status:'paid'`),
  set an arbitrary `tip_amount`, or set `team_pay`/`team_paid` to falsify
  payroll.
- `POST /api/payments/checkout` / `POST /api/payments/link` — generate a real
  Stripe Checkout session / Payment Link against any booking using the
  tenant's own live Stripe key (both routes already correctly scope the
  booking read via `tenantDb()` from a prior round — this is a permission
  gap, not a cross-tenant IDOR).

Confirmed no client-side gating either: `src/app/dashboard/bookings/[id]/page.tsx`
renders "Mark Team Paid" / "Send Payment Link" / "Collect via Stripe" for any
role that can view the booking page (`bookings.view`, which staff has by
default) — the buttons aren't hidden by role.

Same bug class already closed elsewhere on this branch this session
(clients.view/leads.view/team.view/bookings.create gaps): a route bypasses
the tenant's own RBAC customization because it never calls
`requirePermission` at all, while its sibling in the same module does.

## Fix
Gated all three routes on `requirePermission('bookings.edit')`, matching the
sibling `PUT /api/bookings/[id]`. `payments/checkout` and `payments/link`
switched from a manual `getTenantForRequest()` try/catch to
`requirePermission()`, using its returned `tenant.tenantId` in place of the
prior `tenant.tenantId` (unchanged downstream usage otherwise).

## Tests
- New `route.permission-gate.test.ts` for all three routes: staff → 403,
  booking state untouched / Stripe never called; admin → 200, mutation
  applied.
- Updated the two existing `route.tenantdb.test.ts` files (payments/checkout,
  payments/link) — their `getTenantForRequest` mock needed a `role` so the
  new `requirePermission` call in the route doesn't fail-closed against
  their existing IDOR-scoping assertions.
- Mutation-verified: `git stash`'d the three route fixes (kept the new
  tests), ran the new permission-gate tests — all 4 staff-403 assertions
  failed RED (staff got 200 instead of 403) against pre-fix code. Restored
  (`git stash pop`), re-ran — GREEN.
- `npx tsc --noEmit` clean.
- Full suite: 261/262 files, 1210/1214 tests pass. The 1 failing file
  (`cron/tenant-health/status-coverage-divergence.test.ts`) is a
  pre-existing self-documented "RED until fixed" invariant test, unrelated
  to this change (already flagged in a prior W4 report this session).

## Status
File-only, no push/deploy/DB. Committed locally. Did not touch
referrers/referral-commissions/team-PIN routes.
