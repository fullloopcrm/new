# W4 fresh-area finding: catalog CRUD bypass + security events RBAC gate

Refilling per LEADER order 09:24 ("continuing broad-hunt, fresh area, file-only").
Excluded per standing instruction: referrers, referral-commissions, team-PIN routes.

## Method

Grepped every `route.ts` under `src/app/api` for handlers calling
`getTenantForRequest()`/`getCurrentTenant()` without a paired
`requirePermission()` call (~75 hits), filtered out `admin/*` routes (use
`requireAdmin` platform-staff auth, not tenant RBAC — out of scope, established
in prior sweeps), then cross-checked the remainder against every prior W4
`deploy-prep/w4-*.md` report on this branch to drop already-audited ground.

Also re-verified the four still-open items noted in
`w4-dashboard-widgets-and-tenant-clone-rbac-audit.md`
(`dashboard/route.ts`, `dashboard/comms-preview/route.ts`,
`dashboard/import/analyze/route.ts`, `dashboard/onboarding/route.ts`) and the
one noted in `w4-hr-pin-exposure-and-deals-quotes-rbac-gap-audit.md`
(`team-availability/route.ts`) — **all five are already fixed** in current
code (someone closed them out since those reports were written; no action
needed there).

## Finding 1 — `POST/PATCH/DELETE /api/catalog` bypasses the already-established `sales.edit` gate

`src/app/api/catalog/route.ts` and `src/app/api/settings/services/route.ts`
are two separate CRUD surfaces over the **same** `service_types` table
(confirmed: identical columns, same tenant scoping). `settings/services`
already gates its `POST` on `settings.edit`. `/api/catalog` had **zero
permission check** on `POST`/`PATCH`/`DELETE` — any authenticated tenant
member, including `staff` (which has only `sales.view`, not `sales.edit`,
by default), could create, edit, or delete pricing catalog items by hitting
`/api/catalog` instead of `/api/settings/services`, fully bypassing the
existing gate.

`/api/catalog` is the live surface — it's what `dashboard/sales/CatalogTab.tsx`
and `dashboard/sales/quotes/_QuoteBuilder.tsx` actually call, not
`/api/settings/services`. It lives under the Sales tab and is a sibling of the
`quotes`/`deals`/`documents`/`quote-templates` surface, which all gate writes
on `sales.edit` (not `settings.edit` — that's the correct permission group for
this feature, confirmed via `PERMISSION_CATALOG` in `src/lib/rbac.ts`).

**Fix:** gated `POST`, `PATCH`, `DELETE` on `requirePermission('sales.edit')`.
Left `GET` ungated, matching the sibling route's rationale (read-only pricing
catalog needs to be visible to anyone building a quote, including `staff`,
which has `sales.view` only).

## Finding 2 — `GET /api/security/events` — no permission check on sensitive security log

`src/app/api/security/events/route.ts` reads the tenant's `security_events`
table (logins, password changes, API key changes, member added/removed,
plan/status changes, suspicious logins — including raw IP address and user
agent per event) with only `getTenantForRequest()`, no permission check. This
is the same class of gap as the already-fixed `/api/audit` endpoint (audit
log): a security-sensitive, tenant-wide record readable by any authenticated
member regardless of role. No dedicated `security.*` permission exists in the
RBAC catalog; `audit.view` is the correct sibling gate (same "who gets to see
sensitive tenant-wide activity history" class, same permission used for the
audit log fix). `staff`/`manager` lack `audit.view` by default; `admin`/`owner`
have it.

No current frontend page calls this route (only referenced in
`admin/docs/page.tsx`'s API reference table), but it's a live, unauthenticated
(at the permission level) endpoint reachable by direct API call from any
logged-in tenant member.

**Fix:** replaced raw `getTenantForRequest()` with
`requirePermission('audit.view')`.

## Verification

- New `src/app/api/catalog/route.permission-gate.test.ts` (5 tests): staff
  GET allowed; staff POST/PATCH/DELETE → 403, no row created/updated/deleted;
  manager (has `sales.edit`) → 200 on create/edit/delete.
- New `src/app/api/security/events/route.permission-gate.test.ts` (3 tests):
  staff → 403; manager → 403; admin (has `audit.view`) → 200 with events
  returned.
- `npx tsc --noEmit` — clean.
- Full `vitest run` — 312/313 files, 1366/1370 tests pass. The 1 failure is
  the pre-existing, self-documented RED-until-fixed
  `cron/tenant-health/status-coverage-divergence.test.ts` invariant,
  unrelated to this change and flagged repeatedly by other workers this
  session.

Files touched: `platform/src/app/api/catalog/route.ts`,
`platform/src/app/api/security/events/route.ts`, plus the two new test files
above. File-only, no push/deploy/DB. Did not touch
referrers/referral-commissions/team-PIN routes.
