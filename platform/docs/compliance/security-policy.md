# FullLoop CRM — Security Policy

**Status:** Draft for review (P10). Documentation artifact — describes intended and
current controls; does not itself change any system.
**Version:** 0.1
**Last updated:** 2026-07-12
**Owner:** Platform / Security
**Review cadence:** Quarterly, and after any material architecture or subprocessor change.

---

## 1. Purpose & scope

This policy defines how FullLoop CRM protects customer and tenant data. It covers the
multi-tenant platform: the Next.js application (`platform/`), its Postgres/Supabase
database, authentication (Clerk + PIN admin tokens), secrets, deployment (Vercel), and
the operational practices around them.

**In scope:** the shared global codebase, all tenant data stored in the platform
database, admin/operator tooling, and the Jefe agent's tenant-write capabilities.

**Out of scope:** tenant-owned external systems, and the known per-tenant operator
clones slated for cutover (see `platform/CLAUDE.md` → "Known debt"). Those are being
migrated to the global surface; this policy applies to the global surface they move to.

## 2. Core principles

1. **Tenant isolation is the top invariant.** One tenant must never read or write
   another tenant's data. Enforced in two layers: application-level scoping
   (`getTenantForRequest()`) and database Row-Level Security (RLS).
2. **Global code, per-tenant data.** Tenants differ only by data, never by forked code
   (`platform/CLAUDE.md`). Security controls are written once and apply to all tenants.
3. **Least privilege.** Every actor — owner, member, admin, agent, system — gets the
   narrowest access needed. The service-role database key is used only server-side.
4. **Defense in depth.** No single control is trusted alone; auth, signing, RLS, and
   audit logging overlap deliberately.
5. **Auditability.** Sensitive actions leave evidence. A compromised account must be
   reconstructable after the fact.

## 3. Data classification

| Class | Examples | Handling |
|---|---|---|
| **Secret** | API keys, `ADMIN_TOKEN_SECRET`, `SECRET_ENCRYPTION_KEY`, Supabase service role, per-tenant DB secrets, Stripe keys | Never in source. Env/secret-store only. Encrypted at rest where stored in-DB. Never logged. |
| **Sensitive PII** | Customer names, addresses, phones, emails, payment metadata | Tenant-scoped, RLS-protected. Not placed in audit `meta`. Access logged. |
| **Operational** | Job/schedule/invoice records | Tenant-scoped, RLS-protected. |
| **Public** | Marketing site content, config-driven templates | No restriction. |

## 4. Access control & authentication

### 4.1 Actor types

- **Tenant owner** — Clerk-authenticated; resolved to a tenant via `tenant_members`.
- **Tenant member** — per-tenant, role-bearing; scoped token minted for one tenant
  (`verifyTenantAdminToken`).
- **PIN super-admin** — global `admin_token` (`verifyAdminToken`, secret
  `ADMIN_TOKEN_SECRET`). Can impersonate any tenant.
- **Clerk super-admin** — Clerk identity in `SUPER_ADMIN_CLERK_ID`, impersonates via
  the signed `fl_impersonate` cookie.
- **Jefe agent** — acts on a tenant's behalf; confirm-gated for outbound/tenant-visible
  actions.
- **System** — background jobs, webhooks, cron.

### 4.2 Authentication controls

- Impersonation cookies are **HMAC-signed** (`src/lib/impersonation.ts`) so a stolen
  admin token alone cannot forge impersonation of an arbitrary tenant. Verification is
  constant-time (`crypto.timingSafeEqual`).
- Tenant-domain requests carry a **signed `x-tenant-id` header**
  (`verifyTenantHeaderSig`) injected by middleware; the signature binds the request to
  a tenant.
- Legacy unsigned impersonation values are accepted **only** when
  `IMPERSONATION_ALLOW_UNSIGNED=1` (rolling-cutover escape hatch — must be disabled in
  production once sessions rotate).
- Admin/member PIN tokens are secret-derived and must be rotated per the credential
  rotation policy (§8).

### 4.3 Authorization

- All tenant-scoped API routes resolve the actor through `getTenantForRequest()` before
  any data access. No route trusts a client-supplied tenant id.
- Super-admin impersonation is the **only** cross-tenant path and is fully audited (§7).

## 5. Tenant isolation & RLS

- RLS is the database-level backstop for tenant isolation. New tables default to
  **deny-by-default** (`046_rls_deny_on_new_tables.sql`): RLS enabled, no permissive
  policy, so only the service role reaches the data.
- RLS enablement across existing tables is a tracked, ordered rollout — see the
  companion deploy-prep artifacts:
  - `deploy-prep/rls-coverage-audit.md`
  - `deploy-prep/rls-enablement-rollout-plan.md`
  - `deploy-prep/rls-gap-closure.sql` / `rls-gap-closure-verify.sql`
- A hard precondition is that no live row has a NULL `tenant_id`
  (`deploy-prep/null-tenant-backfill-audit.md`), since RLS keys on `tenant_id`.
- `SECURITY DEFINER` database functions are reviewed for scope and a pinned
  `search_path` (`deploy-prep/security-definer-rpc-review.md`) so a definer function
  cannot be tricked into cross-tenant access.

## 6. Secrets management

- **No secret in source.** Secrets live in environment variables / the deploy secret
  store, validated present at startup.
- In-DB secrets (e.g. per-tenant integration credentials) are encrypted at rest under
  `SECRET_ENCRYPTION_KEY`. Rotating that key requires a re-encrypt pass — procedure in
  the credential rotation policy.
- `access.json`-style routing pointers (which account deploys/pushes what) reference
  secret **locations**, never raw values.
- Secrets are never written to logs, audit `meta`, or error messages.

## 7. Audit logging

Two complementary, append-only, service-role-only audit trails:

- **`impersonation_events`** (`041_impersonation_audit.sql`) — every request made while
  an `fl_impersonate` cookie is active. Ensures a compromised admin account leaves
  evidence of which tenants it touched.
- **`tenant_write_events`** (P9; `2026_07_12_tenant_write_audit.sql`,
  `src/lib/audit-log.ts`) — every tenant-**write** action, by any actor, with resource,
  verb, and provenance. Design: `docs/design/audit-logging-expansion.md`.

Audit logging is **best-effort and non-blocking**: an audit-insert failure logs to the
server console and never fails the underlying operation. Audit rows are append-only;
the application has no update/delete path for them.

## 8. Credential rotation

Rotation cadence and procedure are defined in
`deploy-prep/credential-rotation-policy.md`, tiered by blast radius (T0/T1/T2), and
cover `SECRET_ENCRYPTION_KEY` re-encryption, per-tenant DB secrets, and emergency
rotation. Any secret suspected of exposure is rotated immediately under the emergency
path, and the exposure is treated as an incident (§10).

## 9. Vulnerability & change management

- Security-sensitive code (auth, payments, tenant scoping, DB queries, file/secret
  handling) requires review before merge (see repo code-review standards).
- Parameterized queries only; no string-concatenated SQL. Untrusted input is validated
  at system boundaries (schema validation).
- Web responses set standard security headers (HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, a production CSP).
- Dependencies are patched on a regular cadence; critical advisories are expedited.
- Production DDL and destructive operations are **gated**: prepared as reviewed files
  and applied by the release owner after explicit approval, never run ad hoc.

## 10. Incident response

1. **Contain** — disable the affected credential/account; toggle the relevant feature
   off if needed.
2. **Rotate** — any exposed secret is rotated immediately (§8, emergency path).
3. **Assess** — use `impersonation_events` and `tenant_write_events` to scope which
   tenants/resources were touched.
4. **Notify** — affected tenants are notified per contractual and legal obligations.
5. **Remediate & review** — fix root cause, sweep the codebase for the same class of
   issue, and record learnings.

## 11. Data retention & deletion

- Tenant data is deleted or exported on tenant offboarding per contract. Foreign keys
  cascade on `tenants` deletion (`on delete cascade`) for tenant-scoped tables.
- Audit-log retention is **to be finalized** — see open question in
  `docs/design/audit-logging-expansion.md` (§Retention). Until set, audit rows are
  retained indefinitely.

## 12. Subprocessors

Key third parties handling data: **Clerk** (authentication), **Supabase/Postgres**
(data store), **Vercel** (hosting/deploy), **Stripe** (payments). Subprocessor changes
trigger a policy review (§Review cadence). Each is loaded/configured to the least
privilege the integration requires.

## 13. Open items

- Finalize audit-log retention window and purge job (§11, §7).
- Complete RLS enablement rollout to full coverage (§5).
- Confirm `IMPERSONATION_ALLOW_UNSIGNED` is disabled in production post-cutover (§4.2).
- Reconcile the 26-vs-2 `SECURITY DEFINER` prod/repo gap flagged in
  `deploy-prep/security-definer-rpc-review.md`.
- Wire `logTenantWrite` into write routes (gated rollout — see P9 design doc).

---

*This document is a living artifact. It describes controls as designed and, where
noted, in-progress. It is not a certification and does not itself enforce anything —
the enforcing controls are the code, database, and operational procedures it references.*
