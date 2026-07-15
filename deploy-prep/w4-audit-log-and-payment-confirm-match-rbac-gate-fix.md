# W4 — audit log + admin payment confirm-match RBAC gate (fixed)

## Scope of this sweep
Fresh area, broad-hunt continuation. Compared every route file calling
`getTenantForRequest()` against every route file calling `requirePermission()`
to find handlers that authenticate a tenant member but never check a specific
permission. Picked the two findings with real business/security impact and
an existing sibling route proving the correct gate.

## Findings

### `GET /api/audit` — client-side-only gate, no server check
The dashboard nav (`dashboard-shell.tsx`) only shows the "Activity" link for
roles with `audit.view`, and `staff`/`manager` lack `audit.view` by default.
But the API itself called `getTenantForRequest()` with zero permission check,
so any authenticated tenant member could read the full tenant-scoped audit
log (`audit_logs`, paginated, filterable by `entity_type`) by hitting the
endpoint directly — the RBAC gate existed only in the UI, not the server.
Gated on `audit.view` via `requirePermission`, matching the permission the
frontend already assumes is enforced.

### `POST /api/admin/payments/confirm-match` — financial write, no gate
Manually matches an unmatched Zelle/Venmo payment to a booking: marks the
`unmatched_payments` row matched, inserts a `payments` row, flips the
booking's `payment_status` to paid/partial, and computes/records a
team-member tip. Zero permission check — any authenticated tenant member
could confirm arbitrary payment matches. The sibling
`/api/finance/bank-transactions/[id]/match` (same "manually match a payment"
class) already gates on `finance.expenses`, and `/api/finance/mark-paid`
(same "flip booking payment_status" class) already gates on
`finance.payroll`. This route matches `mark-paid`'s effect (payment_status +
tip recording) most closely, so gated on `finance.payroll` for consistency.
`staff`/`manager` lack `finance.payroll` by default.

## Fix
- `audit/route.ts`: replaced raw `getTenantForRequest()` + manual `AuthError`
  catch with `requirePermission('audit.view')`.
- `admin/payments/confirm-match/route.ts`: replaced raw
  `getTenantForRequest()` with `requirePermission('finance.payroll')`.
  Renamed the destructured tenant context to `authTenant` to avoid colliding
  with the pre-existing `const { data: tenant }` (tenants-table row) declared
  later in the same function.

## Tests
- New `audit/route.permission-gate.test.ts`: staff → 403, manager → 403,
  admin → 200 with logs returned.
- New `admin/payments/confirm-match/route.permission-gate.test.ts`: staff →
  403 (booking/unmatched-payment rows untouched), manager → 403, admin → 200
  with booking flipped to paid.
- `npx tsc --noEmit` clean.
- No pre-existing tests in either directory to regress against (both were
  previously untested at the route level).

## Status
File-only, no push/deploy/DB. Committed locally. Did not touch
referrers/referral-commissions/team-PIN routes.
