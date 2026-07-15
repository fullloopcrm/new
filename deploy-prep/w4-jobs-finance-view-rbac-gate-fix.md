# W4 — GET /api/jobs missing finance.view RBAC gate

## Finding

`GET /api/jobs` ("Jobs list + money reconciliation" — every job for the tenant
with a per-job payment rollup and a tenant-wide total: `contracted`, `paid`,
`due`, `overdue`) called `getTenantForRequest()` directly with **zero
permission check**.

Every sibling money-reconciliation endpoint in the codebase gates on
`finance.view`:
- `GET /api/finance/summary`, `/api/finance/revenue`, `/api/finance/ar-aging`,
  `/api/finance/pnl`, `/api/finance/balance-sheet`, `/api/finance/cash-flow`,
  `/api/finance/payroll`, `/api/finance/pending`, `/api/finance/trial-balance`,
  `/api/finance/bank-accounts`, `/api/finance/bank-transactions`, ...
- `GET /api/invoices`, `/api/invoices/[id]`

Every single route under `/api/finance/*` and `/api/invoices*` (32 route files
checked) requires `finance.view` or `finance.expenses`. `/api/jobs` was the
only money-reconciliation endpoint in the entire API with no gate at all. It
is rendered directly by `app/dashboard/jobs/page.tsx`, a full financial
reconciliation table (per-job contracted/paid/due/overdue, plus tenant-wide
totals) — the same shape of data as `/api/finance/summary`.

## Impact

Unlike this session's other fixes (which were RBAC-override-only gaps because
`staff` has the relevant permission by default), **this was a default-config
privilege escalation**: `finance.view` is granted to `manager`/`admin`/`owner`
only — `staff` does **not** have it by default. Any authenticated `staff`
member could call `GET /api/jobs` and read full per-client financial
reconciliation data (contracted/paid/due/overdue amounts) with zero
permission check, out of the box, no tenant customization required.

## Fix

Gated `GET` on `finance.view` using `requirePermission()`, matching every
other money-reconciliation endpoint (`/api/finance/summary`,
`/api/finance/revenue`, `/api/invoices`, etc.).

## Verification

- New `route.permission-gate.test.ts`: confirms `staff` (no `finance.view` by
  default) gets 403, confirms a role with no permissions gets 403, confirms
  `manager` (has `finance.view` by default) gets 200.
- `npx tsc --noEmit`: clean.
- Full `vitest run`: 308/309 files, 1352/1356 tests pass. The 1 failure is the
  pre-existing, self-documented RED-until-fixed
  `cron/tenant-health/status-coverage-divergence.test.ts` invariant, unrelated
  to this change and flagged repeatedly by other workers this session.

File-only. No push/deploy/DB. Did not touch referrers/referral-commissions/
team-PIN routes.
