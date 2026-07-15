# W4 fresh-area finding: notifications feed + comms-preferences routes missing RBAC gate

Refilling per LEADER order 09:10 ("continuing broad-hunt, fresh area, file-only").
Excluded per standing instruction: referrers, referral-commissions, team-PIN routes.

## Method

Grepped every `route.ts` under `src/app/api` for handlers calling
`getTenantForRequest()`/`getCurrentTenant()` without a paired
`requirePermission()` call, then cross-checked the hit list against every
prior W4 `deploy-prep/w4-*.md` doc on this branch to drop anything already
audited (crews/bookings/quotes/finance/settings-services, deals/quotes/
pipeline, leads/*, clients/*, jobs, schedules, team, campaigns, dashboard
widgets, driving-routes, etc. — the vast majority of the hit list was
`admin/comhub/*` and other `admin/*` routes, which use `requireAdmin`
(platform-staff auth), not tenant RBAC, and are out of scope for this sweep).
Two genuinely fresh, unaudited routes remained.

## Finding 1 — `/api/notifications` (admin in-app notification feed + 15-min-warning sender)

`GET`/`POST /api/notifications` (`src/app/api/notifications/route.ts`) called
`getTenantForRequest()` directly with **zero permission check**. `GET` reads
the tenant's admin notification feed (last 50, unread count) and can mark
them all read as a side effect; `POST` (`type: '15min_warning'`) inserts an
admin notification **and sends a real SMS to a client** via `notify()`.

A dedicated `notifications.view` permission already exists in the RBAC
catalog (`src/lib/rbac.ts`) and is used by exactly one other route
(`admin/selena/sms-status`) — every default role (`owner`, `admin`,
`manager`, `staff`) holds it out of the box, so this is purely an
RBAC-override gap (same class as the `leads`/`clients` fixes): a tenant that
explicitly revokes `notifications.view` from a role via
`selena_config.role_permissions` would still have that role able to read the
admin notification feed and trigger client SMS sends through this route.

**Fix:** gated both `GET` and `POST` on `requirePermission('notifications.view')`.

## Finding 2 — `PUT /api/settings/notifications` (tenant-wide comms preferences)

`PUT /api/settings/notifications` (`src/app/api/settings/notifications/route.ts`)
called `getTenantForRequest()` with **zero permission check**, letting any
authenticated tenant member (including `staff`, which has no `settings.*`
permission by default) overwrite the tenant's full notification-preferences
object (which channels — email/sms/in-app — fire per event type, plus
timing). Same shape as the already-fixed `POST /api/settings/services` gap:
a full authz hole for the default `staff` role, not just an override edge
case.

`GET` on the same route was checked and **left ungated on purpose** —
`resend_api_key`/`telnyx_api_key` are read from the DB but only ever
consumed by `deriveCapabilities()` to produce booleans (`email`/`sms`); the
raw keys are never serialized into the response, so there's no secret leak.
Its only two callers, `dashboard/settings/CommunicationsTab.tsx` and
`dashboard/notifications/notifications-settings.tsx` (the settings-gear
widget on `/dashboard/notifications`), are both reachable by `staff`, which
lacks `settings.edit`; gating `GET` would regress that legitimate read for
`staff`, mirroring the `settings/services` `GET` carve-out rationale.

**Fix:** gated `PUT` on `requirePermission('settings.edit')`.

## Verification

- New `src/app/api/notifications/route.permission-gate.test.ts` (4 tests):
  staff GET/POST allowed (default `notifications.view` intact); staff GET/POST
  403 with `notifications.view` explicitly revoked via tenant override, no
  notification row created on the blocked POST.
- New `src/app/api/settings/notifications/route.permission-gate.test.ts`
  (2 tests): staff PUT → 403, no DB update issued; admin PUT (has
  `settings.edit`) → 200, update issued.
- `npx vitest run src/app/api/notifications src/app/api/settings/notifications`
  — 2 files / 6 tests pass.
- `npx tsc --noEmit` — clean, no errors.

Files touched: `platform/src/app/api/notifications/route.ts`,
`platform/src/app/api/settings/notifications/route.ts`, plus the two new
test files above. File-only, no push/deploy/DB. Did not touch
referrers/referral-commissions/team-PIN routes.

## Noticed, not fixed (flagging for a follow-up pass)

- `src/app/api/dashboard/route.ts` (main dashboard aggregator) and
  `src/app/api/dashboard/comms-preview/route.ts` — already flagged in
  `w4-dashboard-widgets-and-tenant-clone-rbac-audit.md` as missing
  `finance.view`/permission gates respectively; still unfixed as of this
  session. Not re-touched here (out of this sweep's fresh-area scope), but
  worth a dedicated fix pass.
- `src/app/api/team-availability/route.ts` — flagged in
  `w4-hr-pin-exposure-and-deals-quotes-rbac-gap-audit.md` as missing a
  `bookings.view` gate; blocked on an auth-helper migration
  (`getCurrentTenant()` → `getTenantForRequest()`), not a one-line fix. Still
  open.
