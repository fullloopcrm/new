# W4 fresh-area finding: POST /api/settings/services missing settings.edit gate

## Bug

`POST /api/settings/services` (`platform/src/app/api/settings/services/route.ts`) called `getTenantForRequest()` directly with **no `requirePermission` check**, while its own sibling routes on the same resource were already gated:

- `PUT /api/settings/services/[id]` → `requirePermission('settings.edit')`
- `DELETE /api/settings/services/[id]` → `requirePermission('settings.edit')`

`staff` has no `settings.*` permission by default (`rbac.ts`), so this was a full authz gap, not just an RBAC-override edge case: any authenticated tenant member, including `staff`, could create a new service/pricing catalog entry (`service_types` row — name, duration, hourly rate, `pricing_model`, `price_cents`, `min_charge_cents`) that then feeds booking and quote pricing. Renaming, repricing, or deleting an existing service already required `settings.edit`; creating one didn't.

## Fix

Gated `POST` on `requirePermission('settings.edit')`, matching sibling `PUT`/`DELETE` in `[id]/route.ts`.

Left `GET /api/settings/services` **ungated** on purpose — unlike the write path, it's consumed outside the Settings page (`dashboard/schedules/page.tsx` fetches it to populate service pricing for staff building a schedule), and `staff` lacks `settings.view` by default. Gating GET would have regressed that legitimate flow; the read side isn't the same asymmetric-gating bug since there's no sibling read permission it's diverging from.

File: `platform/src/app/api/settings/services/route.ts`

## Verification

- New `route.permission-gate.test.ts`: staff POST → 403, no row created; admin POST (has `settings.edit`) → 201, row created. Ran RED (pre-fix) → GREEN (post-fix) by re-checking the diff logic against the test before/after the edit.
- `npx vitest run src/app/api/settings` — 3 files / 7 tests pass (includes the new test plus the existing `[id]` permission-gate test and one other settings test).
- `npx tsc --noEmit` — clean.

File-only, no push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.
