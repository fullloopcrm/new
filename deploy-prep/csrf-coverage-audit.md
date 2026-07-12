# CSRF Coverage Audit — state-changing endpoints

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Enumerate state-changing (POST/PATCH/PUT/DELETE) API endpoints and the CSRF
posture of each, with emphasis on **cookie/session-authenticated** routes (the only ones a browser
can be tricked into calling with ambient credentials). No code or routes changed.

---

## TL;DR

- **CSRF defense in this app is 100% SameSite-cookie-based.** There are **no CSRF tokens**, and there is
  **no Origin/Referer validation** anywhere in `src/middleware.ts` or the auth helpers.
- For **POST / PATCH / PUT / DELETE**, that is actually adequate: every session cookie is `SameSite=Strict`
  or `SameSite=Lax`, and browsers do **not** attach Lax/Strict cookies to cross-site requests using those
  methods. So the large majority of the mutating surface is **protected by SameSite** today.
- **Bearer-token** surfaces (team portal, referrer portal, web-app portal) are **CSRF-immune** — a custom
  `Authorization` header is never auto-sent cross-origin.
- **The real residual gap is state-changing `GET` handlers under a `Lax` cookie.** Lax cookies *are* sent on
  top-level cross-site GET navigation (a forced `window.location` / clicked link). Four such endpoints exist,
  all low-value "mark-as-read"/presence writes. Flagged below.
- **Single-layer risk:** because everything rests on SameSite alone, there is no defense-in-depth. Any
  same-origin XSS on a subdomain, or a client on a pre-SameSite browser, bypasses it. An Origin allowlist
  check for mutating methods would be cheap insurance.

**Method note (honesty):** I did not hand-read all ~350 route files. I classified endpoints by their
**auth-helper import** and then **verified the auth mechanism of each helper** (cookie name + SameSite, or
Bearer). GET-body mutations were detected by parsing each `GET` function body for `.insert/.update/.upsert/
.delete`. Per-endpoint CSRF verdict is inferred from the helper, not from reading every handler individually.

---

## 1. Session / credential inventory (verified)

| Credential | Set at | Flags | CSRF-relevant? | Read by |
|---|---|---|---|---|
| `admin_session` | `api/auth/login/route.ts:58,86` | httpOnly, secure(prod), **SameSite=Strict**, 24h | Yes (cookie) | `lib/nycmaid/auth.ts` `getAdminUser`/`requireAdmin`; `lib/owner-session.ts` `getOwnerUserId` |
| `admin_role` | `api/auth/login/route.ts:66,93` | **not httpOnly**, secure(prod), SameSite=Strict | Page-gating only | `src/middleware.ts` (page redirects) |
| `admin_token` | `api/admin-auth/route.ts:87` | httpOnly, secure(prod), **SameSite=Lax**, 24h | Yes (cookie) | `lib/require-admin.ts`; `lib/tenant-query.ts` `getTenantForRequest`; `api/admin-auth/me`; `api/admin/system-check`; layouts |
| `client_session` | `lib/client-auth.ts:84-91` (opts) → `api/client/login`, `api/client/verify-code:123` | httpOnly, secure(prod), **SameSite=Strict** | Yes (cookie) | `lib/nycmaid/auth.ts` `protectClientAPI`; `lib/client-auth.ts` `protectClientAPI` |
| Clerk `__session` | Clerk (framework) | framework-managed, **SameSite=Lax** (Clerk default) | Yes (cookie) | `lib/tenant-query.ts` Clerk path (`auth()`) |
| Impersonation cookie | `lib/impersonation.ts` (`IMPERSONATE_COOKIE`) | — | Overlay on above | `lib/tenant-query.ts` |
| Team-portal token | — | **Bearer header** (`Authorization`) | **No — CSRF-immune** | `lib/team-portal-auth.ts` `getPortalAuth` |
| Referrer-portal token | — | **Bearer header** | **No — CSRF-immune** | `lib/referrer-portal-auth.ts` `getReferrerAuth` |
| Web-app portal token | `api/portal/auth` → JSON body (client stores, sends as Bearer) | **Bearer header** | **No — CSRF-immune** | `api/team-portal/auth/token`, portal routes |
| Cron secret | env `CRON_SECRET` | **Bearer header**, checked per route | **No — CSRF-immune** | `lib/nycmaid/auth.ts` `protectCronAPI`, per-cron checks |
| Webhook signatures | provider HMAC | signature header, no cookie | **No — CSRF-immune** | `api/webhooks/*` (see `webhook-hardening-plan.md`) |

**Key structural facts**
- No CSRF token machinery exists (grep for `csrf`/`__Host`/`__Secure`: only `lib/oauth-state.ts`, which is
  OAuth-callback state binding, not request CSRF).
- No Origin/Referer check in `src/middleware.ts` or any auth helper.
- `src/middleware.ts` only does canonical-domain redirects + page-level auth gating (redirect unauth to
  `/sign-in`); it explicitly does **not** touch API POST bodies (`middleware.ts:181` note).

---

## 2. Auth-helper usage (how the mutating surface is authenticated)

From import counts across `src/app/api`:

| Helper | Import sites | Credential | SameSite | POST/PATCH/DELETE CSRF verdict |
|---|---|---|---|---|
| `lib/tenant-query` (`getTenantForRequest`) | 194 | `admin_token` **or** Clerk | **Lax** | Protected for POST/PATCH/DELETE (Lax not sent cross-site on these methods) |
| `lib/require-permission` | 119 | (builds on tenant-query) | Lax | Same as above |
| `lib/require-admin` (`src/lib/require-admin.ts`) | 80 | `admin_token` | **Lax** | Protected for POST/PATCH/DELETE |
| `lib/team-portal-auth` | 10 | Bearer | — | **Immune** |
| `lib/nycmaid/auth` (`requireAdmin`/`protectClientAPI`/`protectCronAPI`) | 9 | `admin_session`/`client_session`/cron | Strict / Strict / Bearer | Protected / Protected / Immune |
| `lib/client-auth` (`protectClientAPI`) | 6 | `client_session` | **Strict** | Protected |
| `lib/referrer-portal-auth` | 3 | Bearer | — | **Immune** |

**Method distribution (handler files):** GET 298 · POST 267 · PUT 53 · PATCH 35 · DELETE 48.

**Bottom line for POST/PATCH/PUT/DELETE:** across every bucket above, the state-changing surface is
CSRF-protected — either by SameSite (Strict or Lax both block cross-site POST/PATCH/DELETE) or by Bearer.
**No unprotected cookie-authed POST/PATCH/DELETE endpoint was identified.**

---

## 3. FLAGGED — state-changing `GET` under a `Lax` cookie

Lax cookies **are** sent on top-level cross-site GET navigation. A GET handler that mutates + a Lax session
cookie = forgeable by luring the victim to navigate (link, `window.location`, redirect). All four below are
authed via `admin_token`/Clerk (**Lax**) and perform writes inside the GET body:

| Endpoint | Auth | GET-body write | Severity | Notes |
|---|---|---|---|---|
| `api/notifications/route.ts` | `getTenantForRequest` (Lax) | `.update(` | LOW | Marks notifications read |
| `api/dashboard/messages/route.ts` | `getTenantForRequest` (Lax) | `.update(` | LOW | Marks messages read |
| `api/connect/messages/route.ts` | `getTenantForRequest` (Lax) | `.upsert(` | LOW | Read-state / presence upsert |
| `api/admin/tenant-chats/route.ts` | `require-admin` (Lax, `admin_token`) | `.update(` | LOW | Marks chats read |

**Not flagged (safe) GET-mutations:**
- `api/portal/messages/route.ts` → `protectClientAPI` = `client_session` (**Strict**) → cookie not sent on
  cross-site nav → safe.
- `api/team-portal/messages/route.ts`, `api/team-portal/connect`, `api/portal/connect` → **Bearer** → immune.
- All 22 `api/cron/*` GET-mutations verified gated on `CRON_SECRET`/`protectCronAPI` (Bearer, no cookie) →
  immune. (Confirmed: none ungated.)

**Severity is LOW** because the writes are read-receipts/presence, not money/identity/state transitions.
The correct fix (if pursued) is to move these mutations to POST, or accept them. Not gated here.

---

## 4. Public / unauthenticated state-changing POSTs — CSRF N/A, abuse-relevant

These accept POST with **no session** (intentional public intake). CSRF is **not applicable** (there is no
ambient credential to forge), but they are spam/abuse targets — coverage is in
`deploy-prep/rate-limit-coverage-audit.md`, not here:

`api/contact`, `api/inquiry`, `api/apply`, `api/apply-ceo`, `api/waitlist`, `api/ingest/lead`,
`api/ingest/application`, `api/lead`, `api/reviews/submit`, `api/reviews/request`, `api/portal/auth`
(send-code), `api/client/send-code`, `api/referrers/auth/request`, public token routes
(`api/quotes/public/[token]/*`, `api/invoices/public/[token]/*`, `api/documents/public/[token]/*`).

---

## 5. Adjacent (not strictly CSRF) — noted, not fixed

- **`admin_role` cookie is not httpOnly** (`api/auth/login/route.ts:66,93`) — readable/tamperable by JS.
  Middleware trusts it for **page-level** gating only; API routes re-verify via `admin_token`/`admin_session`,
  so a forged `admin_role` gets you a rendered shell but not API access. Still worth making httpOnly or
  server-deriving the role. (XSS/tamper concern, adjacent to CSRF.)
- **`admin_token` is Lax while its sibling `admin_session` is Strict** — inconsistent. Lax is adequate for
  POST/PATCH/DELETE, so this is not a hole, just asymmetry. **Do not blindly switch to Strict:** `admin_token`
  is read by `src/middleware.ts` (~line 257) to admit an admin hitting `/dashboard` directly, and Strict would
  drop the cookie when the admin arrives from an external link/redirect — likely why it's Lax. Any change must
  be tested against the impersonation + direct-nav flows.

---

## 6. Recommendations (docs only — leader/Jeff decides; nothing applied)

1. **Add defense-in-depth: Origin allowlist for mutating methods.** In `src/middleware.ts`, for
   `POST/PATCH/PUT/DELETE` to `/api/*`, reject when `Origin` is present and not in the tenant/app allowlist.
   This is cheap, framework-agnostic insurance against the single-layer SameSite dependency (old browsers,
   subdomain XSS). Must allowlist legitimate cross-subdomain tenant hosts + webhook callers (or scope the
   check to exclude `/api/webhooks/*` and `/api/cron/*`, which are Bearer/HMAC anyway).
2. **Close the 4 GET-mutation endpoints (§3):** move the read-receipt/presence writes to POST, or explicitly
   accept them as low-value.
3. **Make `admin_role` httpOnly** or derive role server-side (§5).
4. **Document the SameSite-only posture** as an intentional decision in the security runbook, so it is a
   choice on record rather than an implicit one.

---

## Appendix — verification commands used

```
grep -rnE "\.set\('(admin_token|admin_session|admin_role|client_session)'" src/app src/lib   # cookie flags
grep -rniE "sameSite|csrf|__Host|__Secure" src/lib src/middleware.ts                         # defense inventory
# GET handlers with a mutation inside their own function body (node brace-matcher) -> 32, of which
#   24 cron (CRON_SECRET-gated, immune), 4 safe non-cron (3 Bearer + 1 client_session Strict),
#   4 flagged (Lax cookie: notifications, dashboard/messages, connect/messages, admin/tenant-chats)
```

**Nothing in this audit was applied. No routes, cookies, or middleware were modified.**
