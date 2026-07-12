# Pre-Deploy Security Checklist — the consolidated Q3 gate

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. A single **go / no-go security gate** for the Q3 deploy, consolidating the individual
audits already in `deploy-prep/` into one checklist with a verdict per area. This file does **not** re-derive
findings — each row links the audit that owns the detail. **Nothing here was applied.**

> **How to read the verdicts.**
> - ✅ **PASS** — in place *and* regression-guarded by a test (can't silently regress).
> - 🟢 **OK (unguarded)** — correct today but no test pins it; a future edit could break it silently.
> - 🟠 **GAP** — a real hole or missing control; ship-decision needed (accept / fix / mitigate).
> - 🔴 **BLOCKER** — do not deploy to the affected surface until resolved or explicitly risk-accepted by Jeff.
>
> "Guarded" refers to an automated test under `platform/src/**/*.test.ts`. See
> [`security-test-inventory.md`](./security-test-inventory.md) for the full codified-vs-gap map.

---

## 0. Verdict at a glance

| # | Area | Verdict | One-line status |
|---|------|:-------:|-----------------|
| A | Transport / response headers | ✅ PASS | 5 headers ship + guarded; CSP is a plan, not shipped |
| B | Content-Security-Policy | 🟠 GAP | No CSP header at all yet — [rollout plan](./csp-rollout-report-only-plan.md) unstarted |
| C | Secrets management | 🟠 GAP | `SECRET_ENCRYPTION_KEY` at-rest + verify-toggle risks; no leak in responses (guarded) |
| D | Tenant isolation (multi-tenant) | 🔴 BLOCKER-CLASS | RLS effectively **off** (service-role bypass); isolation is app-layer only, unguarded |
| E | Rate limiting | 🟠 GAP | Auth/OTP mostly covered; `auth/login` non-durable + public Stripe checkout uncapped |
| F | CSRF | 🟢 OK (unguarded) | SameSite-only, adequate for POST/PATCH/DELETE; 4 low-value GET-mutations flagged |
| G | Input validation / injection | 🟠 GAP | `.or()` filter-string injection + 217 unvalidated `.eq([id])`; body mass-assignment partly witnessed |
| H | Error-response info leak | ⚠️ SPLIT | Stack/secret leak = ✅ guarded; raw `error.message` schema leak (142 routes) = 🟠 GAP |
| I | Webhook hardening | 🟠 GAP | Signature verify tested; idempotency non-existent on 4 webhooks (witnessed), telnyx-voice fails open |
| J | Dependency vulnerabilities | 🟠 GAP | 31 advisories; prod-runtime-reachable subset needs `npm audit fix` — see [summary](./dependency-vuln-summary.md) |
| K | Debug/log hygiene | ✅ PASS | No debug-tier `console.*` in API routes (new guard `console-leak.test.ts`) |

**Bottom line:** the deploy is **not blocked by transport/header or auth-mechanism defects** — those are solid.
The **decision-forcing item is D (tenant isolation)**: RLS is enabled on 34 tables but bypassed by the
service-role connection, so a single missing `.eq('tenant_id', …)` is a cross-tenant data leak with **no DB
backstop and no test**. Everything else is a known, documented GAP that Jeff can consciously accept or schedule.

---

## A. Transport / response headers — ✅ PASS

- [x] `X-Content-Type-Options: nosniff` — present (`next.config.ts`)
- [x] `X-Frame-Options: DENY` — present (not SAMEORIGIN)
- [x] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — present
- [x] `Referrer-Policy: strict-origin-when-cross-origin` — present
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` — present
- [x] **Regression guard**: `src/config/security-headers.test.ts` fails RED if any of the five drop or weaken.

> Backing: [`csp-security-headers-spec.md`](./csp-security-headers-spec.md) §1a. No action required to ship.

## B. Content-Security-Policy — 🟠 GAP (not a blocker; XSS defense-in-depth only)

- [ ] **No CSP header of any kind is emitted today.** XSS mitigation currently rests on framework escaping +
      the `email-html-escape` / `render-markdown` guards — there is no CSP layer.
- [ ] Rollout is a **4-phase plan, unstarted** ([`csp-rollout-report-only-plan.md`](./csp-rollout-report-only-plan.md)):
      static polish → nonce+Report-Only sensor → fix 478 JSON-LD + root-layout + 3rd-party sinks → enforce.
- [ ] **Do not attempt to enforce a CSP as part of this deploy** — enforcing before the Report-Only burn-down is
      clean will break structured data, analytics, maps, and possibly Clerk sign-in (plan §6 R1–R4).
- **Ship decision:** deploying **without** CSP is acceptable (status quo). Adding CSP is a separate, gated project.

## C. Secrets management — 🟠 GAP

- [x] **No secret value or stack trace is emitted in any HTTP response** — guarded by
      `src/app/api/error-response-leakage.test.ts` (scans all `route.ts`).
- [ ] 🟠 **`SECRET_ENCRYPTION_KEY` has no safe rotation path** (no `kid`, no re-encrypt job) and is **absent from
      `.env.example`** → if unset in an env, tenant vendor keys write as **plaintext at rest**.
      ([`secrets-at-rest-audit.md`](./secrets-at-rest-audit.md), [`secrets-inventory-and-rotation-plan.md`](./secrets-inventory-and-rotation-plan.md) #1/GAP A/B)
- [ ] 🟠 **Verify-toggle check**: confirm prod env has **`*_WEBHOOK_VERIFY` ON** and
      **`IMPERSONATION_ALLOW_UNSIGNED` unset/false** — any of these off silently disables a signature check.
- [ ] `.env.example` documents ~13 of ~45 secrets → provisioning-gap risk at cutover (GAP C). Verify all 45 names
      are set in the Vercel project before flipping traffic.
- **Pre-flight action (env review, not code):** confirm `SECRET_ENCRYPTION_KEY` is set, and all verify toggles ON.

## D. Tenant isolation — 🔴 BLOCKER-CLASS (the decision item)

- [ ] 🔴 **RLS is not a backstop.** 34 tables carry `ENABLE ROW LEVEL SECURITY` but only **5 `CREATE POLICY`**
      statements exist, and the server connects with the **service-role key, which bypasses RLS entirely**
      (`src/lib/supabase.ts`). Net: tenant isolation is enforced **only** by app-layer `getTenantForRequest()` +
      explicit `.eq('tenant_id', …)` filters. A single omitted filter = cross-tenant read/write with no DB catch.
- [ ] 🔴 **No regression test** pins read-path tenant isolation across the 498-route surface — only
      `smart-schedule.test.ts` (1 case) touches it. ([`security-test-inventory.md`](./security-test-inventory.md) G2)
- [ ] 🟠 **217 `.eq([id])`-style lookups take route params without validating tenant ownership** of the id
      ([`input-validation-audit.md`](./input-validation-audit.md)) — the exploit path for the above.
- **Ship decision required from Jeff:** either (a) accept app-layer-only isolation as the current posture and
      **schedule** the tenant-isolation route harness (inventory §4.2) as a fast-follow, or (b) block the deploy
      until a representative harness exists. Recommendation: **(a) + write the harness first thing post-deploy** —
      the mechanism is sound where applied; the risk is an *unaudited* missing filter, which a harness converts
      from silent to loud.

## E. Rate limiting — 🟠 GAP

- [x] Auth / OTP / PIN: 7 of 8 sensitive auth routes use durable `rateLimitDb`.
- [ ] 🔴 **`auth/login`** (operator login, incl. shared-`ADMIN_PASSWORD` fallback) uses a **per-instance in-memory
      `Map`**, not durable — weak on serverless. ([`rate-limit-coverage-audit.md`](./rate-limit-coverage-audit.md) #1)
- [ ] 🔴 **Public Stripe-checkout endpoints uncapped** (`invoices/public/[token]/checkout`,
      `quotes/public/[token]/deposit-checkout`) — unauthenticated session creation + token brute-force (#2).
- [ ] 🟠 Public signature/acceptance writes uncapped (#3); `waitlist` comment claims a limiter that isn't wired (#4);
      `ingest/*` shared-secret endpoints have no attempt cap (#5).
- [ ] ⚠️ **`rateLimitDb` fails open on any DB error** — a Postgres blip disables *all* rate limiting platform-wide.
- **Recommended fix order before deploy:** #1 → #2 → #3 (auth/login durable, then public checkout, then sign/accept).

## F. CSRF — 🟢 OK (unguarded)

- [x] All session cookies are `SameSite=Strict`/`Lax`; **no unprotected cookie-authed POST/PATCH/PUT/DELETE** found.
      Bearer-token surfaces are CSRF-immune. ([`csrf-coverage-audit.md`](./csrf-coverage-audit.md))
- [ ] 🟡 4 state-changing **GET** handlers under a `Lax` cookie (notifications/messages read-receipts) — LOW,
      forgeable via top-level nav; move to POST or accept.
- [ ] 🟡 Single-layer (SameSite only) — no Origin/Referer check. Cheap defense-in-depth = Origin allowlist for
      mutating methods in `middleware.ts`. No CSRF test exists (inventory G1).
- **Ship decision:** acceptable to ship; the 4 GET-mutations are low-value. Consider the Origin allowlist as fast-follow.

## G. Input validation / injection — 🟠 GAP

- [x] The `validate`/`pick` helper (whitelist + type + bounds + mass-assignment strip) is unit-tested
      (`src/lib/validate.test.ts`); the `reviews` boundary is witnessed (`reviews/input-validation.witness.test.ts`).
- [ ] 🟠 **`.or()` PostgREST filter-string injection** — raw `searchParams.get('search')` interpolated into a
      PostgREST `.or()` filter string ([`input-validation-audit.md`](./input-validation-audit.md) P1). Needs a
      live-DB exploit confirmation, then a guard.
- [ ] 🟠 **Body mass-assignment** — 4 more `.update(body)` sites (expenses/referrals/schedules/announcements) not
      yet whitelisted or witnessed ([`input-validation-coverage-audit.md`](./input-validation-coverage-audit.md) GAP 3).
- [ ] 🟠 NaN pagination + unvalidated `[id]` params (overlaps D).

## H. Error-response info leak — ⚠️ SPLIT

- [x] **No stack trace / secret env value in any response** — guarded (`error-response-leakage.test.ts`).
- [ ] 🟠 **Raw Postgres `error.message` returned by ~142 routes** = schema/column leakage
      ([`error-info-leak-audit.md`](./error-info-leak-audit.md)). Not a secret leak, but an information-disclosure
      gap; the cheapest fix is to extend the existing leakage scan to also flag raw `error.message` (inventory §4.1).

## I. Webhook hardening — 🟠 GAP

- [x] Signature verification (Svix/HMAC) rejects bad sigs — unit-tested (`webhook-verify.test.ts`).
- [ ] 🟠 **No idempotency** on `resend`/`telegram`/`telnyx-sms` webhooks (duplicate rows) — 3 witness tests armed;
      flip red when `claimWebhookEvent` dedupe is wired ([`webhook-idempotency-audit.md`](./webhook-idempotency-audit.md),
      [`webhook-dedupe-helper-design.md`](./webhook-dedupe-helper-design.md)).
- [ ] 🟠 **`telnyx-voice` fails OPEN on verify error** — witnessed; flip when it fails closed.

## J. Dependency vulnerabilities — 🟠 GAP

- [ ] 🟠 31 advisories (3 critical / 14 high / 11 moderate / 3 low). The critical `vitest` advisory is **dev/test
      tooling** (also mis-declared under `dependencies`); the production-runtime-reachable subset (`next`,
      `axios`→`form-data`, `nodemailer`, `undici`, `picomatch`, `next-intl`, `linkify-it`) is the real work.
- [ ] Run `npm audit fix` (non-breaking) + evaluate the `next@16.2.10` bump. Full triage:
      [`dependency-vuln-summary.md`](./dependency-vuln-summary.md).

## K. Debug / log hygiene — ✅ PASS

- [x] **No debug-tier `console.*`** (`log`/`debug`/`trace`/`dir`/`table`/…) in `src/app/api/**/route.ts` — new
      guard `src/app/api/console-leak.test.ts`. `console.error`/`warn`/`info` (server-side leveled logging) are
      allowed; the single pre-existing operational `console.log` in `internal/deploy-hook` is explicitly
      allowlisted and documented in the test.

---

## Consolidated GO / NO-GO

| Gate | Must be true to deploy | Status |
|---|---|:---:|
| Transport headers present + guarded | Yes | ✅ |
| No secret/stack in responses | Yes | ✅ |
| Debug console hygiene | Yes | ✅ |
| Auth mechanisms sound (signing, RBAC, webhook verify) | Yes | ✅ (see inventory) |
| `SECRET_ENCRYPTION_KEY` set + verify toggles ON in prod env | **Yes — verify before flip** | ⬜ pre-flight |
| Tenant isolation posture explicitly risk-accepted by Jeff | **Yes — decision required** | ⬜ pending |
| `auth/login` durable limiter + public checkout cap | Recommended, not hard-blocking | 🟠 |
| `npm audit fix` run for prod-reachable advisories | Recommended | 🟠 |

**Two items require a human decision before the flip:** the env pre-flight (C) and the tenant-isolation
risk-acceptance (D). Everything else is either ✅ or a documented 🟠 that can ship-with-known-risk.

**Method & honesty:** this checklist is a synthesis of the existing `deploy-prep/` audits (each linked inline) plus
direct verification of header presence (`next.config.ts`), RLS counts (`grep` over `migrations/`), and the
service-role connection (`src/lib/supabase.ts`). It asserts **test coverage and documented posture**, not a live
penetration test. No code, config, env, or DB was modified.
</content>
</invoke>
