# RLS-gap proposal — `tenant_owner_messages` is missing from the coverage audit entirely

_Author: worker W5, branch `p1-w5`, 2026-07-13. Docs + prep SQL only. No DDL run. Third item of
LEADER order 12:35 "continue backlog 3-deep (FILE-ONLY): next 3 chat/comms tenantDb + RLS-gap
proposals + verify green."_

## TL;DR

`tenant_owner_messages` — the platform admin ↔ tenant-owner chat table (`/api/admin/tenant-chats`,
`/api/dashboard/messages`, `src/lib/jefe/actions.ts`) — carries a `tenant_id` column and is read/
written on nearly every app-layer request through it, but it **does not appear anywhere in
`deploy-prep/rls-coverage-audit.md`'s 132-table matrix**. That audit is migration-derived (its own
stated limitation), and there is **no `CREATE TABLE tenant_owner_messages` in any tracked
migration** in this repo — the table was evidently created out-of-band (Supabase Studio / a manual
`psql` session / dropped from history), so the audit's scan never saw it. Its live RLS status is
therefore **completely unverified from source** — not "known gap," not "known covered," just
unknown. That is worse than a known gap: every other table in the tier1-11 backlog at least has a
documented current state to react to.

## Evidence

```
$ grep -rl "tenant_owner_messages" platform/migrations/ platform/supabase/ 2>/dev/null
(no output — zero migration files define this table)

$ grep -n "tenant_owner_messages" deploy-prep/rls-coverage-audit.md
(no output — absent from the 132-table full coverage matrix)
```

Compare to `comhub_active_calls`, `comhub_admin_presence`, `comhub_missed_call_sms` (same
messaging domain, same session) — all three **are** in the audit matrix as `RLS on, NO policy`,
because they do have tracked `CREATE TABLE ... ENABLE ROW LEVEL SECURITY` migrations. Only
`tenant_owner_messages` is dark.

## Why this table, why now

Found while completing the chat/comms tenantDb backlog (this file's sibling changes convert
`admin/message-applicants/{preview,send}` to `tenantDb`). Cross-checking every comhub/messaging
call site against the coverage audit surfaced this one has no audit entry at all. It's real
production traffic, not a dead table:

- `platform/src/app/api/admin/tenant-chats/route.ts` — platform-admin cross-tenant read/write
  (correctly `supabaseAdmin` + explicit `.eq('tenant_id', …)`, gated by `requireAdmin()` — this is
  intentionally cross-tenant, not an app-layer bug).
- `platform/src/app/api/dashboard/messages/route.ts` — tenant-owner side, already on `tenantDb`
  (app-layer isolation is correct here).
- `platform/src/lib/jefe/actions.ts` (`readTenantThread` / `sendTenantMessage`) — Jefe (platform AI)
  reads/writes any tenant's thread by design, gated by `findTenant()` + the platform admin-only
  surface that invokes it.

App-layer tenant isolation is sound on the routes above (verified by reading each one — see prior
worker commits for the same conclusion on sibling comhub tables). **This proposal is about the
DB-layer backstop only** — same "defense-in-depth, inert until scoped-client cutover" reasoning as
every other tier in this series, per `rls-tier-rollout-order.md`.

## What could not be verified from source (must be checked live before applying)

Because the table isn't in any migration, none of the following can be answered by reading the
repo — they require a live query against prod (`information_schema.columns`, `pg_tables.rowsecurity`,
`pg_policies`), which W5 cannot run per FILE-ONLY / no-prod-write scope:

1. Does `tenant_owner_messages.tenant_id` allow NULL, and are there any NULL rows today? (Same
   precondition every other tier requires — a `tenant_id` policy on NULL rows silently drops them.)
2. Is `ENABLE ROW LEVEL SECURITY` already set on this table (possible if whoever created it
   out-of-band also enabled RLS by hand), or is it fully open?
3. Do any policies already exist (`pg_policies` for this table)?
4. Confirm the column is actually named `tenant_id` and typed `uuid` (assumed from the TS call sites
   above — `t.id` / `ctx.tenantId` are both UUIDs elsewhere in this codebase, but the column
   definition itself is unverified).

## Proposed closure (prep SQL, gated on the live check above)

`deploy-prep/rls-gap-closure-tenant-owner-messages.sql` (sibling file) applies the same
`ENABLE ROW LEVEL SECURITY` + `tenant_isolation` policy shape used across tier6-11, with two
additions beyond the standard guard:

- The guard's `to_regclass` check doubles as the "does this table even exist in this environment"
  check, since we have no migration to confirm existence.
- A live column-type assertion (`information_schema.columns` for `tenant_id` = `uuid`) before
  touching anything, since (unlike every other tier) this table's schema was never read from a
  migration file.

Same rule as every other tier: **PREP FILE — DO NOT EXECUTE AS-IS.** The leader runs this only
after Jeff approves and the live checks above come back clean.

## Suggested next step (for Jeff/leader, not part of this proposal)

Whoever created `tenant_owner_messages` out-of-band should also backfill a migration file for it —
otherwise every future migration-derived audit (this one included) will keep missing it, and it's
worth asking whether other out-of-band tables exist that this same blind spot hides. A quick
`pg_tables` vs. `supabase/migrations/*.sql` reconciliation (all tables in prod not defined in any
tracked migration) would catch the rest in one pass — flagging as a suggestion, not doing it here
(out of this item's scope).
