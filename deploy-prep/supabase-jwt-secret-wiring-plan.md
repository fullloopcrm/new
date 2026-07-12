# `SUPABASE_JWT_SECRET` wiring plan — gate RLS at the auth layer

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Plan/runbook only — no secret set, no
env changed, no deploy, no DB touched.** Companion to `tenant-client-path-spec.md` and
`platform/src/lib/tenant-client.ts`. Execute in order; each step has a verify._

## Why this is required

`platform/src/lib/tenant-client.ts` signs its per-request JWT with `SUPABASE_JWT_SECRET`
(HS256). That secret is currently referenced **nowhere** in the repo
(`grep -rn SUPABASE_JWT_SECRET src scripts` → 0 hits, confirmed 2026-07-12). Until it is
set in every runtime environment, `tenantClient()` throws fail-closed on first use — which
is the intended safety behavior, but it also means **no route can be converted until this
is wired**. This is step 2 of the rollout sequence in `tenant-client-path-spec.md`.

RLS "gates at the auth layer" only once PostgREST receives a token it can verify with this
secret and whose `role`/`tenant_id` claims the policy reads. Wiring the secret is what lets
the token `tenantClient` mints be **accepted** — no Supabase-side or DB-side change needed.

## What the value is (and is not)

- **Value:** the project's existing Supabase **JWT Secret** — Dashboard → Project Settings
  → **API** → *JWT Settings* → **JWT Secret**. This is the same secret that already signs
  the project's `anon` and `service_role` keys. Because `tenantClient` signs with the same
  secret and algorithm (HS256) Supabase already trusts, tokens are accepted with **zero**
  Supabase/DB configuration change. This is purely an app-side env addition.
- **NOT** a new/self-generated secret. Inventing one would produce tokens PostgREST
  rejects (signature mismatch) → every converted route 401s.
- **NOT** `NEXT_PUBLIC_*`. It is server-only. Exposing it to the browser leaks the ability
  to forge any role including `service_role`. Never prefix it `NEXT_PUBLIC_`.
- Per the access policy, the **raw secret is not recorded in this repo or in
  `access.json`** — only this pointer to where it lives.

## Runbook

### Step 0 — Precondition
`platform/src/lib/tenant-client.ts` exists and its tests pass (`vitest run
src/lib/tenant-client.test.ts`). ✅ (committed on `p1-w5`). Do NOT convert any route yet.

### Step 1 — Retrieve the JWT Secret
From Supabase Dashboard (the project behind `NEXT_PUBLIC_SUPABASE_URL`): Project Settings →
API → JWT Secret → copy. Handle it like `SUPABASE_SERVICE_ROLE_KEY` — same blast radius.

**Verify:** it is a single opaque string, not the `anon`/`service_role` JWTs themselves.

### Step 2 — Local `.env.local`
Add to `platform/.env.local` (git-ignored):
```
SUPABASE_JWT_SECRET=<the JWT secret>
```
**Verify:**
```
cd platform && grep -q '^SUPABASE_JWT_SECRET=' .env.local && echo present
```
Confirm `.env.local` is git-ignored (`git check-ignore platform/.env.local` prints the
path). Do NOT commit the value.

### Step 3 — Vercel env (Production + Preview + Development)
Add `SUPABASE_JWT_SECRET` to the Vercel project env in **all three** scopes so preview
deploys and local `vercel dev` also carry it. Mark it **Sensitive**. (Jeff/leader runs
this — worker does not deploy or write remote env.)

**Verify:** `vercel env ls` shows `SUPABASE_JWT_SECRET` for Production, Preview, and
Development. (Interactive/authorized session only.)

### Step 4 — Startup validation (fail fast at deploy, not at first query)
Add `SUPABASE_JWT_SECRET` to the required-secrets preflight so a deploy missing it fails
build/boot rather than 500ing the first converted route. The natural hook is the existing
prebuild gate:
- `platform/package.json` → `"prebuild": "node scripts/verify-protected-tenants.mjs"`.

Add a presence check (throw if absent in production) either inside that script or in a
small dedicated `scripts/verify-required-env.mjs` invoked from `prebuild`. This is a
**separate follow-up code change** (not part of this plan's file-only scope); spec'd here
so it is not forgotten.

**Verify (after that change):** with the var unset, `npm run prebuild` in `platform/`
exits non-zero with a clear "SUPABASE_JWT_SECRET not configured" message; with it set, it
passes.

### Step 5 — Smoke test the token is accepted (before converting real routes)
In a scratch/one-off (not committed, Node runtime), mint a token for a known tenant and
issue a trivial read through `tenantClient(tenantId)` against a table that does **not** yet
have RLS enabled. Expect a normal `200`/data response (proves the token is accepted and the
DB role resolves to `authenticated`). Then, on a table that **does** have RLS enabled with
the gap-closure policy, expect a cross-tenant read to return **empty** and the owning-tenant
read to return its rows.

**Verify:** matched-tenant read returns rows; mismatched-tenant read returns `[]`. If the
matched read is empty or errors, the claim set (`iss`/`aud`) may not match this project's
GoTrue config — reconcile `aud`/`iss` against a real GoTrue-issued token before proceeding
(the spec flags this as unverified).

### Step 6 — Only now begin route conversion
Proceed table-by-table in `rls-tier-rollout-order.md` order, using the two-line change in
`proof-of-conversion-read-routes.md`, auditing KEEP readers per table (residual-IDOR
section of `tenant-client-path-spec.md`) before enabling each table's policy.

## Rotation note

Rotating the Supabase JWT Secret **invalidates `anon` and `service_role` simultaneously**
— it is a coordinated, whole-project rotation, not an isolated one. Out of scope here;
recorded in `credential-rotation-policy.md`. Do not rotate as part of this wiring.

## Honest scope notes

- **Plan only.** No secret retrieved or set, no Vercel env changed, no deploy, no startup
  check code added. Steps 3–4 require an authorized/interactive session and a follow-up
  code change respectively.
- The `aud`/`iss` claim requirements in Step 5 are **unverified against a live GoTrue
  response** — confirm before trusting converted routes (same caveat as
  `tenant-client-path-spec.md`).
- Cross-ref: `tenant-client-path-spec.md`, `proof-of-conversion-read-routes.md`,
  `rls-tier-rollout-order.md`, `rls-enablement-rollout-plan.md`,
  `credential-rotation-policy.md`.
```
