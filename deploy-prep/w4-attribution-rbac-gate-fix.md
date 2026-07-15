# W4 fresh-area finding: /api/attribution + /api/attribution/manual RBAC gap

Refilling per LEADER order 09:38 ("continuing broad-hunt, fresh area, file-only").
Excluded per standing instruction: referrers, referral-commissions, team-PIN routes.

## Method

Built a list of every `route.ts` under `src/app/api` and diffed it against
every route prefix already mentioned across `LEADER-CHANNEL.md` (all workers,
full session) to find directories no one had reported on yet. Landed on a
cluster of small, previously-unmentioned top-level API dirs: `attribution`,
`announcements`, `cleaner-applications`, `client-analytics`, `domain-notes`,
`permissions`, `quote-templates`, `recurring-expenses`, `service-types`,
`territories`. Read each `route.ts`. Most were already correctly gated
(`recurring-expenses` on `finance.view`/`finance.expenses`, `quote-templates`
on `sales.view`/`sales.edit`, `domain-notes` on `settings.view`/`settings.edit`,
`client-analytics` on `clients.view`) or intentionally public/unauthenticated
by design (`territories/options` — explicitly commented public+PII-free,
`service-types` — public tenant-facing config, `permissions/me` — UX-only,
enforcement happens per-route elsewhere). `cleaner-applications/route.ts` is
just a re-export alias of the already-gated `team-applications` handlers.

`attribution/route.ts` and `attribution/manual/route.ts` stood out: both call
`getTenantForRequest()` directly with **zero permission check** on every
handler.

## Finding — `/api/attribution` and `/api/attribution/manual` have no RBAC gate at all

`src/app/api/attribution/route.ts`:
- `GET` (no `booking_id`) returns tenant-wide attribution stats per domain
  (booking counts, revenue, avg confidence).
- `GET ?booking_id=X` returns a single booking's client name/address plus
  attribution debug detail.
- `POST` runs the bulk re-attribution job over up to 10,000 unattributed
  bookings, writing `attributed_domain`/`attribution_confidence`/`attributed_at`
  back onto each match. `POST ?reset=true` additionally **clears** attribution
  on every already-attributed booking before re-running.

`src/app/api/attribution/manual/route.ts`:
- `GET` lists the 20 most recent bookings with client name/address/phone
  (PII) plus current attribution state.
- `POST` lets the caller manually overwrite any single booking's
  `attributed_domain` to an arbitrary string and fires a `new_lead`
  notification.

None of the four handlers had any permission check — only
`getTenantForRequest()`, which authenticates *any* role on the tenant. Any
`staff` member (default role set: `clients.view`, `bookings.view/create`,
`team.view`, `schedules.view`, `reviews.view`, `sales.view`,
`notifications.view` — no lead/marketing-attribution permission at all)
could pull this data or overwrite attribution on demand.

The sibling surface `/api/leads/attribution` (a different route serving
referrer-breakdown stats, already fixed by a prior worker this session) and
`/api/leads/override` both gate on `leads.view` — same permission class
("who gets to see/edit lead-sourcing data"), same missing-by-default role
(`staff`). Matched that precedent here rather than inventing a new
permission, since no `leads.edit` exists in the RBAC catalog (`leads.view`
is used for lead-related writes too, per `leads/override`'s existing
precedent).

**Fix:** gated all four handlers (`GET`/`POST` in both files) on
`requirePermission('leads.view')`.

## Verification

- New `src/app/api/attribution/route.permission-gate.test.ts` (3 tests):
  staff → 403 on GET (stats) and POST (attribution run, bookings untouched);
  manager (has `leads.view`) → 200 on both.
- New `src/app/api/attribution/manual/route.permission-gate.test.ts` (3
  tests): staff → 403 on GET (booking list) and POST (attribution override,
  booking untouched, no notification inserted); manager → 200 on both,
  booking updated, notification inserted.
- `npx tsc --noEmit` — clean.
- Full `vitest run` — 314/315 files, 1372/1376 tests pass (2 expected-fail +
  1 skipped accounted for). The 1 failing file is the pre-existing,
  self-documented RED-until-fixed
  `cron/tenant-health/status-coverage-divergence.test.ts` invariant,
  unrelated to this change and already flagged repeatedly by other workers
  this session.

Files touched: `platform/src/app/api/attribution/route.ts`,
`platform/src/app/api/attribution/manual/route.ts`, plus the two new test
files above. File-only, no push/deploy/DB. Did not touch
referrers/referral-commissions/team-PIN routes.
