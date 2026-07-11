# RLS as defense-in-depth for tenant isolation

## Why

Every hole fixed in `fix/tenant-backend-holes-2026-07-10` is the same shape: a
route sets its own `tenant_id` correctly but forgets to verify a body-supplied
foreign key, or passes raw `.update(body)`. Isolation is enforced **only** in app
code because every route uses `supabaseAdmin` (the `service_role` client). One
forgotten `.eq('tenant_id')` = a cross-tenant leak.

`findForeignRef` / `stripImmutable` patch the known instances. RLS makes the
whole class **fail closed**: a missed app-layer check can't leak because Postgres
itself refuses the row.

## The blocker (why RLS alone does nothing today)

`service_role` **bypasses RLS**. Adding policies while every query runs through
`supabaseAdmin` is inert — the policies never evaluate. Making RLS effective
requires routing tenant-scoped requests through a client whose role is subject to
RLS, carrying the caller's tenant as request context.

## Approach (phased, reversible)

### Phase 0 — enable + audit, no enforcement
1. `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;` on tenant tables
   (bookings, clients, invoices, quotes, quote/invoice line tables, deals,
   team_members, recurring_schedules, client_properties, routes, reviews,
   notifications, comhub_*, payroll_payments, payments, entities, …).
2. Add a **permissive** policy `USING (true)` first — zero behavior change —
   so ENABLE doesn't dark any table. This lets us land the DDL safely.

### Phase 1 — a tenant-scoped request client
- Introduce `supabaseForTenant(tenantId)`: a client using the **anon/authenticated**
  role (NOT service_role) that sets a per-request GUC, e.g.
  `SET LOCAL app.tenant_id = '<uuid>'` (via a `set_config` RPC or PostgREST header),
  established right after `getTenantForRequest()`.
- Real policy: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`
  and the same as `WITH CHECK` so writes can't set a foreign `tenant_id`.

### Phase 2 — migrate reads/writes off `supabaseAdmin`
- Route-by-route, swap `supabaseAdmin` → `supabaseForTenant(ctx.tenantId)` on
  tenant-scoped paths. Keep `supabaseAdmin` only for genuinely cross-tenant work
  (platform admin, crons, webhooks) — those stay explicit and few.
- Each migrated route: the `.eq('tenant_id')` becomes redundant belt-and-suspenders;
  RLS is the floor.

### Phase 3 — flip policies from permissive to enforcing
- Replace `USING (true)` with the tenant predicate, table by table, watching
  errors. Reversible per-table.

## Guardrails
- Do NOT enable enforcing policies on prod until Phase 2 covers that table's
  routes — otherwise live traffic on `supabaseAdmin` is unaffected but any
  already-migrated client will 403 on rows it should see if the GUC isn't set.
- Keep `WITH CHECK` on every write policy — that's what kills the
  mass-assignment/tenant-move class at the DB.
- Crons/webhooks/platform-admin explicitly keep `service_role`.

## Test plan
- Extend `verify-tenant-refs.test.ts` style with an integration harness that runs
  a real query as `supabaseForTenant(A)` and asserts 0 rows / 403 for tenant B's ids.
- Regression: "create booking with tenant B's client_id → denied by CHECK".

## Status
Plan only. Not started. App-layer guards (this branch) are the interim floor.
