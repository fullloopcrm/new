# W4 — 17:12 order: onConflict-vs-non-compound-unique-column sweep

File-only, no push/deploy/DB. **No new exploitable gap found.** The
`customer_call_id` fix (aba41390) was the one live instance of this pattern;
every other single-column `onConflict` target checked is safe for a distinct,
verified reason.

## Method

`grep -rn "onConflict"` across `platform/` (excluding node_modules/.next),
then singled out every call whose target is a **single, non-compound**
column — the shape that bit us on `comhub_active_calls.customer_call_id`
(table-wide UNIQUE on a value taken directly from client/external input,
with no tenant_id in the key).

## Single-column onConflict targets, checked one by one

| File | Column | Value origin | Verdict |
|---|---|---|---|
| `admin/comhub/voice/log-softphone-call/route.ts` | `customer_call_id` | `body.telnyx_call_id` (external, client-relayed) | **Already fixed** (aba41390) |
| `admin/comhub/voice/settings/route.ts` | `admin_id` | session-derived | Safe (assessed in prior pass) |
| `admin/comhub/voice/presence/route.ts` | `admin_id` | session-derived | Safe (assessed in prior pass) |
| `google/reviews/route.ts` (PUT) | `tenant_id` | `tenant.tenantId` from `requirePermission()` session | Safe — server-derived, not client input |
| `admin/billing/route.ts` | `tenant_id` | session-derived | Safe — same reasoning |
| `dashboard/hr/[id]/route.ts` | `team_member_id` | URL path param, **but** pre-verified via `.eq('tenant_id', tenantId).eq('id', id)` lookup before the upsert, and `team_members.id` is a DB-generated UUID PK (not client-chosen at creation) | Safe — value can't be attacker-chosen to collide; a Tenant-B admin supplying Tenant-A's real UUID gets 404 from the ownership check, not a way to plant their own colliding value |
| `lib/seo/overrides.ts` (`applyOverride`) | `url` | admin request body | Safe — only reachable via `admin/seo/apply/route.ts`, gated `role === 'super_admin'` (FL-internal only, confirmed in the 05:33 seomgr-lane pass); not a multi-tenant-facing surface |
| `lib/seo/ingest.ts` (`upsertProperty`) | `property` | GSC `sites.list()` response (server-side service-account call) | Safe — not client input at all |
| `lib/seo/onboarding.ts` (`registerSeoProperty`) | `property` | derived from tenant's own activation domain, `ignoreDuplicates: true` | Safe — server-derived, non-destructive |
| `cron/tenant-health/route.ts` | `domain` | pulled from `tenant_domains` table rows, not request input | Safe — cron job, no client input in the key |
| `scripts/onboard-tenant-site.ts` | `slug`, `domain` | CLI args to an offline operator script | Safe — not an API route, not attacker-reachable |
| `scripts/migrate-from-nycmaid.ts` | `conflictKey` (var) | one-off migration script | Safe — not attacker-reachable |
| `lib/activate-tenant.ts` | `domain` | internal activation flow, `ignoreDuplicates: true` | Safe |

All remaining `onConflict` call sites in the grep use **compound** keys
(`channel_id,reader_type,reader_id`; `tenant_id,domain`; `tenant_id,code`;
`tenant_id,entity_id,year,month`; etc.) — the shape that was already safe by
construction, since collision requires an attacker to also match a
tenant-scoped or session-derived discriminator, not just guess one
client-supplied string.

## Conclusion

The `customer_call_id` bug was the one place a table-wide unique constraint
sat directly on unvalidated external/client input with no tenant
discriminator in the key. Sweep is clean; no follow-up fix needed from this
pass. Continuing per the LEADER order's fallback: moving to broad-hunt on
other surfaces / keeping gap-fluidity current.
