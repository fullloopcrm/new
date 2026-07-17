# Broad-hunt — W4, 2026-07-17 14:14 order (item 1: new fresh-ground surface)

File-only, no push/deploy/DB.

## Finding + fix: cron/backup logged its platform-wide summary into an
## arbitrary, unrelated tenant's own `notifications` row

`src/app/api/cron/backup/route.ts` (nightly per-tenant JSON snapshot backup,
CRON_SECRET-gated) ends its run with:

```ts
const superAdminTenant = tenants?.[0]
if (superAdminTenant) {
  await supabaseAdmin.from('notifications').insert({
    tenant_id: superAdminTenant.id,
    type: 'platform',
    title: 'Nightly Backup Complete',
    message: `${backed} tenants backed up successfully.${errors.length > 0 ? ` ${errors.length} errors: ${errors.join(', ')}` : ''}`,
    channel: 'in_app',
  })
}
```

`tenants[0]` is whichever row the unordered `.eq('status','active')` query
happens to return first — an arbitrary, real tenant with no relationship to
the backup run or to any tenant that failed. Two problems:

1. **Cross-tenant content leak.** `errors` is built as
   `` `${tenant.slug}: ${message}` `` for every tenant whose backup failed.
   If tenant A sorts first and tenant B's backup fails, tenant B's slug and
   raw error text get written straight into **tenant A's own**
   `notifications` row — a tenant with zero connection to B.
2. **Permanent phantom unread badge.** The insert sets no `recipient_type`,
   so it's invisible to the notification-bell endpoint
   (`/api/notifications` GET filters `.eq('recipient_type','admin')`), but
   `sidebar-counts` counts unread by `.eq('tenant_id', tenantId).eq('read',
   false)` with **no** `recipient_type` filter — so it silently increments
   that arbitrary tenant's sidebar notification badge every night, and
   nothing in the mark-read path (which only updates rows the bell endpoint
   itself fetched) ever clears it.

Every sibling cron job that needs to alert Jeff about a platform-wide event
(`cron/system-check`, confirmed via `alertOwner` import) already uses
`alertOwner()` from `@/lib/telegram` — a direct Telegram DM to Jeff, not a
write into any tenant's data. `cron/backup` was the only cron route in the
whole `cron/*` tree using the `tenants?.[0]` shape (grepped, zero other
matches) — an outlier, not an intentional convention.

**Fix:** replaced the tenant-notification insert with `alertOwner()`,
matching the established sibling pattern exactly (subject + detail,
`.catch(() => {})` so a Telegram hiccup can't fail the cron run).

## Verification

New test `route.cross-tenant-notification-leak.test.ts`: seeds tenant-A then
tenant-B (so `tenants[0]` = tenant-A, the old code's target), fails only
tenant-B's storage upload. Two assertions:
- `notifications` table has zero rows after the run (nothing written to any
  tenant).
- `alertOwner` was called once, with tenant-B's slug + error text in the
  detail.

Mutation-verified: reverted the route fix via `git apply -R` on the diff,
reran the same test — both assertions failed exactly as expected (1
notification row landed on `tenant-A` containing `bbb-co`/`boom: disk
quota`; `alertOwner` was never called). Reapplied the fix, GREEN again.

`tsc --noEmit`: same 3 pre-existing unrelated errors only
(`bookings/broadcast/route.xss.test.ts`,
`site/sunnyside-clean-nyc/_lib/site-nav.ts` x2) — none in touched files.
`vitest run src/app/api/cron/backup`: 2/2 pass.

## Surface note for next pass

Read the rest of `cron/*` looking for the same `tenants?.[0]`
platform-notification shape — confirmed via grep this is the only instance.
Did not do a full line-by-line read of every other `cron/*` job this pass;
good next-target if continuing this surface (candidates not yet read this
session: `cron/comhub-email`, `cron/comms-monitor`, `cron/email-monitor`,
`cron/outreach`, `cron/refresh-job-postings`, `cron/sales-follow-ups`,
`cron/sync-google-reviews`).

No push/deploy/DB write.
