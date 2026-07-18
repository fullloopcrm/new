# cron/backup's "Nightly Backup Complete" summary was silently attached to an arbitrary real tenant's dashboard (2026-07-18 08:01)

## Fresh-ground discovery

Continuing tonight's fresh-ground sweep after the `payroll_payments` fix, I
checked the platform's other cron surfaces for the same class of bug already
found repeatedly this session: one write path drifting from an established,
repeated convention.

`GET /api/cron/backup` loops every active tenant, calls `backupTenant()`
(nightly JSON snapshot export), then logs a single cross-tenant summary row
to `notifications` — e.g. `"7 tenants backed up successfully. 1 errors:
acme-nyc: storage upload failed"`. This message aggregates every tenant's
outcome, including other tenants' slugs in the error text — the same shape
as `system-check`, `health-monitor`, `comms-monitor`,
`generate-monthly-invoices`, and every other platform-wide cron's
`notifications` insert in this codebase. Every one of those omits
`tenant_id` entirely on the insert, each marked with the same comment:
`// tenant-scope-ok: cron job runs platform-wide across all tenants by
design`. `admin/notifications` (the real consumer, `requireAdmin`-gated,
cross-tenant by design) reads all rows regardless of `tenant_id` and needs
no tenant scoping to work.

`cron/backup` was the one write path that didn't follow this: it picked
`const superAdminTenant = tenants?.[0]` — the first row of an **unordered**
`select('id, name, slug').eq('status', 'active')` query — and stamped that
tenant's real `id` onto the cross-tenant summary row.

Two live consequences on whichever tenant happens to sort first:

1. **`GET /api/sidebar-counts`** counts that tenant's unread notification
   badge via `tenantDb(tenantId).from('notifications')...eq('read', false)`
   — no `recipient_type` filter. `read` defaults to `false`
   (`009_nycmaid_parity_columns.sql`) and this insert never sets it, so
   every night's backup-complete row silently increments that one real
   tenant's dashboard badge count.
2. **It can never be opened or cleared.** The only content-displaying /
   mark-read path, `GET /api/notifications`, filters
   `.eq('recipient_type', 'admin')` (`src/app/api/notifications/route.ts`)
   — this insert never sets `recipient_type` (defaults to SQL `NULL`,
   confirmed against `supabase/schema.sql`: `recipient_type TEXT` with no
   default), so the row never matches and is never marked read. The badge
   count for that one tenant grows by one every night, forever, with no way
   for that tenant's own admin to see what caused it or clear it — a
   permanent, unexplained, unclearable notification-badge leak driven by
   *other tenants'* nightly backup outcomes.

Whether `active`-status tenants sort stably as `tenants?.[0]` isn't
guaranteed (no `.order()` on the query) — in practice it's very likely
sticky (physical row order rarely changes), so this has probably been
quietly inflating the same one tenant's badge every night since the backup
cron shipped.

## Fix (file-only, no push/deploy/DB)

- `src/app/api/cron/backup/route.ts` — dropped `tenant_id:
  superAdminTenant.id` (and the now-unnecessary `superAdminTenant`
  variable) from the `notifications` insert, matching the established
  platform-wide-cron convention exactly (omit `tenant_id`, same inline
  `tenant-scope-ok` comment as every sibling). No schema/migration change
  needed — `tenant_id` is already omittable on every other platform-wide
  cron's insert into this same table.

## Tests

- New `src/app/api/cron/backup/route.notification-scope.test.ts` (2 tests,
  `@/test/fake-supabase`, `backupTenant` mocked so the test is only
  exercising `route.ts`'s own notification-scoping logic): the summary row
  never carries `tenant_id`; no row is written when there's nothing to
  report. RED-confirmed via `git apply -R` on a saved patch (this worktree
  shares a `.git` dir with other active workers; patch-based revert avoids
  the stash collision risk flagged earlier this session) — failed with the
  exact `'tenant-a'` vs `undefined` mismatch against pre-fix code, not a
  generic failure. Reapplied, confirmed GREEN.
- `npx tsc --noEmit` clean on both changed files (pre-existing unrelated
  errors in other workers' in-progress files and a stale `.next/dev` type
  artifact are untouched by this change).

## Scope note

This route lives outside my named lane (schema + backfill / tenant_domains)
but matches this session's established broad fresh-ground pattern across
`p1-w1`'s prior commits (payroll_payments, bank-import, categorization
collisions, etc.) — a real, live, file-only-fixable bug found while
sweeping cron surfaces for the same convention-drift class already fixed
repeatedly tonight.
