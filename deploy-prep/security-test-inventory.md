# Security-Test Inventory — invariants codified as tests vs. the gaps

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. A map of which **security invariants** in Full Loop CRM are currently pinned by an
automated test (so they can't silently regress) and which are **not yet codified**. Built by reading the test
suite end-to-end (`find src -name '*.test.ts'`). Companion to the audit set in `deploy-prep/`.

> How to read severity of a gap: an **un-codified** invariant is not necessarily broken — it means there is no
> regression guard, so a future refactor could remove the protection without a red test. "Gap" here = "no test",
> not "no protection".

---

## TL;DR

- **~15 security invariants are codified** across 12 security-relevant test files (unit + route-level + witness).
- **The witness pattern is load-bearing here:** 5 tests intentionally document a *current gap* and are written
  to **flip red when the gap is fixed** (4 webhook idempotency + the new input-validation one). Green today,
  green is the alarm's "armed" state, red means "fix landed."
- **Biggest un-codified invariants** (see §3): CSRF protection, tenant isolation on read paths (only 1 domain
  test touches it), the `.or()` PostgREST injection class, and the raw-`error.message` schema leak (142 routes,
  tracked in `error-info-leak-audit.md` but not pinned by a test).

---

## 1. Codified invariants (there is a test; it will catch a regression)

| Invariant (what breaks if it regresses) | Test | Kind |
|---|---|---|
| No HTTP error response embeds a stack trace or secret env value | `src/app/api/error-response-leakage.test.ts` | guard (string-scan over all `route.ts`) |
| The 5 baseline security response headers ship (nosniff, X-Frame DENY, HSTS, Referrer-Policy, Permissions-Policy) | `src/config/security-headers.test.ts` | guard |
| Team-portal PIN auth can't be brute-forced (per-tenant fail counter, 6-digit space) | `src/app/api/team-portal/auth/route.test.ts` | route-level regression |
| Admin-notification email escapes HTML (no email injection) | `src/app/api/email-html-escape.test.ts` | regression |
| AI-dashboard assistant output is not reflected-XSS | `src/app/dashboard/ai/render-markdown.test.ts` | regression |
| Body validation: whitelist + type + bounds + mass-assignment strip | `src/lib/validate.test.ts` | unit (the helper) |
| **Validated boundary rejects malformed input; un-validated PUT forwards raw body (mass-assignment gap)** | `src/app/api/reviews/input-validation.witness.test.ts` | **guard + witness (NEW, this queue)** |
| RBAC role/permission matrix resolves correctly | `src/lib/rbac.test.ts` (18) | unit |
| Portal RBAC field-staff tiers gate correctly | `src/lib/portal-rbac.test.ts` (9) | unit |
| Webhook signature verification (Svix/HMAC) rejects bad sigs | `src/lib/webhook-verify.test.ts` (9) | unit |
| Rate-limit bucket accounting is correct | `src/lib/rate-limit.test.ts` (9) | unit |
| Impersonation tokens are signed/verified (no forgery) | `src/lib/impersonation.test.ts` (6) | unit |
| Signed `x-tenant-id` companion header can't be spoofed downstream | `src/lib/tenant-header-sig.test.ts` | unit |
| nycmaid session cookie round-trips & rejects tampering | `src/lib/nycmaid/auth.test.ts` (14) | unit |
| Cleaner-payout is idempotent (no double-pay) | `src/lib/finance/cleaner-payout-idempotency.test.ts` | regression |
| Audit-log writer records the right shape | `src/lib/audit.test.ts` (4) | unit |
| Tenant isolation in cleaner scoring | `src/lib/nycmaid/smart-schedule.test.ts` (1) | unit (narrow) |

### Witness tests (green now, EXPECTED to flip red when the gap is closed)
| Gap being witnessed | Test | Flips when |
|---|---|---|
| `reviews/[id]` PUT raw `.update(body)` mass-assignment | `reviews/input-validation.witness.test.ts` | body is whitelisted (`validate`/`pick`) |
| resend `email.received` non-idempotent (dup rows) | `webhooks/resend-idempotency.witness.test.ts` | `claimWebhookEvent` dedupe wired in |
| telegram webhook non-idempotent | `webhooks/telegram-idempotency.witness.test.ts` | dedupe wired in |
| telnyx SMS webhook non-idempotent | `webhooks/telnyx-sms-idempotency.witness.test.ts` | dedupe wired in |
| telnyx voice fails **open** on verify error | `webhooks/telnyx-voice-failopen.witness.test.ts` | verify fails closed |

## 2. What "codified" buys us

Each row above is an invariant a future edit could break; the test turns that break into a red CI signal instead
of a production incident. The **guard** tests (headers, error-leakage) scan *all* routes, so they also catch a
*new* route that violates the invariant — not just a regression in an existing one.

## 3. Un-codified invariants — gaps (no test pins these yet)

| # | Invariant with no regression guard | Where it's documented | Priority to codify |
|---|---|---|---|
| G1 | **CSRF** protection on state-changing routes | `csrf-coverage-audit.md` | HIGH |
| G2 | **Tenant isolation on read paths** — only `smart-schedule` (1 case) touches it; the 498-route read surface is unguarded | — | HIGH |
| G3 | **Raw `error.message` schema leak** (142 routes return Postgres errors) | `error-info-leak-audit.md` | MEDIUM (a scan-guard like error-leakage would fit) |
| G4 | **`.or()` PostgREST filter injection** (query-param `search`) | `input-validation-audit.md` P1 | MEDIUM–HIGH (needs live-DB exploit check first) |
| G5 | **Body mass-assignment — the other 4 `.update(body)` sites** (expenses/referrals/schedules/announcements); only `reviews` is now witnessed | `input-validation-coverage-audit.md` GAP 3 | MEDIUM |
| G6 | **Rate-limit *coverage*** — the mechanism is tested (`rate-limit.test.ts`) but *which endpoints apply it* is not asserted | `rate-limit-coverage-audit.md` | MEDIUM |
| G7 | **CSP** (once rolled out) — no test that the policy ships / has no `unsafe-inline` script-src | `csp-security-headers-spec.md`, `csp-rollout-report-only-plan.md` | LOW until CSP lands |
| G8 | **Secret-at-rest encryption** round-trip (`SECRET_ENCRYPTION_KEY`) | `secrets-at-rest-audit.md` | MEDIUM |

## 4. Suggested next guards (cheapest → highest value, leader/Jeff decides)

1. **Extend the error-leakage scan** to also flag raw `error.message` in responses (G3) — same guard shape as
   the existing stack/secret scan; turns a 142-route audit into an enforced ceiling.
2. **A tenant-isolation route harness** (G2) — drive a representative GET with tenant A's session against tenant
   B's row id, assert empty/404. One pattern, reused across the hot tables.
3. **Witness the other 4 `.update(body)` sites** (G5) — copy the `reviews` witness shape; each flips when
   whitelisted.

---

**Method & honesty note:** the codified list is from reading every `*.test.ts` under `src/`. Case counts (e.g.
"18") are `grep -cE 'it\(|test\('` per file — a proxy for breadth, not a coverage percentage. "Gap" means *no
regression test*, not *no protection in code*; several gaps (CSRF, tenant reads) may be partially enforced in
middleware/RLS today — this inventory tracks **test coverage of the invariant**, which is what stops silent
regression. Nothing here was applied.
