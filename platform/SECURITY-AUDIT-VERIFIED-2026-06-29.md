# FullLoop Platform — Security Audit (VERIFIED against current code)

**Date:** 2026-06-29
**Supersedes:** `SECURITY-AUDIT-2026-06-28.md` (static-only, now partly stale — several CRITICALs already fixed).
**Method:** Static code review + exploit-path tracing + prod env-var *name* check (`vercel env ls`, no values, no secrets read). **No prod DB read, no runtime probing of live tenants, no cost-bearing endpoint hits.** Items needing those are listed under "Still needs live testing."
**Re-auditor note:** I independently re-verified every prior finding against the code as it stands today. Status column = what I could prove. Nothing here was remediated by me; this is findings only.

---

## What changed since 2026-06-28

The other security session has been actively fixing. Verified today:

- **C2 (client-analytics all-tenant leak) — FIXED.** `client-analytics/route.ts` now resolves `getCurrentTenant()`, fails closed on no tenant, and `.eq('tenant_id', tenant.id)` on every query (lines 11–44).
- **C2 siblings — FIXED.** `admin-chat/route.ts` and `clients/[id]/contacts/[contactId]/route.ts` both now resolve tenant context and scope every read/write by `tenant_id`.
- **C1 blast radius shrank** from 12 routes to **4** (`protectAdminAPI` users), and all 4 now self-scope to the request's tenant. The structural weakness (the cookie itself carries no tenant_id) remains — see H-A.
- **H4 (`IMPERSONATION_ALLOW_UNSIGNED`) — dormant.** Confirmed **not set in prod**. Downgrade to LOW (dead code to delete), not a live risk.

**IDOR sweep result:** I classified all 82 dynamic `[id]`/`[token]` API routes. **Zero** tenant-scoped data routes are missing isolation. Every one either filters by `tenant_id`, resolves tenant context, or is a capability-token public route. The only routes without tenant scope are 3 genuinely-cross-tenant platform-admin routes (`prospects`, `platform_announcements`, `businesses/verify-checklist`), all gated by `requireAdmin()` (super-admin token). This is correct by design.

**Net:** The app-layer isolation discipline is actually *good* — better than the prior audit's tone implied. The remaining risk is not scattered missing `.eq()`s. It is **concentrated in the auth/credential model**: two shared global secrets and no database backstop.

---

## Severity table (current)

| # | Finding | Severity | Status vs 06-28 |
|---|---------|----------|-----------------|
| **C-A** | `ADMIN_PASSWORD` is one shared global secret across 8+ admin login surfaces (nycmaid + 6 per-tenant clones + legacy PIN); sessions interoperate across all tenants | **CRITICAL** (for the SaaS model) | **NEW** |
| **H-A** | Super-admin = single global `ADMIN_PIN` → `admin_token` with no tenant binding; on any tenant domain it grants owner of that tenant. No per-admin identity, no MFA, no rotation | **HIGH** | was M3 + C1, re-framed |
| **H-B** | Isolation is app-layer only; RLS is a deny-stub, not a positive backstop. `service_role` everywhere bypasses RLS | **HIGH** | H1 unchanged |
| **H-C** | No mandatory tenant-scoped query wrapper; isolation = per-route `.eq()` discipline (held so far, but unenforced) | **HIGH** | H2 unchanged |
| **H-D** | Unauthenticated AI endpoints (`/api/yinez`, `/api/chat`) no rate limit → Anthropic/Telnyx cost-abuse / financial DoS | **HIGH** | H3 — re-verify coverage |
| **M-1** | Rate-limit coverage narrow; most public POSTs uncovered | **MEDIUM** | M1 |
| **M-2** | Six parallel auth systems | **MEDIUM** | M2 |
| **M-3** | Possible plaintext secrets at rest (decrypt passthrough on non-`v1:`) | **MEDIUM** | M4 — needs DB |
| **M-4** | Test/debug routes in prod (`/api/test/*`, `/api/test-emails`, `cleanup-test-bookings`) | **MEDIUM** | M5 |
| **L-1** | Legacy admin login (`/api/auth/login`) rate-limit is **in-memory** (`Map`), resets on cold start; PIN path = global `ADMIN_PASSWORD` | **LOW→MED** | NEW detail |
| **L-2** | `IMPERSONATION_ALLOW_UNSIGNED` dead code path | **LOW** | was H4, now dormant |
| **L-3** | Telegram webhook secret-token verification unconfirmed | **LOW** | L2 |
| **L-4** | Wide middleware impersonation-bypass prefix list | **LOW** | L3 |

---

## CRITICAL

### C-A — `ADMIN_PASSWORD` is a shared global secret across every admin surface
- **Where:** `lib/nycmaid/auth.ts`, `app/api/auth/login/route.ts` (PIN fallback), and six per-tenant clones: `app/site/{nyc-mobile-salon,the-nyc-exterminator,wash-and-fold-hoboken,wash-and-fold-nyc,the-nyc-interior-designer,the-home-services-company}/_lib/auth.ts`.
- **Proven:** `wash-and-fold-nyc/_lib/auth.ts` is a byte-for-byte copy of `lib/nycmaid/auth.ts` — same `signToken()` keyed on `process.env.ADMIN_PASSWORD`, same `admin_session` cookie name, same `verifySessionCookie()`. The exterminator/home-services variants compare against `ADMIN_AUTH_SECRET || ADMIN_PASSWORD`.
- **Consequence:**
  1. **One password logs into every tenant's admin.** There is no per-tenant operator credential. The exterminator operator's password *is* the wash-and-fold operator's password *is* nycmaid's PIN.
  2. **Session interop:** because all surfaces sign the identically-named `admin_session` with the same secret, a session minted on tenant A is accepted by tenant B's `verifySessionCookie`. The cookie has no tenant binding.
  3. **Single point of total compromise:** one leak of `ADMIN_PASSWORD` = every tenant admin compromised.
- **Why CRITICAL for the business, not just hygiene:** FullLoop's model is selling this CRM to *other* businesses. The moment a non-Jeff operator exists, handing them admin hands them every tenant. Today, single-operator (Jeff), the practical blast radius is "Jeff's own tenants" — but the secret-leak radius is already total, and the model cannot safely onboard a real third-party operator.
- **Fix:** Per-tenant operator identity. Move all operators onto Clerk `tenant_members` (already tenant-bound and safe — see matrix). Retire the shared-`ADMIN_PASSWORD` `admin_session` entirely once the wash-and-fold/salon/etc. clones are cut over to global `/dashboard` (this is the CLAUDE.md "known debt" cutover). Until then, this is the top structural risk.

---

## HIGH

### H-A — Single global super-admin PIN, no tenant binding, no MFA
- **Where:** `app/api/admin-auth/route.ts` (`createAdminToken` → `{role:'super_admin', exp}`, no tenant), `lib/require-admin.ts`, `lib/tenant-query.ts:71–88`.
- **Proven path:** `admin_token` (minted from global `ADMIN_PIN`) on tenant A's domain → `getTenantForRequest` returns `{tenant: A, role: 'owner'}` (domain + signed `x-tenant-id` header picks the tenant). Same token on B's domain → owner of B. Plus `fl_impersonate` (signed) + `admin_token` → owner of any tenant by id.
- **Mitigations present (good):** `admin_token` is HMAC-signed + expiring + httpOnly/secure/sameSite=strict; PIN login rate-limited 5/15min per IP **and DB-persistent** (`rateLimitDb`); impersonation is signed (constant-time verify) and audit-logged (`impersonation_events`).
- **Residual risk:** one shared PIN = god mode, no per-operator attribution, no MFA, no rotation log. Rate limit is per-IP only (distributed guessing possible; depends on PIN entropy — verify PIN length).
- **Fix:** MFA on the super-admin path; prefer Clerk super-admins (`SUPER_ADMIN_CLERK_ID` already supported) over the shared PIN; rotate + shorten token TTL for sensitive ops.

### H-B — RLS is a deny-stub, not a positive backstop
- **Where:** `lib/migrations/046_rls_deny_on_new_tables.sql` (its own comment: service_role bypasses RLS, "no-op for current code paths").
- **Risk:** the DB provides **zero** isolation today. App-layer discipline is the only line of defense. It holds now (IDOR sweep clean), but one future missing `.eq('tenant_id')` is an unguarded breach.
- **Fix:** positive per-tenant policies (`tenant_id = current_setting('app.tenant_id')::uuid`) table by table, behind tests, then move read paths onto a request-scoped role. The big rock; the permanent backstop.
- **Needs DB to verify live RLS state per table.**

### H-C — No mandatory tenant-scoped query wrapper
- **Where:** `lib/tenant-query.ts` resolves context but routes still call `supabaseAdmin` directly (~377 route files reference it) and hand-add `.eq('tenant_id')`.
- **Risk:** isolation depends on developer memory forever. It's correct *today* — that's luck + discipline, not enforcement.
- **Fix:** `tenantDb(ctx)` wrapper that auto-injects `tenant_id`; lint rule forbidding raw `supabaseAdmin` in route handlers. Make the safe path the default.

### H-D — Unauthenticated AI endpoints, no rate limit
- **Where:** `app/api/yinez/route.ts` (`maxDuration=60`, public, calls LLM), `/api/chat`.
- **Risk:** anyone sprays requests → unbounded Anthropic/Telnyx spend + junk rows. Financial DoS.
- **Fix:** `rateLimitDb` per IP + per session, hard daily cap, honeypot/bot check.
- **NOTE: this is the one I will NOT test by probing prod** (it would itself cost real money). Verify by code + a local hit.

---

## MEDIUM / LOW — carried forward (see 06-28 audit for detail)

- **M-1** rate-limit coverage; **M-2** six auth systems; **M-3** plaintext-secret count (needs DB); **M-4** test routes in prod (`grep` confirms `/api/test-emails`, `/api/test/email-selena`, `/api/admin/cleanup-test-bookings` still present).
- **L-1** `/api/auth/login` uses an **in-memory `Map`** for rate limiting (resets on cold start / per-instance) — weaker than the DB limiter used by `admin-auth`. The PIN fallback authenticates against global `ADMIN_PASSWORD`.
- **L-2** delete the `IMPERSONATION_ALLOW_UNSIGNED` branch (confirmed unset in prod).
- **L-3** confirm Telegram webhook validates the secret-token header.
- **L-4** trim the middleware impersonation-bypass prefix list.

---

## Tenant-platform expectations matrix (the "match against expectations" you asked for)

Tiers: **Super-admin / platform**, **Tenant operator**, **Customer/cleaner portal**, **Public/unauth**.

| Expectation | Super-admin | Tenant operator | Portal user | Public | Verdict |
|---|---|---|---|---|---|
| Can read **only** its own tenant's data | N/A (cross-tenant by design) | ✅ Clerk `tenant_members.single()` binds to ONE tenant; cannot select another | ✅ `client_session`/team session scoped to client/tenant | ✅ only capability-token or tenant-domain data | **PASS** for Clerk operators |
| Cannot escalate to another tenant | ✅ is the cross-tenant role | ⚠️ **FAILS via shared `ADMIN_PASSWORD`** — any operator with the shared admin password can log into any tenant's clone admin (C-A) | ✅ no cross-tenant path found | ✅ | **FAIL at operator tier (C-A)** |
| Strong, attributable credential | ❌ single shared PIN, no MFA, no per-admin identity (H-A) | ❌ shared password (C-A); Clerk path is fine | ⚠️ phone/email + signed cookie; 30-day TTL | ✅ tokens are unguessable | **WEAK** |
| DB-level isolation backstop | ❌ service_role bypasses RLS | ❌ same | ❌ same | ❌ same | **FAIL (H-B)** — app-layer only |
| Object access checks ownership (no IDOR) | by design cross-tenant | ✅ swept clean | ✅ | ✅ token-scoped | **PASS** |
| Cost-bearing endpoints are gated | N/A | N/A | N/A | ❌ AI endpoints open (H-D) | **FAIL at public tier (H-D)** |
| Mutations require write-role | ✅ owner | ✅ `protectWriteAPI`/`requirePermission` | read-mostly | N/A | **PASS** |

**One-line read:** Clerk-based tenant operators are properly isolated. The two holes are (1) the legacy shared-`ADMIN_PASSWORD` operator surfaces that bypass that isolation (C-A), and (2) the DB has no backstop if app-layer discipline ever slips (H-B). Public-tier cost abuse (H-D) is the third.

---

## Still needs live testing (could not do statically / within blast-radius rules)

1. **PIN/password entropy** — how long are `ADMIN_PIN` / `ADMIN_PASSWORD`? Short = the per-IP rate limit isn't enough. (You can tell me; I won't read the value.)
2. **Live RLS state per table** — needs `pg_policies` read. Code shows deny-stubs on ~4 tables; the other ~40 unconfirmed.
3. **Plaintext-secret count** (M-3) — needs one `SELECT count(*) ... NOT LIKE 'v1:%'`.
4. **AI-endpoint cost abuse (H-D)** — provable locally; I will NOT spray prod.
5. **Cross-surface session interop (C-A)** — provable on a local boot: mint an `admin_session` via one tenant's login, present it to another tenant's admin API, confirm acceptance. Safe locally; would touch prod data if done live.

These five are the actual "test the vulnerabilities" payload. #4 and #5 are the highest-value and both are safe to run **locally** with a booted instance — no prod risk. Say the word and I'll set that up.
</content>
</invoke>
