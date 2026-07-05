# FullLoop Platform — Security Audit (read-only)

**Date:** 2026-06-28
**Scope:** Multi-tenant isolation, authentication/authorization, secret storage, RLS, rate limiting, webhooks, public endpoints.
**Method:** Static code review only. No database was connected, no runtime probing, no changes made.
**Auditor note:** This is a findings inventory, not a fix. Nothing here has been remediated. Items are ranked CRITICAL → LOW. Fix in order, top-down.

---

## Executive summary

The platform has a **better-than-expected crypto and routing foundation** — signed tenant headers (HMAC-SHA256, constant-time verify), AES-256-GCM secret encryption, signed+expiring admin tokens, signed impersonation cookies, and signature verification on all major webhooks (Stripe, Clerk, Resend, Telnyx).

The **single structural weakness** is that tenant isolation lives entirely in application code. Every data route uses the Supabase `service_role` key, which **bypasses Row-Level Security**. Isolation therefore depends on each route remembering to write `.eq('tenant_id', …)`. Most routes do (317/406). The dangerous minority are **legacy nycmaid routes ported into the platform that query `service_role` with no tenant filter, gated by a global non-tenant-scoped `admin_session`.** That combination is the source of the only CRITICAL findings.

There is no single "turn this on" fix. The durable answer is **positive RLS policies as a backstop** plus a **mandatory tenant-scoped query wrapper** so isolation can't depend on per-route discipline. Everything else is hardening.

---

## Severity table

| # | Finding | Severity |
|---|---------|----------|
| C1 | Legacy `admin_session` (global, no tenant binding) gates routes that read all-tenant data | **CRITICAL** |
| C2 | `client-analytics` returns every tenant's clients + bookings (service_role, no tenant_id) | **CRITICAL** |
| H1 | Tenant isolation is app-layer only; RLS is deny-stub, not a positive backstop | **HIGH** |
| H2 | No mandatory tenant-scoped query helper — isolation = per-route `.eq()` discipline | **HIGH** |
| H3 | Public AI endpoints (`/api/yinez`, `/api/chat`) unauthenticated with no rate limit → cost-abuse / financial DoS | **HIGH** |
| H4 | `IMPERSONATION_ALLOW_UNSIGNED=1` escape hatch forges impersonation if ever set in prod | **HIGH** |
| M1 | Rate limiting on only 27/406 routes; most public unauth endpoints uncovered | **MEDIUM** |
| M2 | Six parallel auth systems (Clerk, admin PIN, legacy admin_session, client portal, team PIN, token-auth) | **MEDIUM** |
| M3 | Single global super-admin PIN controls all tenants via impersonation; no per-admin accounts, no MFA, no rotation | **MEDIUM** |
| M4 | Legacy plaintext secrets may still exist in DB (decrypt passthrough); not confirmed migrated | **MEDIUM** |
| M5 | Test/debug routes shipped in production (`/api/test/*`, `/api/test-emails`) | **MEDIUM** |
| L1 | Admin PIN compared with `!==` (not constant-time) — low risk, route is rate-limited | **LOW** |
| L2 | Telegram webhook has no visible signature/secret-token verification | **LOW** |
| L3 | Wide middleware impersonation-bypass prefix list — broad surface, easy to over-grant | **LOW** |

---

## CRITICAL

### C1 — Global `admin_session` gates cross-tenant routes
- **Where:** `src/lib/nycmaid/auth.ts` → `protectAdminAPI()` / `verifySessionCookie()`. Used by 12 routes.
- **What:** `protectAdminAPI()` only checks that an `admin_session` cookie is a validly-signed session. The session carries **no tenant_id** — a legacy PIN session is hardcoded to `role: 'owner'`. This is the nycmaid-era single global admin, parallel to (and weaker than) the platform's tenant-scoped `admin_token` + signed impersonation.
- **Risk:** Authorization is "are you *an* admin," not "are you admin *of this tenant*." Any route it gates that doesn't itself filter by tenant exposes all tenants.
- **Fix:** Retire `admin_session` for platform routes. Route every ported nycmaid endpoint through `getTenantForRequest()` (signed header + tenant-bound impersonation). Where a route is genuinely platform-super-admin (cross-tenant by design, e.g. `/api/admin/tenants`), gate it on `admin_token` + `SUPER_ADMIN_CLERK_ID`, not the legacy cookie.

### C2 — `client-analytics` leaks all-tenant data
- **Where:** `src/app/api/client-analytics/route.ts`
- **What:** Gated only by `protectAdminAPI()` (C1), then runs `supabaseAdmin.from('clients').select('*…')` and `.from('bookings')` with **no `tenant_id` filter**. Returns every tenant's clients (with referrer PII) and bookings.
- **Risk:** Cross-tenant PII disclosure. Exploitability hinges on whether an `admin_session` is obtainable on tenant domains at runtime (not verified here — see "Not verified"). Even in the best case it exposes all-tenant data to the single nycmaid operator. Worst case it's a full cross-tenant breach.
- **Sibling routes with the same pattern:** `src/app/api/admin-chat/route.ts`, `src/app/api/clients/[id]/contacts/[contactId]/route.ts` (object-ID access with no tenant check → IDOR across tenants).
- **Fix:** Add `tenant_id` scoping from `getTenantForRequest()` to all three; remove `protectAdminAPI` in favor of the tenant-scoped context.

---

## HIGH

### H1 — RLS is a deny-stub, not a positive backstop
- **Where:** `src/lib/migrations/046_rls_deny_on_new_tables.sql` (its own comment: *"Service-role … BYPASSES RLS, so this is a no-op for current code paths"*). `014_security_hardening.sql` adds rate-limit/oauth tables, not isolation policies.
- **Risk:** The database provides zero isolation today. A single missing `.eq('tenant_id')` (see C2) is an unguarded breach with no second line of defense.
- **Fix:** Author positive per-tenant RLS policies (`tenant_id = current_setting('app.tenant_id')::uuid`) on every tenant-scoped table, then move read paths onto a request-scoped role that sets `app.tenant_id`. Keep service_role only for genuinely cross-tenant admin paths. This is the big rock; do it deliberately, table by table, behind tests.

### H2 — No mandatory tenant-scoped query helper
- **Where:** `src/lib/tenant-query.ts` exists and resolves context, but routes still call `supabaseAdmin` directly (21 files) and hand-add `.eq('tenant_id')`.
- **Risk:** Isolation depends on developer memory on every new route forever.
- **Fix:** Provide a `tenantDb(ctx)` wrapper that auto-injects `tenant_id` on select/insert/update/delete and forbids raw `supabaseAdmin` in route handlers (lint rule). Makes the safe path the default path.

### H3 — Unauthenticated AI endpoints, no rate limit
- **Where:** `src/app/api/yinez/route.ts` (public, `maxDuration=60`, calls the LLM agent, no auth, no `rateLimit`), `/api/chat`.
- **Risk:** Anyone can spray requests → unbounded Anthropic/Telnyx spend (financial DoS) and junk conversation rows.
- **Fix:** Add `rateLimitDb` per IP + per session, a hard daily cap, and a cheap bot check (the existing honeypot pattern).

### H4 — `IMPERSONATION_ALLOW_UNSIGNED` bypass
- **Where:** `src/lib/impersonation.ts` → `verifyImpersonationCookie()` accepts a raw UUID when `IMPERSONATION_ALLOW_UNSIGNED=1`.
- **Risk:** If that env var is ever set in prod, a forged `fl_impersonate=<any-tenant-id>` + any leaked `admin_token` impersonates any tenant.
- **Fix:** Confirm it's unset in prod now; delete the code path (the rolling-cutover reason it existed is long past).

---

## MEDIUM

- **M1 — Rate-limit coverage 27/406.** A persistent limiter exists (`rate-limit-db.ts`, `rate_limit_events` table) but is applied narrowly. Sweep public unauth endpoints: portal login, `/api/contact`, `/api/public-upload`, `/api/prospects`, `/api/inquiry`, `/api/feedback`, chat/AI. *Fix:* apply `rateLimitDb` to every public POST.
- **M2 — Six auth systems.** Clerk, admin PIN, legacy `admin_session`, client-portal (phone/email), team PIN, token-auth. Each is a separate surface. *Fix:* retire `admin_session` (C1), document the remaining five with their threat model, converge where feasible.
- **M3 — One global super-admin PIN.** `ADMIN_PIN` + impersonation = god mode over all tenants. No per-operator identity, no MFA, no rotation log. *Fix:* per-admin accounts (Clerk super-admins already partly exist via `SUPER_ADMIN_CLERK_ID`), enforce MFA on those, deprecate the shared PIN for impersonation.
- **M4 — Possible plaintext secrets at rest.** `decryptSecret()` passes through non-`v1:` values, so unmigrated rows stay plaintext. *Fix (needs DB):* `SELECT` count of tenant secret columns not starting with `v1:`; re-save to encrypt.
- **M5 — Test routes in prod.** `/api/test/email-selena`, `/api/test-emails`, `/api/admin/cleanup-test-bookings`. *Fix:* gate behind `NODE_ENV !== 'production'` or delete.

---

## LOW

- **L1 —** Admin PIN compared with `!==` (`admin-auth/route.ts:52`), not constant-time. Rate-limited 5/15min, so timing brute-force is impractical, but switch to `crypto.timingSafeEqual` for hygiene.
- **L2 —** `webhooks/telegram/route.ts` shows no signature/secret-token check. Confirm it validates Telegram's secret token header; add if missing.
- **L3 —** The middleware impersonation-bypass prefix list is large (~40 prefixes). Each is a route family that skips Clerk under impersonation. Audit it for prefixes that no longer need to be there.

---

## What's already solid (keep, don't touch)

- Signed tenant header — `tenant-header-sig.ts`, HMAC-SHA256, constant-time verify, Edge-safe pure-JS impl.
- Signed + expiring admin token — `admin-auth/route.ts`, HMAC, httpOnly/secure/sameSite=strict, 24h.
- Signed impersonation cookie with audit log — `impersonation.ts` + `impersonation_events`.
- AES-256-GCM secret encryption — `secret-crypto.ts`, proper IV + auth tag, envelope versioning.
- Webhook signature verification — Stripe (`constructEvent`), Clerk + Resend (svix), Telnyx (ed25519).
- Admin auth rate-limited (5/15min) and DB-persistent (survives cold start).
- RBAC primitive — `require-permission.ts` (`requirePermission('settings.edit')` etc.) gates the migrate endpoints correctly.

---

## NOT verified (needs DB access or runtime — I did neither, by your rules)

1. **Whether `admin_session` is obtainable on tenant domains** — decides if C2 is "operator sees all tenants" vs "full cross-tenant breach." Needs runtime check.
2. **Live RLS state per table** — code shows deny-stubs on 4 tables; the other ~40 tenant tables' RLS status is unconfirmed without `pg_policies`.
3. **Count of plaintext secret rows** (M4) — needs a `SELECT`.
4. **Which env flags are set in prod** — `IMPERSONATION_ALLOW_UNSIGNED`, `TELNYX_PUBLIC_KEY`, `SECRET_ENCRYPTION_KEY` presence. Needs `vercel env`.

---

## Recommended remediation order

1. **C2 + C1** — scope the 3 unfiltered routes to tenant, retire `admin_session` for platform routes. (Small, stops the bleed.)
2. **H4 + M5 + L2** — confirm/kill the unsigned-impersonation flag, gate test routes, verify Telegram webhook. (Config-level, fast.)
3. **H3 + M1** — rate-limit the AI + public POST endpoints. (Bounded, high value.)
4. **H2** — ship the mandatory `tenantDb(ctx)` wrapper + lint rule. (Makes future routes safe by default.)
5. **H1** — positive RLS policies, table by table, behind tests. (The big rock; the permanent backstop.)
6. **M2/M3** — auth consolidation + super-admin MFA. (Longer-horizon.)

Each step should be its own reviewed change. Do not batch.
