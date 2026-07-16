# tenantDb().upsert() doesn't filter its ON CONFLICT match by tenant_id

Status: documented landmine, NOT currently exploitable, NOT code-changed (see below for why).

## The gap

`src/lib/tenant-db.ts`'s `tenantDb(tenantId)` wrapper auto-scopes every operation to the
caller's tenant EXCEPT `upsert()`:

```ts
select: (...) => base.select(...).eq('tenant_id', tenantId),   // scoped
update: (values) => base.update({...values, tenant_id: tenantId}).eq('tenant_id', tenantId), // scoped
delete: () => base.delete().eq('tenant_id', tenantId),          // scoped
upsert: (rows, opts) => base.upsert(stamp(rows, tenantId), opts) // NOT scoped
```

`upsert()` stamps `tenant_id` onto the row being written, but the underlying Postgres
`ON CONFLICT (<opts.onConflict>) DO UPDATE` match is NOT constrained to
`tenant_id = tenantId`. If the `onConflict` column(s) for a given table are ever NOT
inherently unique per-tenant (e.g. a caller-suppliable value, or a natural key that could
collide across two tenants), a request from tenant A whose onConflict value happens to
match an existing row belonging to tenant B would UPDATE tenant B's row and overwrite its
`tenant_id` to A's — a silent cross-tenant row hijack, not just a data leak.

## Why it's not exploitable today

Audited all 5 current `tenantDb(...).upsert(...)` call sites repo-wide (grep for every
route that imports `tenantDb` AND calls `.upsert(`):

| Route | onConflict key(s) | Why it's safe today |
|---|---|---|
| `dashboard/hr/[id]` PATCH | `team_member_id` | `id` verified via a prior `tenantDb`-scoped `team_members` select before the upsert |
| `admin/comhub/voice/settings` PUT | `admin_id` | `admin_id` = `getActiveAdminMemberId(tenantId)`, server-derived from the caller's own tenant, never attacker-supplied |
| `admin/comhub/voice/presence` (POST/heartbeat) | `admin_id` | same as above |
| `admin/recurring-schedules/[id]/exception` POST | `schedule_id,occurrence_date` | `schedule_id` (`id` param) verified via a prior `tenantDb`-scoped `recurring_schedules` select before the upsert |
| `connect/messages` GET/POST (read-cursor) | `channel_id,reader_type,reader_id` | `channel_id` verified via a prior `tenantDb`-scoped `connect_channels` select; `reader_id` is the caller's own server-derived `userId`, never attacker-supplied |

Every current caller independently re-derives the discipline the wrapper doesn't enforce:
verify the onConflict key belongs to this tenant (via a `tenantDb`-scoped select) *before*
calling `.upsert()`. That's a real convention, consistently applied — but it's convention,
not enforcement, and nothing stops the next `tenantDb(...).upsert()` caller from skipping
that pre-check.

## Why I didn't just harden the wrapper

Chaining `.eq('tenant_id', tenantId)` onto a PostgREST `merge-duplicates` upsert changes
its generated SQL to `ON CONFLICT (...) DO UPDATE SET ... WHERE tenant_id = $1` — which
*should* make a foreign-tenant conflict a safe no-op instead of a hijack (conflict already
detected blocks the INSERT path; the WHERE blocks the UPDATE path). I'm fairly confident
that's correct PostgREST/Postgres behavior, but I have no live Supabase/Postgres instance
in this file-only pass to actually prove it end-to-end (real conflict + real cross-tenant
row + observe the no-op), and this wrapper is shared across every tenant-scoped route in
the app — a wrong assumption here is a much bigger blast radius than any single route fix
this session. Per the standing file-only/no-DB constraint, flagging for leader/Jeff rather
than landing an unverified change to a shared primitive.

## Suggested fix (for whoever picks this up with DB access)

Add `.eq('tenant_id', tenantId)` to `tenantDb().upsert()`, matching `update()`/`delete()`,
then verify against a real Postgres instance that a forged cross-tenant onConflict key:
1. does NOT update the foreign tenant's row, and
2. does NOT throw a duplicate-key error either (silent no-op is preferable to a 500, but
   worth confirming which it actually does before shipping).

If a future table's onConflict key is a genuinely tenant-shared natural key (not a
per-tenant-unique UUID), the pre-check-before-upsert convention should also be documented
inline in `tenant-db.ts` so it isn't rediscovered the hard way.
