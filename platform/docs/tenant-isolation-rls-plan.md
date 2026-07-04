# Tenant Isolation Hardening — RLS + Scoped Client (Plan)

_Status: PLAN ONLY. No prod DDL run. Author verified all "current state" facts against prod on 2026-07-04._

## Current state (verified, not assumed)

- **Isolation is 100% application-level.** Every DB call uses the `service_role`
  client (`supabaseAdmin`, ~541 files), which **bypasses RLS**. The only thing
  stopping cross-tenant access is each query remembering `.eq('tenant_id', …)`.
- **RLS is on but toothless.** Sampled prod tables (`tenants, bookings, clients,
  payments, team_members, deals, notifications`) have `rowsecurity = true` but
  **0 policies**. `sms_conversations` has RLS **off**. Enabled-with-no-policies
  = default-deny for non-service clients, but service_role ignores it entirely,
  so it enforces nothing today.
- `tenant_id` is present on 120 columns across `public` — uniform policy is viable.
- **No `SUPABASE_JWT_SECRET`** in prod env (only service_role + anon).
- App-level guard already committed: `scripts/audit-tenant-scope.mjs`.

## Target

A **hard DB backstop**: even a query that forgets `tenant_id` cannot read/write
another tenant's rows. Achieved by RLS policies keyed on the tenant identity of
a **scoped client**, with `service_role` retained only for genuinely
cross-tenant work (admin, cron, platform ops).

## Approach: custom-claim JWT scoped client

Mint a per-request JWT carrying a `tenant_id` claim, signed with
`SUPABASE_JWT_SECRET`; use it as the auth token on a normal supabase-js client
for tenant-scoped operations. RLS policy:
`USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)`.

Chosen over the alternatives because:
- **`set_config`/session GUC** is unreliable over supabase-js REST (stateless,
  pooled) — would require rewriting queries onto a raw `pg` pool. Too invasive.
- Custom-claim JWT keeps the **existing supabase-js query builder** — the only
  change per call site is *which client* runs the query, not the query itself.

## Why this is safe to stage (the key insight)

**Adding RLS policies is inert while callers use `service_role`** (it bypasses
RLS). So we can write and deploy every policy first with **zero runtime effect**,
then migrate call sites onto the scoped client one table at a time. RLS only
begins enforcing for paths already migrated. No big-bang, no lockout.

## Stages

**Stage 0 — Prerequisites (no behavior change)**
- Provision `SUPABASE_JWT_SECRET` in Vercel (all scopes). Retrieve from Supabase
  project settings → API → JWT secret.
- Confirm every tenant table has `tenant_id NOT NULL` + an index. Backfill/patch
  any that don't (query-driven, not assumed).
- Turn RLS **on** for `sms_conversations` (currently off) — still inert (no policy).

**Stage 1 — Policies (inert; service_role bypasses)**
- One migration adding, per tenant table:
  - `ALTER TABLE … ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY tenant_isolation ON … USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid) WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);`
- Run against a **branch/sandbox DB first**, verify service_role still reads
  everything (proves inertness), then prod. Zero app impact.

**Stage 2 — Scoped client helper**
- `src/lib/tenant-supabase.ts` → `tenantClient(tenantId)`: supabase-js client
  whose auth token is a short-lived JWT `{ role:'authenticated', tenant_id }`
  signed with `SUPABASE_JWT_SECRET`. Cache per tenantId per request.
- Keep `supabaseAdmin` for admin/cron/cross-tenant (documented allowlist).

**Stage 3 — Migrate call sites, PII-first, table-by-table**
- Order by exposure: `clients`, `sms_conversations`, `sms_conversation_messages`,
  `bookings`, `payments`, then the rest.
- Per table: swap tenant-scoped `supabaseAdmin.from('X')` → `tenantClient(tid).from('X')`.
  RLS now enforces for those paths. Verify reads/writes still work + a
  cross-tenant read is denied (negative test).
- `scripts/audit-tenant-scope.mjs` extended to flag raw `supabaseAdmin` on an
  already-migrated table → gate in CI so regressions can't merge.

**Stage 4 — Lock**
- Once a table's tenant paths are fully on `tenantClient`, its RLS policy is a
  hard backstop. Document which tables are "enforced" vs "app-level only".

## Risk controls

- Policies deployed before any client migration → provably inert (service_role).
- Migrate one table at a time behind a negative (cross-tenant-denied) test.
- Branch/sandbox DB dry-run before every prod migration.
- `service_role` intentionally retained for admin/cron — not a leak, documented.
- Rollback per stage = revert the client swap (policies staying on is harmless).

## Open decisions for Jeff

1. Provision `SUPABASE_JWT_SECRET` now (Stage 0)? (I can pull it from Supabase
   settings and set it in Vercel on your go.)
2. Migrate scope: **all** tenant tables, or start with the PII-critical five
   (`clients`, `sms_conversations`, `sms_conversation_messages`, `bookings`,
   `payments`) and stop there for now?
3. Cron/admin cross-tenant paths: confirm the allowlist of intentional
   service_role usage before Stage 3.
