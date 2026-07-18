# W2 gap/fluidity refresh — 2026-07-18 03:55

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-tenants-public-slug-resolver-twin-gap-2026-07-18-0333.md`.

Leader's instruction this round (03:44 LEADER->W2): "Good closure -- the 7th resolver-twin (GET /api/tenants/public) fixed... Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: the tenant's own PIN-login header path skipped `tenantServesSite()` in BOTH resolvers that gate real (non-impersonated) owner access

**Bug found:** a tenant operator logs in with their own PIN at `<their-domain>/fullloop` (not Jeff's global admin PIN) and gets a 24h `tenant_admin` token (`createTenantAdminToken` in `admin-auth/route.ts`), scoped to that one tenant. This is the PIN-auth equivalent of a real Clerk owner login — `dashboard/layout.tsx`'s own pre-gate treats it as fully authenticated, same as the global super-admin token. Two resolvers consume this token to produce a tenant context, and BOTH skipped the real-owner status gate their own Clerk-membership sibling branch enforces three-or-so lines below:

- **`tenant.ts`'s `getHeaderTenant()`** (feeds `getCurrentTenant()`, which `dashboard/layout.tsx` calls to render the operator dashboard, and `getCurrentTenantId()`, used by ~20 comhub admin routes + the Selena agent). Fetched the tenant row and returned it unconditionally — no `tenantServesSite()` check at all on this branch, unlike the Clerk normal-flow branch a few lines down (`if (!tenant || !tenantServesSite(tenant.status)) return null`).
- **`tenant-query.ts`'s `getTenantForRequest()`** (the auth+tenant gate behind `requirePermission()` and ~195 direct API-route importers — bookings, clients, finance, everything). Its per-tenant-member-token sub-branch (`verifyTenantAdminToken`) returned `{userId, tenantId, tenant, role}` immediately on a successful token match, with no status check — while its own Clerk normal-flow branch (same function, ~90 lines below) explicitly throws `AuthError('Tenant account is not active', 403)` on the identical non-serving-status condition.

**Concrete failure mode:** an admin suspends/cancels/deletes a tenant whose operator is still holding a live (≤24h-old) PIN session on that tenant's own domain. Every OTHER real-owner path is correctly cut off the moment the write lands (middleware darkens the site once its cache catches up; the Clerk-login owner is 403'd by both `getCurrentTenant()` and `getTenantForRequest()` the instant `fetchTenantById`/the membership lookup re-reads the row). The PIN-login owner was the one path that wasn't — as long as middleware kept signing the `x-tenant-id` header for that domain (its own resolver cache, a separate staleness window already the subject of several prior rounds' fixes), this PIN session could keep rendering the dashboard AND driving every one of the ~195 API routes behind `getTenantForRequest()` — sending campaigns, taking payments, editing clients — for the token's full remaining lifetime, exactly the kind of continued-access-after-cutoff every other status-gated path in this codebase exists to prevent.

**Fixed:** both resolvers now gate the per-tenant-member-token branch on `tenantServesSite(tenant.status)`, throwing/returning null exactly like their Clerk-membership sibling. The GLOBAL super-admin token branch in both functions is deliberately left ungated — that's real impersonation/support access, the same exemption every other impersonation branch in this codebase already gets (PIN admin impersonation, Clerk super-admin impersonation).

## (2) — swept for siblings: this is the only unguarded consumer of the per-tenant PIN token

Grepped every use of `verifyTenantAdminToken` repo-wide. Three call sites total: `admin-auth/route.ts` (mints it — not a consumer), `dashboard/layout.tsx` (the pre-gate that decides whether to `redirect('/fullloop')` — a boolean check, not a data-returning resolver, so there was nothing to gate there), and the two functions just fixed. Nothing else independently resolves a tenant from this token. The other `verifyTenantHeaderSig`-only consumers (`chat/route.ts`, `yinez/route.ts`, `pin-reset/route.ts`, `reset-pin/page.tsx`, `team/login/page.tsx`, `fullloop/page.tsx`, `notify.ts`, `nycmaid/notify.ts`, `tenant-site.ts`'s `getTenantFromHeaders`) trust the signed header alone with no independent long-lived token in play — middleware mints that header fresh per-request and only when it currently believes the tenant serves, so they don't carry this specific gap (a stale *token* outliving a status change); they're still subject to the general middleware-cache-staleness window already tracked separately. Nothing further opens up from this surface.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–16, 21, 23, unchanged (see prior rounds' docs for full list, most recently restated in `w2-tenants-public-slug-resolver-twin-gap-2026-07-18-0333.md`).

CLOSED this round:
29. ~~A tenant's own PIN-login (`tenant_admin` token) header path skipped `tenantServesSite()` in both `tenant.ts`'s `getCurrentTenant()` (dashboard render) and `tenant-query.ts`'s `getTenantForRequest()` (~195 API routes) — the one real-owner-login path that stayed authorized past a suspend/cancel/delete~~ — fixed above (1): both now gate on `tenantServesSite()`, same as their Clerk-membership sibling branch; the global super-admin token remains exempt (impersonation/support access).

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- `npx eslint src/lib/tenant.ts src/lib/tenant-query.ts src/lib/tenant.test.ts src/lib/tenant-query.test.ts` — 0 errors, 0 warnings.
- `tenant.test.ts` — 7 new tests: positive control (active tenant's PIN operator authorized), 3× wrong-status probe (suspended/cancelled/deleted refused), pending-tenant control (still authorized), escape-hatch (global admin token still reaches a suspended tenant via its own domain), and a no-cookie-present control (unaffected by this gate — unauthenticated access is refused upstream by `dashboard/layout.tsx`'s own pre-check).
- `tenant-query.test.ts` — 5 new tests: 3× wrong-status probe (403 "Tenant account is not active"), pending-tenant control, escape-hatch (global admin token via header path still authorized against a suspended tenant).
- Full repo suite: 706 files, 3019 passed, 37 skipped (pre-existing), 0 failed — net +12 vs. the prior round's 3007, matching the 12 new tests added.

File-only, no push/deploy/DB write from this worker. 1 code+tests commit (fix + tests) + 1 docs commit (this file).
