# Access Control

**Date:** July 12, 2026
**Scope:** How Full Loop CRM authenticates identities, isolates tenants, and
authorizes actions across its portals. Documentation of the current
implementation — a compliance reference, not a change proposal.

---

## 1. Identity planes

The platform is multi-tenant and serves several distinct audiences, each with
its own session/token scheme. Separation is deliberate: a credential minted for
one plane cannot be replayed against another.

| Plane | Mechanism | Store / secret | Notes |
|-------|-----------|----------------|-------|
| **Owner / operator** | Signed `admin_session` cookie → `getOwnerUserId()` | `src/lib/owner-session.ts`, `@/lib/nycmaid/auth` | Owner self-serve login is **dormant** (moved off Clerk). In practice the dashboard is reached via admin-PIN impersonation until P5 wires owner login onto the session system. |
| **Super admin** | Clerk-based impersonation + admin-PIN impersonation | `SUPER_ADMIN_CLERK_ID` env; `src/lib/tenant.ts` | Resolves an impersonated tenant so a super admin can operate inside any tenant. |
| **Tenant admin PIN** | 4–8 digit PIN, HMAC-SHA256 hashed | `tenant_members.pin_hash`, keyed by `ADMIN_TOKEN_SECRET`; `src/lib/admin-pin.ts` | Deterministic hash for lookup, not reversible without the server secret. PIN is never stored/displayed after issue; reset regenerates. |
| **Client portal** | Signed `client_session` cookie `clientId.tenantId.timestamp.hmac` | `PORTAL_SECRET`; `src/lib/client-auth.ts` | 30-day. Tenant id is bound into the signature. Constant-time compare (`crypto.timingSafeEqual`). A parallel HMAC-token flow exists at `/api/portal/auth`. |
| **Team portal (field staff)** | Bearer token → `{ memberId, tenantId, role }` | `TEAM_PORTAL_SECRET`; `src/lib/team-portal-auth.ts` | RBAC enforced (see §3). Active-member re-check on every request = **instant revocation**. |
| **Referrer portal** | HMAC token, `scope:'ref'` | reuses `TEAM_PORTAL_SECRET`; `src/lib/referrer-portal-auth.ts` | 30-day, constant-time compare, explicit `exp` check. `scope` prevents replay against team-portal routes. |

---

## 2. Tenant isolation

Isolation is enforced at three layers:

1. **Tenant resolution** — `getTenant()` (`src/lib/tenant.ts`) resolves the
   active tenant from the request: custom-domain / subdomain host, a signed
   tenant header (`verifyTenantHeaderSig`, `src/lib/tenant-header-sig.ts`), or an
   impersonation cookie (`verifyImpersonationCookie`, `src/lib/impersonation.ts`).
   The signed header prevents a spoofed host from binding a request to the wrong
   tenant.

2. **Signature-bound sessions** — client and portal tokens embed `tenantId` in
   the signed payload, so a cookie/token minted for tenant A cannot be used on
   tenant B's subdomain. This is the primary defense against cross-tenant
   session replay.

3. **Database RLS** — tenant data is protected by Supabase Row-Level Security
   (see `docs/tenant-isolation-rls-plan.md`). Server code uses the
   service-role client (`supabaseAdmin`) and is responsible for scoping every
   query to the resolved tenant; RLS is the backstop, not the only guard.

> ⚠️ **Reviewer note:** because server routes hold the Supabase **service role**
> (which bypasses RLS), correct tenant scoping in application code is
> load-bearing. RLS protects against direct/anon-key access but does not
> substitute for query-level tenant scoping in service-role paths.

---

## 3. Authorization (RBAC) — team portal

Field-staff authorization is role + permission based
(`src/lib/portal-rbac.ts`):

- **Roles:** `worker`, `lead`, `manager`.
- **Permissions:** a fixed catalog (`PORTAL_PERMISSION_CATALOG` /
  `ALL_PORTAL_PERMISSIONS`), validated by `isValidPortalPermission()`.
- **Per-tenant overrides:** each tenant can adjust the default role→permission
  mapping via `selena_config.portal_role_permissions` (deltas layered on the
  defaults), loaded per request in `team-portal-auth.ts`.
- **Enforcement:** `requirePortalPermission(request, permission)` verifies the
  token, confirms the member is still active (instant revocation of
  suspended/removed members), then checks the member's role against the tenant's
  **effective** permission set.

Other planes are coarse-grained: client-portal and referrer-portal tokens grant
access to that principal's own scoped data only (enforced by the `tenantId` /
principal id in the signed token plus per-route checks).

---

## 4. Cryptographic posture

- All session tokens are **HMAC-SHA256** signed with server-only secrets;
  none are reversible or forgeable without the secret.
- Constant-time comparison (`crypto.timingSafeEqual`) is used in
  `client-auth.ts` and `referrer-portal-auth.ts` to avoid signature-timing
  leaks.
- Admin PINs are HMAC-hashed at rest (not plaintext), keyed by
  `ADMIN_TOKEN_SECRET`.

### Secrets inventory (must be present at deploy)

| Secret | Used by |
|--------|---------|
| `ADMIN_TOKEN_SECRET` | Admin PIN hashing, admin token verification |
| `PORTAL_SECRET` | Client-portal session signing |
| `TEAM_PORTAL_SECRET` | Team-portal + referrer-portal token signing |
| `SUPER_ADMIN_CLERK_ID` | Super-admin impersonation gate |
| (tenant header sig secret) | `verifyTenantHeaderSig` |

All signing code throws if its secret is missing (fail-closed at startup/first
use rather than signing with an empty key).

---

## 5. Known gaps / follow-ups

- **Owner login dormant.** `getOwnerUserId()` returns null in practice; owner
  access currently depends on admin-PIN impersonation. Wiring owner login onto
  the session system is tracked for P5.
- **Shared secret across two planes.** Referrer portal reuses
  `TEAM_PORTAL_SECRET`; replay is prevented by the `scope:'ref'` field rather
  than key separation. Acceptable, but a distinct secret would be
  defense-in-depth.
- **Service-role tenant scoping** (see §2 note) is the highest-leverage area to
  keep under review — a missing `.eq('tenant_id', …)` in a service-role query is
  a cross-tenant data path that RLS on the anon key will not catch.

---

*Sources: `src/lib/owner-session.ts`, `tenant.ts`, `client-auth.ts`,
`team-portal-auth.ts`, `referrer-portal-auth.ts`, `admin-pin.ts`,
`portal-rbac.ts`, `tenant-header-sig.ts`, `impersonation.ts`,
`docs/tenant-isolation-rls-plan.md`.*
