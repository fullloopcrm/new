# Proof of conversion — 3 low-risk read routes → `tenantClient()`

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Proof/example only.** The live route
files are UNCHANGED. Executable proof lives in
`platform/src/lib/tenant-client-proof/converted-read-routes.example.ts` (+ `.test.ts`).
Reverting = delete that directory + this file. No routes wired, no DB touched._

## Purpose

Show, concretely and with a passing test, that converting a tenant-scoped read route to
the new `tenantClient()` (see `tenant-client-path-spec.md` and
`platform/src/lib/tenant-client.ts`) is a **two-line change per route**, and that after
it the query provably flows through the RLS-enforced client instead of the RLS-bypassing
`supabaseAdmin`.

The three routes chosen are pure, low-risk reads, all already scoped with an explicit
`.eq('tenant_id', tenantId)`:

| Route | Handler | Table(s) |
|---|---|---|
| `GET /api/quote-templates` | list active templates | `quote_templates` |
| `GET /api/crews` | list crews + members | `crews` (+ join) |
| `GET /api/clients/stats` | aggregate counts | `clients` (×3) |

## The change is exactly two lines

Nothing about auth, shaping, or the `.eq('tenant_id', …)` scope changes. Only the client
the query runs on.

### `quote-templates/route.ts`

```diff
-import { supabaseAdmin } from '@/lib/supabase'
+import { tenantClient } from '@/lib/tenant-client'
 ...
     const { tenantId } = await getTenantForRequest()
-    const { data, error } = await supabaseAdmin
+    const db = tenantClient(tenantId)
+    const { data, error } = await db
       .from('quote_templates')
       .select('*')
       .eq('tenant_id', tenantId)   // KEPT: defense-in-depth during rollout
       .eq('active', true)
       .order('sort_order', { ascending: true })
       .order('name', { ascending: true })
```

### `crews/route.ts` (GET only)

```diff
-import { supabaseAdmin } from '@/lib/supabase'
+import { tenantClient } from '@/lib/tenant-client'
 ...
     const { tenantId } = await getTenantForRequest()
-    const { data: crews, error } = await supabaseAdmin
+    const db = tenantClient(tenantId)
+    const { data: crews, error } = await db
       .from('crews')
       .select('id, name, color, active, crew_members(team_member_id, team_members(id, name))')
       .eq('tenant_id', tenantId)
       .order('name', { ascending: true })
```

### `clients/stats/route.ts`

One `tenantClient(tenantId)` call; the single scoped client fans out to all three
`Promise.all` count queries — every `supabaseAdmin.from(...)` becomes `db.from(...)`.

```diff
-import { supabaseAdmin } from '@/lib/supabase'
+import { tenantClient } from '@/lib/tenant-client'
 ...
     const { tenantId } = await getTenantForRequest()
+    const db = tenantClient(tenantId)
     const [ ... ] = await Promise.all([
-      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
+      db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
       ... (same swap for each query)
     ])
```

## What the test proves

`converted-read-routes.example.test.ts` mocks `tenantClient` with a recording query
builder and asserts, for each converted function:

1. **Routing:** `tenantClient(tenantId)` is invoked (the query no longer touches
   `supabaseAdmin`). For `clients/stats`, `tenantClient` is called **once** and the one
   scoped client serves all three queries.
2. **Table:** the correct table is queried.
3. **Scope preserved:** `.eq('tenant_id', tenantId)` is still applied.
4. **Shape unchanged:** the returned payload matches the original handler's shape.

`tsc --noEmit` clean; `vitest` 3/3 pass.

## Caveats before doing this for real (not covered by the proof)

- **Node runtime only.** `tenant-client.ts` signs with Node `crypto`; a converted route
  must not run on the edge runtime until the signer is swapped to `jose`. Verify each
  route's runtime.
- **Order vs RLS enablement.** Convert readers *before* enabling a table's policy, or
  converted reads go empty (authenticated JWT with no matching row yet is fine, but the
  table's policy must exist and match). Follow `rls-tier-rollout-order.md`.
- **KEEP readers still bypass.** Converting these readers does NOT make the tables safe
  while admin/cron/webhook `service_role` readers of the same tables remain. See the
  residual-IDOR section of `tenant-client-path-spec.md`.
- **Live behavior unverified.** These example functions were tested against a mock, not a
  live Supabase project. A real converted route must be checked end-to-end (a
  cross-tenant read returns empty under `tenantClient`) at cutover.
- **`SUPABASE_JWT_SECRET` must be wired first** (see `supabase-jwt-secret-wiring-plan.md`)
  or every converted route throws fail-closed.
```
