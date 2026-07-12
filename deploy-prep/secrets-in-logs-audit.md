# Secrets & PII in Logs Audit — `console.*` in production server paths

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Do any `console.log/error/warn/info` statements in production code
paths (`platform/src/app/api/**`, `platform/src/lib/**`) write **secret values** or **customer
PII** to the server log stream (Vercel Functions logs, retained + queryable)? No code changed.

> **This is a different surface from the existing egress audits.** `error-response-leakage-audit.md`
> and `error-info-leak-audit.md` cover what crosses into the **HTTP response body** (schema text,
> stack traces, env values). This audit covers what goes into **server-side logs** — never seen by
> the client, but still a real exposure via log retention, log-forwarding, and anyone with dashboard
> access. Read together; they do not overlap.

**Method:** grep every `console.*` call site in prod paths, then read the surrounding branch for
each candidate. **Denominator:** 480 `console.*` calls in prod `src` (excludes `*.test.*`).

---

## TL;DR — verdict

- **SECRETS: clean.** Zero `console.*` statements log a secret *value* — no API keys, bearer/session
  tokens, passwords, PINs, OTP codes, `process.env.<secret>` values, or `Authorization` headers.
  Verified by targeted grep (`api_key|apikey|secret|password|token|bearer|service_role|private_key`,
  then `\bcode\b|\bpin\b|otp|verification`, then `process\.env\.` on a console line, then
  `authorization|bearer`). Every hit was an error object, a `"…not set/missing"` message, or a literal
  route-path string like `'POST /api/invoices/public/[token]'` — none a live secret.
- **OAuth token logs are failure-branch only → no token present.** The five "token exchange/refresh
  failed" logs all sit inside a `!res.ok` / `!access_token` guard, so the logged body is an error
  payload, not a credential. Verified per-site (anchors below). **Not a leak.**
- **PII: minor, real, low severity.** ~8 `console.error/warn` sites interpolate a customer **email or
  phone** (and one logs a phone in a structured object) into a failure log. Not credentials — a
  log-retention / privacy-hygiene issue, not a breach vector. Ranked below.
- **Debug leftovers: negligible.** Only 2 raw `console.log` in prod paths, both benign (a deploy-hook
  count; a doc-comment code sample). No stray body dumps.

**Net:** no secret-in-logs work is required before deploy. The PII items are worth a cheap cleanup
pass but are **not** a deploy blocker.

---

## Finding 1 (🟡 LOW) — Customer email/phone interpolated into failure logs

Server logs are retained and searchable in the Vercel dashboard; anyone with project access (or a
log-drain destination) can read them. Emitting raw PII there widens the PII blast radius beyond the
database. None of these log a secret — only contact PII, and only on a send failure.

| Site | Logged PII |
|---|---|
| `src/app/api/campaigns/[id]/send/route.ts:104` | `${client.email}` (campaign email failure) |
| `src/app/api/campaigns/[id]/send/route.ts:118` | `${client.phone}` (campaign SMS failure) |
| `src/app/api/campaigns/send/route.ts:158` | `${row.recipient}` (email) |
| `src/app/api/campaigns/send/route.ts:193` | `${row.recipient}` (SMS) |
| `src/app/api/campaigns/send/route.ts:286` | `${row.recipient}` (retry) |
| `src/app/api/documents/public/[token]/sign/route.ts:253` | `${s.email}` (signer copy failure) |
| `src/lib/selena/agent.ts:516` | `{ phone: lookupPhone }` (empty-response diagnostic) |
| `src/lib/selena/tools.ts:81` | `{ phone }` (blocked owner-tool warn) |

**Fix direction (not applied — docs only):** log a stable non-PII identifier instead of the raw
contact — e.g. `client.id` / `row.id` / a hashed or last-4 phone. Cheap, mechanical, no behavior
change. Group under one commit when Jeff clears log-hygiene work.

---

## Verified NON-findings (so they aren't re-flagged later)

These *look* like secret leaks to a keyword grep but are not, confirmed by reading the branch:

- **OAuth token-exchange / refresh logs — failure branch only, no token in payload:**
  - `src/app/api/google/callback/route.ts:44` — inside `if (!tokenRes.ok)`; logs the error body.
  - `src/lib/google.ts:81` — inside `if (!res.ok)`; logs the error body, then returns null.
  - `src/app/api/admin/google/callback/route.ts:44` — logs the caught `err`, not a token.
  - `src/app/api/social/connect/facebook/callback/route.ts:26` and
    `.../instagram/callback/route.ts:26` — inside `if (!tokenData.access_token)`; by construction
    `tokenData` has no `access_token`.
  - `src/lib/seo/gsc.ts:115` — throws (not a console log) only when `!res.ok || !json.access_token`;
    the stringified `json` has no `access_token`.
- **Route-path strings** like `'POST /api/quotes/public/[token]/accept'` — `[token]` is the literal
  Next.js segment name in the source, not a runtime secret value.
- **`src/lib/secret-crypto.ts:8`** — a `console.log(...)` inside a **doc comment** showing how to
  generate a key locally; not executed.

---

## Adjacent (out of this audit's surface, flagged for the owner)

Not `console.*` log leaks, but same "sensitive value in the wrong place" family — cross-referenced so
they aren't lost:

- **`GET /api/webhooks/telegram` returns `owner_chat_id` + `bot_token_len` in its JSON body,
  unauthenticated** (`webhooks/telegram/route.ts:42-43`). A response-body disclosure, not a log. It
  hands out the exact `chat_id` the owner-bot POST handler trusts as its only auth gate — see the
  auth gap codified in `platform/src/app/api/webhooks/telegram-auth-bypass.witness.test.ts` and
  `deploy-prep/webhook-hardening-plan.md`.
- **Telegram stack-trace-into-chat** (`webhooks/telegram/route.ts:129`,
  `webhooks/telegram/[tenant]/route.ts:131`) — already documented as GAP 3 in
  `deploy-prep/error-info-leak-audit.md`. Not re-litigated here.

---

## Method notes / limits

- Coverage is `console.*` in `src/app/api/**` and `src/lib/**` only. Not audited: client-component
  `console.*` (ships to the browser console, a separate surface), third-party SDK internal logging,
  or `notify()` / audit-log writes (those are intended sinks with their own access controls).
- "No secret values" is asserted from the failure-branch reads above plus keyword grep; a log that
  formats a secret via an unusual variable name with no secret-ish keyword could evade grep. The
  high-value paths (auth, OTP, OAuth, webhooks, SMS/email send) were read directly.
