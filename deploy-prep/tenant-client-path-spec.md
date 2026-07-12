# Scoped `tenantClient()` + `SUPABASE_JWT_SECRET` wiring — design spec

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Design spec only — no code added, no secret
set, no DB touched.** Ready for review._

## Why this is the real key to RLS

Enabling RLS (see `rls-gap-closure.sql`, `rls-enablement-rollout-plan.md`) is **vacuous** until
request handlers stop using the `service_role` client. `service_role` bypasses RLS by design, so
every one of the ~623 `supabaseAdmin` call sites (`service-role-to-scoped-client-map.md`) keeps
seeing all tenants' rows even after policies exist. The policy predicate is:

```sql
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)   -- rls-gap-closure.sql:157
```

Nothing in `platform/src` mints a JWT carrying that `tenant_id` claim. `SUPABASE_JWT_SECRET` is
**unreferenced** in the codebase. So there are two missing pieces, and this spec designs both:

1. A **`tenantClient(tenantId)`** factory that returns a Supabase client whose every request
   carries a signed JWT with `tenant_id = <that tenant>` → RLS enforces isolation.
2. The **`SUPABASE_JWT_SECRET`** wiring that lets `tenantClient` sign a token Supabase's PostgREST
   will accept as `role: authenticated` with the custom `tenant_id` claim.

Converting the ~298 tenant-scoped API routes to `tenantClient` is what makes RLS non-vacuous. This
factory is the single unblock; the map already enumerates the call sites.

## What the claim must contain

Supabase/GoTrue verify the JWT with `SUPABASE_JWT_SECRET` (HS256). PostgREST derives the DB role
from the `role` claim and exposes the whole payload via `auth.jwt()`. To satisfy the policy the
token needs, at minimum:

| Claim | Value | Why |
|---|---|---|
| `role` | `"authenticated"` | PostgREST sets the DB role to `authenticated`; RLS is enforced for it (unlike `service_role`). |
| `tenant_id` | `<tenantId>` (uuid string) | The policy reads `auth.jwt() ->> 'tenant_id'`. This is the isolation key. |
| `aud` | `"authenticated"` | GoTrue audience check. |
| `iss` | `<supabase-url>/auth/v1` (or match project config) | Standard; some setups validate. |
| `sub` | the operator/user id (e.g. `TenantContext.userId`) | Traceability; not required by the tenant policy but good hygiene and future per-user policies. |
| `iat` / `exp` | now / now + short TTL (e.g. 5 min) | Tokens are minted per request; keep TTL tiny — no refresh, no storage. |

The claim set is deliberately minimal. `tenant_id` is the only application-specific claim the
current policies read.

## The factory (design — `platform/src/lib/supabase.ts`)

Add alongside `supabaseAdmin`; **do not remove `supabaseAdmin`** — KEEP sites (cron/admin/
webhooks, offline scripts) still need it.

```ts
// DESIGN — not yet added. Signs a short-lived authenticated JWT carrying the tenant_id
// claim so PostgREST/RLS scopes every query to one tenant.
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose' // add dep; see "Dependency" below

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const jwtSecret = process.env.SUPABASE_JWT_SECRET

const TOKEN_TTL_SECONDS = 300

export async function tenantClient(
  tenantId: string,
  userId = 'operator',
): Promise<SupabaseClient> {
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured')
  if (!jwtSecret) throw new Error('SUPABASE_JWT_SECRET not configured') // fail fast, never fall back to service_role
  if (!tenantId) throw new Error('tenantClient requires a tenantId')

  const secret = new TextEncoder().encode(jwtSecret)
  const token = await new SignJWT({ role: 'authenticated', tenant_id: tenantId, sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .setAudience('authenticated')
    .sign(secret)

  // anon key selects the anon apikey; the Authorization Bearer token is what
  // PostgREST reads for role + claims. Each call gets a fresh, tenant-bound client.
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
```

**Fail-closed rule (critical):** if `SUPABASE_JWT_SECRET` is missing, `tenantClient` **throws** —
it must never silently return `supabaseAdmin` or an anon client. A silent fallback would either
re-open the RLS bypass (service_role) or dark every tenant query (anon sees nothing once RLS is
on). Throwing surfaces the misconfig at deploy time, before any tenant data moves.

### Call-site shape (the ~298 CONVERT routes)

```ts
// BEFORE (bypasses RLS)
import { supabaseAdmin } from '@/lib/supabase'
const { tenantId } = (await requirePermission('...')).tenant
const { data } = await supabaseAdmin.from('clients').select('*').eq('tenant_id', tenantId)

// AFTER (RLS-enforced; the .eq stays as defense-in-depth during rollout)
import { tenantClient } from '@/lib/supabase'
const { tenantId } = (await requirePermission('...')).tenant
const db = await tenantClient(tenantId)
const { data } = await db.from('clients').select('*').eq('tenant_id', tenantId)
```

Keep the explicit `.eq('tenant_id', …)` through the migration. It is redundant once RLS is on but
harmless, and it keeps the route correct in the window before the table's policy is enabled.

## `SUPABASE_JWT_SECRET` wiring

- **Value:** the project's existing JWT secret — Supabase Dashboard → Project Settings → API →
  **JWT Secret** (the same secret that signs `anon`/`service_role` keys). Using the project secret
  means tokens `tenantClient` mints are accepted with **no DB or Supabase-side change** — this is
  purely an app-side addition.
- **Where it lives:** server-only env var (never `NEXT_PUBLIC_*`). Add to Vercel project env
  (Production + Preview) and local `.env.local`. Pointer, per access policy — the raw secret is
  **not** recorded in this repo or in `access.json`.
- **Startup validation:** add `SUPABASE_JWT_SECRET` to the required-secrets check so a deploy
  missing it fails fast rather than at first tenant query.
- **Rotation:** rotating the Supabase JWT secret invalidates `anon`/`service_role` too, so it is a
  coordinated rotation — out of scope here; note it in `credential-rotation-policy.md`.

### Dependency

`tenantClient` needs an HS256 signer. Options, in order of preference:

1. **`jose`** — already a common transitive dep; ESM-native, edge-runtime safe (Next API routes
   may run on edge). Preferred.
2. `jsonwebtoken` — Node-only; fine if every converted route is Node runtime. Avoid if any run on
   edge.

Neither is currently in `platform/package.json` (`grep '"jose"\|jsonwebtoken'` → none). Adding
`jose` is the smaller, runtime-safe choice. **This spec does not add it.**

## KEEP list — do NOT convert these (they must stay `service_role`)

From `service-role-to-scoped-client-map.md`, confirmed against the code. These have **no single
tenant** to put in the claim, so a `tenant_id` JWT is meaningless for them:

| Surface | Path | Why KEEP |
|---|---|---|
| Cron | `src/app/api/cron/**` (32) | Each run sweeps **all** tenants in one invocation; no single `tenant_id` claim fits. Must retain explicit `.eq('tenant_id', tenant.id)` per loop iteration. |
| Platform admin | `src/app/api/admin/**` (100) | Cross-tenant **by design** (the admin console operates across tenants). **Exception:** any admin route already scoped to exactly one tenant should be audited and converted individually. |
| Webhooks | `src/app/api/webhooks/**` (7) | Tenant is resolved from the **inbound payload** (e.g. Telnyx `to`/messaging profile), not a session JWT. Keep `service_role`, but set the resolved `tenant_id` scope explicitly on every query. |
| Cross-tenant libs | `src/lib/tenant-lookup.ts` and similar | Inherently cross-tenant (they resolve *which* tenant a request is). Cannot run under a single-tenant claim. |
| Scripts | `platform/scripts/**` (16) | Offline tooling/seeders/migrations — not the request path. Legitimately `service_role`. |

`send-apology-batch` (the opt-out bug in the sibling spec) is an **admin** route → **KEEP**. Its
opt-out fix is orthogonal to conversion.

## Residual-IDOR warning (the part that bites after cutover)

Converting a route to `tenantClient` makes *that reader* RLS-safe. It does **not** make the table
safe. **Every KEEP reader of the same table still uses `service_role` and still bypasses RLS.**
So the moment RLS is enabled on, say, `clients`:

- Converted readers are isolated by the policy. ✅
- KEEP readers (admin/cron/webhooks) are **the entire residual attack surface** — they see all
  tenants and are gated **only** by their hand-written `.eq('tenant_id', …)`. **A KEEP site that
  ever drops that `.eq` is a cross-tenant IDOR the same day RLS makes everyone else safe.**

Consequences to enforce during rollout:

1. **Audit every KEEP site's tenant scoping by hand** before declaring a table "done." RLS will
   not catch a missing `.eq` on a `service_role` client. (The 2026-06-29 IDOR sweep came back
   clean — re-run it per table at cutover; do not assume it still holds.)
2. **Webhooks especially:** they resolve `tenant_id` from attacker-influenceable inbound data.
   Validate that the resolved tenant actually owns the phone/profile before any write — RLS won't.
3. **Order matters:** convert readers *before* enabling a table's policy, or converted UI reads go
   empty (anon/authenticated with no matching claim yet). Follow the tier order in
   `rls-tier-rollout-order.md` / `rls-enablement-rollout-plan.md`.
4. **KEEP sites querying drifted columns** (see `schema-drift-register.md`) are a latent break —
   they don't get safer *and* may be reading a phantom/dead column. Fix drift first.

## Rollout sequence (this factory's place in it)

1. Add `jose`; add `tenantClient` to `lib/supabase.ts` (keep `supabaseAdmin`). Unit-test that it
   mints a token with `role:authenticated` + correct `tenant_id`, and **throws** when the secret
   is absent.
2. Wire `SUPABASE_JWT_SECRET` (Vercel + local) + startup validation.
3. Convert CONVERT routes **table by table, in RLS tier order**, keeping `.eq('tenant_id')`.
4. Enable the table's RLS policy only after all its CONVERT readers are cut over **and** its KEEP
   readers are hand-audited.
5. Per table: verify a cross-tenant read returns empty under `tenantClient`, and the KEEP admin
   path still works.

## Honest scope notes

- **Design only.** No factory added, no dep installed, no env set, no policy enabled. `jose` vs
  `jsonwebtoken`, edge-vs-node runtime, and the exact claim set (`iss`/`aud` matching your GoTrue
  config) must be **verified against a real Supabase project response** before this is trusted —
  claim requirements vary by Supabase version/config and I did not test a live token here.
- The ~298 / ~623 figures are from `service-role-to-scoped-client-map.md` (grep-derived, over/
  under-count caveats there). Confirm per call site at conversion time.
- Cross-ref: `service-role-to-scoped-client-map.md`, `rls-gap-closure.sql`,
  `rls-enablement-rollout-plan.md`, `rls-tier-rollout-order.md`, `schema-drift-register.md`.
