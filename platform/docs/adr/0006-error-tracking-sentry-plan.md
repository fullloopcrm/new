# ADR 0006 — Real error tracking (Sentry): plan only, no account created

- **Status:** Proposed — **BLOCKED on Jeff's approval to create a Sentry project (cost decision)**
- **Date:** 2026-07-28
- **Decision driver:** platform-hardening queue item 2 — "real error tracking dashboard" to replace/augment the current hand-rolled `error_logs` table.
- **Deciders:** Jeff (owner)
- **Author:** W4 (platform-hardening lane), file-only — no infra created

---

## Correction to the queue's premise (honest, up front)

The task framed this as finding "the current DB table nobody actually browses." That's not accurate as of 2026-07-28 and worth naming before proposing a replacement:

- `error_logs` (via `src/lib/error-tracking.ts`) **is actively browsed** — `/admin/monitoring` (`src/app/admin/monitoring/page.tsx`) renders it live, and `/api/admin/errors` (`src/app/api/admin/errors/route.ts`) serves filtered/paginated queries with a resolve/dismiss workflow.
- It already has dedup (same route+message+tenant within 24h bumps `occurrence_count` instead of spamming new rows), severity-based Telegram/SMS alerting with cooldowns (`alertOwner`/`alertOwnerCritical`), and client-side capture (`src/components/monitoring/ClientErrorMonitor.tsx`).
- Per prior session memory (`fullloop_monitoring_system_2026_07_26`), this build-out shipped **2026-07-26** — frontend error capture across all tenants, email+Telegram alerting, and `error_logs` dedup are all live.

So this isn't "nothing exists" — it's "a real but hand-rolled system exists, and it's missing the things a dedicated error-tracking product gives you for free." That's the actual gap this ADR addresses.

## What's genuinely missing vs. a dedicated tool

| Capability | `error_logs` today | Sentry (or equivalent) |
|---|---|---|
| Stack traces | Raw JS stack string, truncated to 2000 chars, **no source maps** — minified prod line numbers are close to useless | Automatic source-map upload + symbolication → readable original file/line |
| Issue grouping | Manual dedup key = `(route, message, tenant)` exact match — a message with an interpolated id (`Booking abc123 not found`) creates a new "issue" per id instead of grouping | Fingerprinting groups by stack shape, not message string — the actual same bug stays one issue across id variations |
| Alerting | Telegram/SMS only, fixed severity→channel mapping, 10-min cooldown per `(source, message-prefix)` | Configurable alert rules (rate-of-change, new-issue, regression), routes to Slack/PagerDuty/email/webhook |
| Release tracking | None — no way to say "this error started in commit X" | Release health, regression detection tied to deploys |
| Performance/tracing | None | Distributed tracing, slow-endpoint detection |
| Session replay | None | Available (frontend) for reproducing a user's actual click path into an error |
| Retention/search | Whatever the `error_logs` table holds, queried by hand-rolled filters | Full-text search, saved views, longer retention tiers |

The two most load-bearing gaps for this codebase specifically: **no source maps** (prod stack traces are close to unreadable today) and **no real grouping** (the manual dedup key undercounts distinct issues and overcounts near-duplicates whenever a message embeds an id).

## Why this is a cost-gated decision, not a code change

Sentry's free tier (Developer plan) covers a single user and a low monthly event volume; a team plan with useful retention/seats is a recurring paid subscription. Per the platform-hardening brief's hard gate: **cost-incurring infrastructure creation requires Jeff's explicit approval before it's created — not a worker's call.** No `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` exists anywhere in this repo's `.env.example` or codebase (verified by grep across `.env*`/`.json`/source), and no `@sentry/*` package is in `package.json`. **Nothing was created for this ADR.**

## Proposed plan (ready to execute the moment a DSN exists)

1. **Jeff creates the Sentry project** (or approves the cost) — org, project (`fullloopcrm-platform`), and gets a DSN. This is the one step this ADR cannot do.
2. **Install `@sentry/nextjs`** (the official Vercel-recommended SDK — auto-instruments both the Next.js server and client runtimes, uploads source maps at build time via the Sentry Vercel integration or `withSentryConfig`).
3. **Wire the SDK alongside `error-tracking.ts`, not instead of it, for the first phase:**
   - Add `Sentry.captureException(error, { tags: { source, tenantId }, level: severity })` inside `trackError()` (`src/lib/error-tracking.ts:16`), right next to the existing `error_logs` insert. Same for `logAuthFailure()`.
   - `ClientErrorMonitor.tsx`'s browser-side capture gets the standard Sentry browser SDK auto-instrumentation (unhandled errors, unhandled promise rejections) in addition to whatever it currently posts to the API.
   - **Why dual-write instead of a hard cutover:** `error_logs` already backs a live admin UI, the Telegram/SMS alert pipeline, and the resolve/dismiss workflow — none of that should go dark on cutover day. Sentry becomes the deep-dive tool (real stack traces, grouping); `/admin/monitoring` keeps being the fast at-a-glance + alerting surface until/unless it's rebuilt on Sentry's API.
4. **Source maps:** enable `productionBrowserSourceMaps` upload via the Sentry Next.js plugin so prod stack traces resolve to real file/line — this alone fixes the biggest practical gap.
5. **Migration path for existing `error_logs` data:** do **not** attempt to backfill historical rows into Sentry (Sentry's ingestion is real-time event capture, not built for bulk historical import, and old stack traces have no matching source map to symbolicate against anyway). `error_logs` stays queryable as-is for historical/audit lookback; Sentry starts capturing from the day it's wired in. No data migration step needed.
6. **Alerting cutover, staged, not immediate:** keep the existing Telegram/SMS pipeline as the primary pager (it's proven and already tuned with cooldowns) and add Sentry's own alert rules as a second channel. Only reduce/retire the hand-rolled alerting once Sentry's rules have been tuned and trusted over a real on-call window.
7. **Env vars to add** (`.env.example` + prod): `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (build-time source-map upload only, server-side secret).

## Options considered

### Option A — Build fingerprinting/grouping and source-map support in-house on top of `error_logs`
- **Pros:** no new recurring cost, no new vendor.
- **Cons:** source-map symbolication, real fingerprinting, and alert-rule engines are exactly the kind of infrastructure a dedicated vendor already solved well — reinventing it is a multi-week build for a worse result than a config change. Rejected per this org's own research-first principle (buy > build for solved problems).

### Option B — Sentry, dual-write alongside `error_logs` (proposed)
- **Pros:** solves the two real gaps (source maps, grouping) with an install + config, keeps the live admin UI and alerting pipeline intact during transition, standard/well-documented Next.js integration.
- **Cons:** recurring cost (gated on Jeff), a second system to reason about during the dual-write period.

### Option C — Hard cutover, retire `error_logs` immediately
- **Cons:** kills the live admin dashboard and Telegram/SMS alerting on day one of a new, untuned system. Rejected — too much blast radius for an observability swap.

## Decision

**Recommend Option B**, blocked on Jeff approving the Sentry cost and creating the project/DSN. Once a DSN exists, the plan in the section above is ready to execute as a normal (non-cost-gated) code change.

## Consequences

**If approved:** prod stack traces become readable, issue volume becomes accurately grouped instead of undercounted/overcounted by the manual dedup key, and alerting gains a second, more configurable channel — without disrupting the admin dashboard or the existing Telegram/SMS pager during the transition.

**If not approved / deferred:** `error_logs` + `/admin/monitoring` remain the only error-tracking surface. That's a real, working system — not "nothing" — but prod debugging stays harder than it needs to be (minified stack traces) and issue counts stay noisier than real (id-embedded messages fragment what should be one issue).

**Cross-references:** `src/lib/error-tracking.ts` (current implementation), `src/app/admin/monitoring/page.tsx` + `src/app/api/admin/errors/route.ts` (current dashboard), `src/components/monitoring/ClientErrorMonitor.tsx` (current client capture).
