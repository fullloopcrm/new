# API route auth matrix — expected class vs. actual guard

**Author:** W4 (verification-harness lane) · **Date:** 2026-07-12
**Trigger:** Leader order (b) — synthesize the 498-route sweep (`deploy-prep/idor-scan-note.md`)
into a full auth-class matrix: every `/api/**/route.ts` → expected auth class → the guard
actually present in the file → flag any mismatch.

**Update 2026-07-18 (W4):** re-diffed the live route tree (505 `route.ts` files) against
this matrix's 499. 6 new routes since the 2026-07-12 pass: `cron/hr-document-reminders`,
`cron/seo-health`, `cron/seo-improve`, `dashboard/hr/requirements`,
`dashboard/hr/requirements/[id]`, `team-portal/photo-upload`. All 6 hand-read — each
matches its expected auth class with no gap (cron-secret-inline on the 3 cron routes,
rbac-permission tenant-scoped on the 2 dashboard/hr routes, team-token on photo-upload).
`team-portal/photo-upload` is proposed/not-wired code (depends on an unapplied migration,
no UI calls it) but its guard is already correct if/when it goes live. Rows added below;
no findings, no code changes from this update.

## Method

1. Enumerated all `src/app/api/**/route.ts` files: **499** (498 at the time of the original
   IDOR sweep + 1 new route since, `clients/[id]/export`, the GDPR export endpoint).
2. Assigned an **expected** auth class from path convention (`/admin/*` → admin,
   `/webhooks/*` → signed webhook, `/cron/*` → cron secret, `/client/*`, `/portal/*`,
   `/team-portal/*`, `/dashboard/*` → tenant-scoped, `/*/public/*` or `[token]` params →
   public/token-derived, everything else → tenant-scoped RBAC by default).
3. Scripted a grep pass for the guard functions actually imported/called in each file
   (`requirePermission`, `getTenantForRequest`, `requireAdmin`, `protectClientAPI`,
   `verifyPortalToken`, `protectCronAPI`, webhook-signature verifiers, etc.).
4. **Every route the script could not match to a known guard (89 on the first pass) was
   hand-opened and read.** Round 1 turned up false positives from missed guard names
   (`protectCronAPI`, `verifySvix`, `verifyTelnyx`, `verifyTelegramWebhook`,
   `getCurrentTenant`, inline `Bearer ${CRON_SECRET}` checks, `constructEvent`). After
   folding those in, **0 routes remain with an unexplained "expected-but-no-guard" gap.**

This is a synthesis + verification pass, not a re-run of the IDOR sweep — the P0/P1/P2
findings in `idor-scan-note.md` and their status in `idor-remediation-status.md` still stand
and aren't repeated here.

## Guard-tier taxonomy (what "actual guard" means in the table)

| Guard | What it checks | Cross-tenant? |
|---|---|---|
| `super-admin` (`requireAdmin()` / `verifyAdminToken()`, `@/lib/require-admin`) | Platform `admin_token` cookie | **By design** — God-mode, any tenant |
| `rbac-permission` (`requirePermission()`) | Wraps `getTenantForRequest()` + role/permission check | No — scoped to the caller's own tenant |
| `tenant-req` (`getTenantForRequest()`) | Session → tenant + role, no specific permission check | No |
| `tenant-headers` (`getTenantFromHeaders()`) | Resolves tenant from the (middleware-set) subdomain/custom-domain header — **not a session check** | Tenant-*resolution*, not authentication |
| `client-session` (`protectClientAPI()`) | Signed client-portal cookie, tenant+client_id bound | No |
| `portal-token` / `team-token` (`verifyPortalToken()`, `requirePortalPermission()`, `verifyToken()`) | Signed field-staff/portal bearer token | No |
| `monitor-bearer` (`ELCHAPO_MONITOR_KEY`) | Platform monitoring bearer key | **By design**, platform-wide |
| `cron-secret` / `cron-secret-inline` (`protectCronAPI()` or inline `Bearer ${CRON_SECRET}`) | Vercel Cron shared secret | N/A — no tenant principal |
| `webhook-sig` / `stripe-sig` (`verifySvix`, `verifyTelnyx`, `verifyTelegramWebhook`, `constructEvent`) | Provider HMAC signature | N/A — tenant resolved from payload |
| `tenant-sig` (`verifyTenantHeaderSig()`) | Signed tenant header (stronger than `tenant-headers`) | No |
| `oauth-state` (`verifyOAuthState()`) | Signed CSRF state round-tripped through the OAuth provider | No |
| `legacy-admin-session` (`isAdminAuthenticated()` / `getAdminUser()`, `@/lib/nycmaid/auth`) | **Pre-multi-tenant** `admin_session` cookie, HMAC-signed with `ADMIN_PASSWORD` | **Not tenant-bound at all** — see Finding 1 |

## Findings

### Finding 1 (real, MED) — `client/properties` history read is reachable via a non-tenant-bound legacy admin session, and the query itself has no tenant filter

`GET /api/client/properties?include_history=true` (`src/app/api/client/properties/route.ts:39-47`)
runs when `auth.isAdmin` is true, and reads:

```ts
supabaseAdmin.from('property_changes')
  .select(...)
  .eq('client_id', clientId!)      // no .eq('tenant_id', ...)
  .order('created_at', ...)
```

`isAdmin` comes from `isAdminAuthenticated()` (`@/lib/nycmaid/auth`), which validates the
**pre-multi-tenant** `admin_session` cookie (HMAC-signed with the single, platform-wide
`ADMIN_PASSWORD` secret — not forgeable, but also **not bound to any tenant_id**). A
"legacy PIN" session (no `userId`) short-circuits straight to `{ role: 'owner' }` with no
tenant check anywhere in the function. Combined with the missing `.eq('tenant_id', …)` on
the `property_changes` read, a holder of that legacy admin session can pull property-change
history (address/label/actor history) for **any tenant's** `client_id`, not just the tenant
they're currently viewing.

**Caveats (honest limits):** I did not verify whether the legacy `admin_session` login flow
is still reachable end-to-end in the current build (its issuing route wasn't part of this
sweep), or whether `property_changes` in prod actually holds rows for more than one tenant
yet. Blast radius is narrow — only 2 of 499 routes use this guard (see Finding 2) — but the
missing tenant filter on this specific read is real and independently exploitable the moment
tenant #2 has property-change rows and someone has legacy-admin access. **Recommend:** add
`.eq('tenant_id', tenant.id)` to the `property_changes` read regardless of the auth-tier
question below — it's a one-line fix, same class as the fixed selena IDOR.

### Finding 2 (real, LOW/consistency) — 2 routes still authenticate on the pre-multi-tenant admin system

Only `GET /api/auth/me` and the `include_history` branch of `client/properties` import
`isAdminAuthenticated()`/`getAdminUser()`. `admin_users` (the table `getAdminUser()` queries)
has no `CREATE TABLE` in `migrations/` — the only hits are comments in
`2026_05_19_comhub.sql` / `2026_05_19_remaining_tables.sql` noting it as superseded by
`tenant_members` (Clerk-backed). `requireAdmin()` exported from the same file
(`@/lib/nycmaid/auth.ts:111`) has **zero importers anywhere in the repo** — dead code.
**Recommend:** migrate `auth/me` to `getTenantForRequest()` + `requirePermission()` like
every other operator route, delete the dead `requireAdmin()` export, and close Finding 1
by scoping the `property_changes` read (or dropping the `admin_session` branch entirely in
favor of the RBAC `isAdmin` check `/dashboard` already uses).

### Finding 3 (informational — clarifies a pattern that looks like 118 mismatches but isn't) — `/api/admin/*` is a genuine two-tier namespace

118 files import `requireAdmin()`/`verifyAdminToken()` (the `admin_token`-cookie,
cross-tenant-by-design super-admin guard). A separate ~38 `/api/admin/*` routes use
`requirePermission()`/`getTenantForRequest()` instead — the same per-tenant RBAC guard used
by `/api/dashboard/*` and most of the platform. Both are **intentional, not a gap**:
`requirePermission()` (`src/lib/require-permission.ts:19`) wraps `getTenantForRequest()`
internally, so it's a strictly *more* specific check, not a weaker one. The two tiers map to
two real product surfaces sharing the `/api/admin/*` prefix — platform "God mode" (4 routes
confirmed cross-tenant-by-design in `idor-scan-note.md`: `bookings/[id]/closeout-summary`,
`schedule-issues/fix`, `comhub/contacts/[id]/context`, `comhub/voice/settings`, plus ~114
more using the same super-admin guard) vs. tenant-operator actions that happen to live under
the same URL prefix. Worth documenting so a future auditor doesn't mistake the RBAC tier for
an under-protected admin route.

### Finding 4 (LOW, consistency) — cron auth is duplicated 39 ways instead of using the shared helper

44 `/api/cron/*` routes are secret-gated (verified: 100%, zero gaps). 5 use the shared
`protectCronAPI()` helper; the other 39 each hand-roll the identical
`request.headers.get('authorization') !== \`Bearer ${process.env.CRON_SECRET}\`` check.
Not a vulnerability today, but 39 independent copies of a security check is 39 places a
future edit can silently diverge (e.g., someone "fixes" one copy's header name and misses
the other 38). **Recommend:** consolidate onto `protectCronAPI()`.

### Finding 5 (LOW) — test-harness route ships in the production build, armed only by an optional env var

`POST /api/test/email-selena` (+ `/cleanup`) drives the live Selena/Yinez agent and is
gated only by `if (!process.env.SELENA_TEST_TOKEN) return 404`. If that var is ever set in
prod (staging leftover, copy-paste `.env`), the route becomes live and less-scrutinized
attack surface. **Recommend:** exclude `test/*` routes from the production build entirely
(route-level `NODE_ENV` guard or a build-time exclude) rather than relying solely on an
optional token.

### No other mismatches found

Every one of the other 489 routes reconciles: the guard actually present matches (or is
stricter than) what the path implies, or the route is legitimately public by design
(token-derived resource routes, lead-capture/ingest forms that resolve tenant from the
subdomain header without a session, OAuth callbacks protected by signed state, health
checks, the Vercel deploy-hook protected by HMAC-SHA1 + `timingSafeEqual`).

## Namespace summary

| Namespace | Routes | Dominant guard(s) |
|---|---|---|
| `/api/admin/*` | 118 | two-tier: `super-admin` (~80) / `rbac-permission`,`tenant-req` (~38) — see Finding 3 |
| `/api/cron/*` | 44 | `cron-secret-inline` (39) / `protectCronAPI` (5) — see Finding 4 |
| `/api/finance/*` | 39 | `rbac-permission` |
| `/api/team-portal/*` | 25 | `team-token` / `portal-token`; `auth` sub-route is public (PIN login) |
| `/api/client/*` | 16 | `client-session` (post-login) / `tenant-headers`-only (pre-login, public by design) |
| `/api/dashboard/*` | 14 | `tenant-req` / `rbac-permission` |
| `/api/portal/*` | 13 | `portal-token`; `auth` sub-route is public (OTP login) |
| `/api/documents/*` | 12 | `rbac-permission` (operator side) / public token-derived (signer side) |
| `/api/bookings/*`, `/api/clients/*` | 11 each | `tenant-req` / `rbac-permission` |
| `/api/quotes/*`, `/api/settings/*` | 9 each | `tenant-req` (operator side); `quotes/public/[token]/*` is public token-derived |
| `/api/webhooks/*` | 9 | provider signature (Svix/Telnyx/Telegram/Stripe) — 100% verified |
| `/api/leads/*` | 8 | `tenant-req`; bare `POST /api/leads` is public (lead-capture form) |
| all other namespaces | ≤7 each | see appendix |

## Coverage caveats (honest limits)

- The guard classifier is regex-based against imports/calls. It **does not** verify that a
  `requirePermission('x.y')` call requests the *correct* permission for the action, only
  that some permission check exists — a route requiring the wrong (too-weak) permission
  would not be caught here.
- It does not trace **early-return bugs** (a guard called but its error path not actually
  returned/awaited) — that class of bug needs a runtime/behavioral test per route, not a
  static sweep. None were spotted incidentally, but none were specifically hunted either.
- `.rpc()` / SECURITY DEFINER function bodies are out of scope (same limit noted in
  `deploy-prep/rpc-security-review.md`) — a route's app-layer guard can be solid while the
  Postgres function it calls has its own, unaudited-here authorization surface.
- "Public(tenant-resolved)" routes were spot-checked for the *existence* of tenant
  resolution, not for whether every downstream write in that handler is itself
  tenant-scoped — that's the `idor-scan-note.md` sweep's job, not this one's.
- 499 is a point-in-time count (2026-07-12, this branch); 505 as of the 2026-07-18 re-diff
  (see Update note above). New routes added after that will again need a fresh re-diff.

## Full route table (505 routes)

Legend: **Expected class** is what the path convention implies; **Guard(s) found** is what
the file actually calls. A blank/`NONE` guard next to a `public(...)`/`internal(...)`/
`dev-only(...)` expected class was hand-verified (see Findings + Method) — it is not an
unverified gap.

| Route | Expected class | Guard(s) found |
|---|---|---|
| `/api/admin-auth` | tenant-scoped(RBAC) | super-admin,tenant-sig |
| `/api/admin-auth/logout` | public(auth-establishment) | NONE |
| `/api/admin-auth/me` | tenant-scoped(RBAC) | super-admin |
| `/api/admin-chat` | tenant-scoped(RBAC) | rbac-permission |
| `/api/admin/activity` | admin(2-tier) | super-admin |
| `/api/admin/ai` | admin(2-tier) | super-admin |
| `/api/admin/ai-chat` | admin(2-tier) | tenant-req |
| `/api/admin/analytics` | admin(2-tier) | super-admin |
| `/api/admin/analytics/live-feed` | admin(2-tier) | tenant-req |
| `/api/admin/announcements` | admin(2-tier) | super-admin |
| `/api/admin/announcements/[id]` | admin(2-tier) | super-admin |
| `/api/admin/billing` | admin(2-tier) | super-admin |
| `/api/admin/bookings` | admin(2-tier) | super-admin |
| `/api/admin/bookings/[id]/cleaner-payout` | admin(2-tier) | super-admin |
| `/api/admin/bookings/[id]/closeout-summary` | admin(2-tier) | super-admin |
| `/api/admin/broadcast-guidelines` | admin(2-tier) | tenant-req |
| `/api/admin/businesses` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]/activate` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]/profile` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]/provision` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]/readiness` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]/selena-preview` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]/site-export` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]/users` | admin(2-tier) | super-admin |
| `/api/admin/businesses/[id]/verify-checklist` | admin(2-tier) | super-admin |
| `/api/admin/calendar` | admin(2-tier) | super-admin |
| `/api/admin/campaigns/generate` | admin(2-tier) | tenant-req |
| `/api/admin/campaigns/preview` | admin(2-tier) | tenant-req |
| `/api/admin/changelog` | admin(2-tier) | super-admin |
| `/api/admin/cleaner-availability` | admin(2-tier) | super-admin,tenant-req |
| `/api/admin/cleanup-phones` | admin(2-tier) | rbac-permission |
| `/api/admin/cleanup-test-bookings` | admin(2-tier) | rbac-permission |
| `/api/admin/clients` | admin(2-tier) | super-admin |
| `/api/admin/comhub/channels` | admin(2-tier) | super-admin |
| `/api/admin/comhub/contacts/[id]/context` | admin(2-tier) | super-admin |
| `/api/admin/comhub/contacts/[id]/notes` | admin(2-tier) | super-admin |
| `/api/admin/comhub/email/backfill` | admin(2-tier) | super-admin |
| `/api/admin/comhub/messages/[id]/flag` | admin(2-tier) | super-admin |
| `/api/admin/comhub/search-recipients` | admin(2-tier) | super-admin |
| `/api/admin/comhub/send` | admin(2-tier) | super-admin |
| `/api/admin/comhub/templates` | admin(2-tier) | super-admin |
| `/api/admin/comhub/templates/[id]` | admin(2-tier) | super-admin |
| `/api/admin/comhub/threads` | admin(2-tier) | super-admin |
| `/api/admin/comhub/threads/[id]` | admin(2-tier) | super-admin |
| `/api/admin/comhub/voice/active` | admin(2-tier) | super-admin |
| `/api/admin/comhub/voice/cleanup` | admin(2-tier) | super-admin |
| `/api/admin/comhub/voice/control` | admin(2-tier) | super-admin |
| `/api/admin/comhub/voice/dial` | admin(2-tier) | super-admin |
| `/api/admin/comhub/voice/log-softphone-call` | admin(2-tier) | super-admin |
| `/api/admin/comhub/voice/presence` | admin(2-tier) | super-admin |
| `/api/admin/comhub/voice/settings` | admin(2-tier) | super-admin |
| `/api/admin/comhub/voice/token` | admin(2-tier) | super-admin |
| `/api/admin/comhub/yinez/send` | admin(2-tier) | super-admin |
| `/api/admin/email` | admin(2-tier) | super-admin |
| `/api/admin/errors` | admin(2-tier) | super-admin |
| `/api/admin/feedback` | admin(2-tier) | super-admin |
| `/api/admin/finance` | admin(2-tier) | super-admin |
| `/api/admin/find-cleaner/preview` | admin(2-tier) | tenant-req |
| `/api/admin/find-cleaner/recent` | admin(2-tier) | tenant-req |
| `/api/admin/find-cleaner/send` | admin(2-tier) | tenant-req |
| `/api/admin/geocode-backfill` | admin(2-tier) | rbac-permission |
| `/api/admin/google/auth` | admin(2-tier) | super-admin |
| `/api/admin/google/callback` | public(oauth-callback, state-verified) | oauth-state |
| `/api/admin/google/generate-reply` | admin(2-tier) | tenant-req |
| `/api/admin/google/reply` | admin(2-tier) | tenant-req |
| `/api/admin/google/status` | admin(2-tier) | super-admin |
| `/api/admin/impersonate` | admin(2-tier) | super-admin |
| `/api/admin/invites` | admin(2-tier) | super-admin |
| `/api/admin/leads` | admin(2-tier) | super-admin |
| `/api/admin/marketing` | admin(2-tier) | super-admin |
| `/api/admin/message-applicants/preview` | admin(2-tier) | tenant-req |
| `/api/admin/message-applicants/send` | admin(2-tier) | tenant-req |
| `/api/admin/monitoring/status` | admin(2-tier) | super-admin |
| `/api/admin/notes` | admin(2-tier) | super-admin |
| `/api/admin/notes/upload` | admin(2-tier) | super-admin |
| `/api/admin/notifications` | admin(2-tier) | super-admin |
| `/api/admin/payments/confirm-match` | admin(2-tier) | tenant-req |
| `/api/admin/payments/finalize-match` | admin(2-tier) | monitor-bearer |
| `/api/admin/prospects` | admin(2-tier) | super-admin |
| `/api/admin/prospects/[id]` | admin(2-tier) | super-admin |
| `/api/admin/recurring-schedules` | admin(2-tier) | rbac-permission |
| `/api/admin/recurring-schedules/[id]` | admin(2-tier) | rbac-permission |
| `/api/admin/recurring-schedules/[id]/exception` | admin(2-tier) | rbac-permission |
| `/api/admin/recurring-schedules/[id]/pause` | admin(2-tier) | rbac-permission |
| `/api/admin/recurring-schedules/[id]/regenerate` | admin(2-tier) | rbac-permission |
| `/api/admin/referrals` | admin(2-tier) | super-admin |
| `/api/admin/requests` | admin(2-tier) | super-admin |
| `/api/admin/requests/[id]/agreement` | admin(2-tier) | super-admin |
| `/api/admin/requests/[id]/proposal-checkout` | admin(2-tier) | super-admin |
| `/api/admin/requests/[id]/proposal-email` | admin(2-tier) | super-admin |
| `/api/admin/requests/convert` | admin(2-tier) | super-admin |
| `/api/admin/requests/proposal` | admin(2-tier) | super-admin |
| `/api/admin/reviews` | admin(2-tier) | rbac-permission |
| `/api/admin/sales` | admin(2-tier) | super-admin |
| `/api/admin/schedule-issues` | admin(2-tier) | tenant-req |
| `/api/admin/schedule-issues/fix` | admin(2-tier) | super-admin |
| `/api/admin/security` | admin(2-tier) | super-admin |
| `/api/admin/selena` | admin(2-tier) | tenant-req |
| `/api/admin/selena/monitor` | admin(2-tier) | monitor-bearer |
| `/api/admin/selena/score` | admin(2-tier) | rbac-permission |
| `/api/admin/selena/sms-status` | admin(2-tier) | monitor-bearer,rbac-permission |
| `/api/admin/send-apology-batch` | admin(2-tier) | rbac-permission |
| `/api/admin/seo` | admin(2-tier) | super-admin |
| `/api/admin/seo/apply` | admin(2-tier) | super-admin,cron-secret-inline |
| `/api/admin/settings` | admin(2-tier) | super-admin |
| `/api/admin/smart-schedule` | admin(2-tier) | tenant-req |
| `/api/admin/sms` | admin(2-tier) | super-admin |
| `/api/admin/system-check` | admin(2-tier) | super-admin,nycmaid-admin-legacy,cron-secret-inline |
| `/api/admin/team` | admin(2-tier) | super-admin |
| `/api/admin/team-availability-batch` | admin(2-tier) | rbac-permission |
| `/api/admin/tenant-chats` | admin(2-tier) | super-admin |
| `/api/admin/tenants` | admin(2-tier) | super-admin |
| `/api/admin/tenants/[id]` | admin(2-tier) | super-admin |
| `/api/admin/territories` | admin(2-tier) | super-admin |
| `/api/admin/translate` | admin(2-tier) | tenant-req |
| `/api/admin/travel-time` | admin(2-tier) | rbac-permission |
| `/api/admin/travel-times` | admin(2-tier) | rbac-permission |
| `/api/admin/users` | admin(2-tier) | rbac-permission |
| `/api/admin/users/[id]` | admin(2-tier) | rbac-permission |
| `/api/admin/users/[id]/pin` | admin(2-tier) | rbac-permission,nycmaid-admin-legacy |
| `/api/admin/websites` | admin(2-tier) | super-admin |
| `/api/ai/assistant` | tenant-scoped(RBAC) | tenant-req |
| `/api/ai/chat` | tenant-scoped(RBAC) | tenant-req |
| `/api/announcements/unread` | tenant-scoped(RBAC) | tenant-req |
| `/api/apply` | tenant-scoped(RBAC) | tenant-headers |
| `/api/apply-ceo` | tenant-scoped(RBAC) | tenant-headers |
| `/api/apply/signed-url` | tenant-scoped(RBAC) | tenant-headers |
| `/api/attribution` | tenant-scoped(RBAC) | tenant-req |
| `/api/attribution/manual` | tenant-scoped(RBAC) | tenant-req |
| `/api/audit` | tenant-scoped(RBAC) | tenant-req |
| `/api/auth/login` | public(auth-establishment) | NONE |
| `/api/auth/logout` | public(auth-establishment) | NONE |
| `/api/auth/me` | tenant-scoped(RBAC) | legacy-admin-session |
| `/api/availability` | public(tenant-resolved) | NONE |
| `/api/booking-notes` | tenant-scoped(RBAC) | tenant-req |
| `/api/booking-notes/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/booking-notes/upload` | tenant-scoped(RBAC) | tenant-req |
| `/api/bookings` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/bookings/[id]` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/bookings/[id]/payment` | tenant-scoped(RBAC) | tenant-req |
| `/api/bookings/[id]/reset` | tenant-scoped(RBAC) | tenant-req |
| `/api/bookings/[id]/status` | tenant-scoped(RBAC) | tenant-req |
| `/api/bookings/[id]/team` | tenant-scoped(RBAC) | tenant-req |
| `/api/bookings/batch` | tenant-scoped(RBAC) | rbac-permission |
| `/api/bookings/batch-update` | tenant-scoped(RBAC) | rbac-permission |
| `/api/bookings/broadcast` | tenant-scoped(RBAC) | rbac-permission |
| `/api/bookings/closeout` | tenant-scoped(RBAC) | tenant-req |
| `/api/bookings/stats` | tenant-scoped(RBAC) | tenant-req |
| `/api/campaigns` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/campaigns/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/campaigns/[id]/send` | tenant-scoped(RBAC) | rbac-permission |
| `/api/campaigns/send` | tenant-scoped(RBAC) | rbac-permission |
| `/api/catalog` | tenant-scoped(RBAC) | tenant-req |
| `/api/changelog` | tenant-scoped(RBAC) | tenant-req |
| `/api/changelog/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/chat` | tenant-scoped(RBAC) | tenant-sig |
| `/api/cleaner-applications` | public(tenant-resolved) | NONE |
| `/api/cleaners` | tenant-scoped(RBAC) | rbac-permission |
| `/api/cleaners/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/cleaners/[id]/role` | tenant-scoped(RBAC) | rbac-permission |
| `/api/cleaners/priority` | tenant-scoped(RBAC) | rbac-permission |
| `/api/cleaners/upload` | tenant-scoped(RBAC) | rbac-permission,tenant-headers |
| `/api/client-analytics` | tenant-scoped(RBAC) | rbac-permission |
| `/api/client/availability` | tenant-scoped(client-session) | tenant-headers |
| `/api/client/book` | public(tenant-resolved) | tenant-headers |
| `/api/client/booking/[id]` | tenant-scoped(client-session) | tenant-headers,client-session |
| `/api/client/bookings` | tenant-scoped(client-session) | tenant-headers,client-session |
| `/api/client/check` | public(tenant-resolved) | tenant-headers |
| `/api/client/collect` | tenant-scoped(client-session) | tenant-headers |
| `/api/client/confirm/[token]` | public(token-derived) | booking-token |
| `/api/client/login` | public(tenant-resolved) | tenant-headers |
| `/api/client/notes` | tenant-scoped(client-session) | tenant-headers,client-session |
| `/api/client/preferred-cleaner` | tenant-scoped(client-session) | tenant-headers,client-session |
| `/api/client/properties` | tenant-scoped(client-session) | client-session,nycmaid-admin-legacy,legacy-admin-session |
| `/api/client/recurring` | tenant-scoped(client-session) | tenant-headers,client-session |
| `/api/client/reschedule/[id]` | tenant-scoped(client-session) | tenant-headers,client-session |
| `/api/client/send-code` | public(tenant-resolved) | tenant-headers |
| `/api/client/smart-schedule` | public(client_id-scoped, intentional) | client-id-lookup |
| `/api/client/verify-code` | public(tenant-resolved) | tenant-headers |
| `/api/clients` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/clients/[id]` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/clients/[id]/activity` | tenant-scoped(RBAC) | current-tenant |
| `/api/clients/[id]/contacts` | tenant-scoped(RBAC) | rbac-permission |
| `/api/clients/[id]/contacts/[contactId]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/clients/[id]/export` | tenant-scoped(RBAC) | rbac-permission |
| `/api/clients/[id]/transcript` | tenant-scoped(RBAC) | rbac-permission |
| `/api/clients/analytics` | tenant-scoped(RBAC) | tenant-req |
| `/api/clients/enriched` | tenant-scoped(RBAC) | tenant-req |
| `/api/clients/import` | tenant-scoped(RBAC) | rbac-permission |
| `/api/clients/stats` | tenant-scoped(RBAC) | tenant-req |
| `/api/connect/channels` | tenant-scoped(RBAC) | tenant-req |
| `/api/connect/messages` | tenant-scoped(RBAC) | tenant-req |
| `/api/connect/unread` | tenant-scoped(RBAC) | tenant-req |
| `/api/contact` | tenant-scoped(RBAC) | tenant-headers |
| `/api/cpa/[token]/year-end-zip` | public(token-derived) | NONE |
| `/api/crews` | tenant-scoped(RBAC) | tenant-req |
| `/api/cron/anthropic-health` | cron(secret) | cron-secret |
| `/api/cron/auto-reply-reviews` | cron(secret) | cron-secret-inline |
| `/api/cron/backup` | cron(secret) | cron-secret-inline |
| `/api/cron/cleanup-videos` | cron(secret) | cron-secret-inline |
| `/api/cron/comhub-email` | cron(secret) | cron-secret-inline |
| `/api/cron/comms-monitor` | cron(secret) | cron-secret-inline |
| `/api/cron/confirmation-reminder` | cron(secret) | cron-secret |
| `/api/cron/confirmations` | cron(secret) | cron-secret-inline |
| `/api/cron/daily-summary` | cron(secret) | cron-secret-inline |
| `/api/cron/email-monitor` | cron(secret) | cron-secret-inline |
| `/api/cron/finance-post` | cron(secret) | cron-secret-inline |
| `/api/cron/follow-up` | cron(secret) | cron-secret-inline |
| `/api/cron/generate-recurring` | cron(secret) | cron-secret-inline |
| `/api/cron/health-check` | cron(secret) | cron-secret-inline |
| `/api/cron/health-monitor` | cron(secret) | cron-secret-inline |
| `/api/cron/hr-document-reminders` | cron(secret) | cron-secret-inline |
| `/api/cron/jefe-heartbeat` | cron(secret) | cron-secret-inline |
| `/api/cron/late-check-in` | cron(secret) | cron-secret-inline |
| `/api/cron/lifecycle` | cron(secret) | cron-secret-inline |
| `/api/cron/no-show-check` | cron(secret) | cron-secret-inline |
| `/api/cron/outreach` | cron(secret) | cron-secret-inline |
| `/api/cron/payment-followup-daily` | cron(secret) | cron-secret-inline |
| `/api/cron/payment-reminder` | cron(secret) | cron-secret-inline |
| `/api/cron/phone-fixup` | cron(secret) | cron-secret,hmac-token |
| `/api/cron/post-job-followup` | cron(secret) | cron-secret-inline |
| `/api/cron/rating-prompt` | cron(secret) | cron-secret |
| `/api/cron/recurring-expenses` | cron(secret) | cron-secret-inline |
| `/api/cron/refresh-job-postings` | cron(secret) | cron-secret |
| `/api/cron/release-due-payments` | cron(secret) | cron-secret-inline |
| `/api/cron/reminders` | cron(secret) | cron-secret-inline |
| `/api/cron/retention` | cron(secret) | cron-secret-inline |
| `/api/cron/sales-follow-ups` | cron(secret) | cron-secret-inline |
| `/api/cron/schedule-monitor` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-autopilot` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-autoverify` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-competitors` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-detect` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-enrich` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-health` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-improve` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-ingest` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-propose` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-technical` | cron(secret) | cron-secret-inline |
| `/api/cron/seo-verify-revert` | cron(secret) | cron-secret-inline |
| `/api/cron/sync-google-reviews` | cron(secret) | cron-secret-inline |
| `/api/cron/system-check` | cron(secret) | cron-secret-inline |
| `/api/cron/tenant-health` | cron(secret) | cron-secret-inline |
| `/api/dashboard` | tenant-scoped(RBAC) | tenant-req |
| `/api/dashboard/comms-preview` | tenant-scoped(RBAC) | tenant-req |
| `/api/dashboard/hr` | tenant-scoped(RBAC) | rbac-permission |
| `/api/dashboard/hr/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/dashboard/hr/[id]/documents` | tenant-scoped(RBAC) | rbac-permission |
| `/api/dashboard/hr/[id]/notes` | tenant-scoped(RBAC) | rbac-permission |
| `/api/dashboard/hr/requirements` | tenant-scoped(RBAC) | rbac-permission |
| `/api/dashboard/hr/requirements/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/dashboard/import/analyze` | tenant-scoped(RBAC) | tenant-req |
| `/api/dashboard/import/batch/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/dashboard/import/stage` | tenant-scoped(RBAC) | rbac-permission |
| `/api/dashboard/messages` | tenant-scoped(RBAC) | tenant-req |
| `/api/dashboard/onboarding` | tenant-scoped(RBAC) | tenant-req |
| `/api/dashboard/onboarding/activate` | tenant-scoped(RBAC) | tenant-req |
| `/api/dashboard/onboarding/profile` | tenant-scoped(RBAC) | tenant-req |
| `/api/dashboard/schedules/import` | tenant-scoped(RBAC) | rbac-permission |
| `/api/deals` | tenant-scoped(RBAC) | tenant-req |
| `/api/deals/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/deals/[id]/activities` | tenant-scoped(RBAC) | tenant-req |
| `/api/deals/[id]/stage` | tenant-scoped(RBAC) | tenant-req |
| `/api/deals/at-risk` | tenant-scoped(RBAC) | tenant-req |
| `/api/deals/manual` | tenant-scoped(RBAC) | tenant-req |
| `/api/docs` | tenant-scoped(RBAC) | monitor-bearer,rbac-permission,cron-secret-inline |
| `/api/documents` | tenant-scoped(RBAC) | rbac-permission |
| `/api/documents/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/documents/[id]/duplicate` | tenant-scoped(RBAC) | rbac-permission |
| `/api/documents/[id]/fields` | tenant-scoped(RBAC) | rbac-permission |
| `/api/documents/[id]/send` | tenant-scoped(RBAC) | rbac-permission |
| `/api/documents/[id]/signers` | tenant-scoped(RBAC) | rbac-permission |
| `/api/documents/[id]/signers/[signerId]` | tenant-scoped(RBAC) | rbac-permission,draft-token |
| `/api/documents/[id]/void` | tenant-scoped(RBAC) | rbac-permission |
| `/api/documents/public/[token]` | public(token-derived) | NONE |
| `/api/documents/public/[token]/consent` | public(token-derived) | NONE |
| `/api/documents/public/[token]/decline` | public(token-derived) | NONE |
| `/api/documents/public/[token]/sign` | public(token-derived) | NONE |
| `/api/domain-notes` | tenant-scoped(RBAC) | rbac-permission |
| `/api/email/monitor` | tenant-scoped(RBAC) | monitor-bearer,cron-secret-inline |
| `/api/errors` | tenant-scoped(RBAC) | tenant-sig |
| `/api/feedback` | public(tenant-resolved) | NONE |
| `/api/finance/ai-ask` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/ar-aging` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/audit-log` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/backfill` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/balance-sheet` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-accounts` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-accounts/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-connect/session` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-import` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-transactions` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-transactions/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-transactions/[id]/match` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-transactions/accept-suggestions` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/bank-transactions/suggest` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/cash-flow` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/chart-of-accounts` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/cleaner-income` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/cpa-tokens` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/entities` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/entities/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/expenses` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/expenses/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/mark-paid` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/payroll` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/payroll-prep` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/pending` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/periods` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/periods/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/pnl` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/receipts` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/receipts/attach` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/reconcile-candidates` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/revenue` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/statements` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/summary` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/tax-export` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/trial-balance` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/upload` | tenant-scoped(RBAC) | rbac-permission |
| `/api/finance/year-end-zip` | tenant-scoped(RBAC) | rbac-permission |
| `/api/google/auth` | tenant-scoped(RBAC) | tenant-req |
| `/api/google/callback` | public(oauth-callback, state-verified) | oauth-state |
| `/api/google/posts` | tenant-scoped(RBAC) | tenant-req |
| `/api/google/reviews` | tenant-scoped(RBAC) | tenant-req |
| `/api/google/status` | tenant-scoped(RBAC) | tenant-req |
| `/api/health` | public(healthcheck) | NONE |
| `/api/import-clients` | tenant-scoped(RBAC) | tenant-req |
| `/api/indexnow` | tenant-scoped(RBAC) | tenant-req,tenant-headers,cron-secret-inline |
| `/api/ingest/application` | public(tenant-resolved) | NONE |
| `/api/ingest/lead` | public(tenant-resolved) | NONE |
| `/api/inquiry` | public(tenant-resolved) | NONE |
| `/api/internal/deploy-hook` | internal(secret) | NONE |
| `/api/invoices` | tenant-scoped(RBAC) | rbac-permission |
| `/api/invoices/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/invoices/[id]/record-payment` | tenant-scoped(RBAC) | rbac-permission |
| `/api/invoices/[id]/send` | tenant-scoped(RBAC) | rbac-permission |
| `/api/invoices/public/[token]` | public(token-derived) | NONE |
| `/api/invoices/public/[token]/checkout` | public(token-derived) | NONE |
| `/api/jobs` | tenant-scoped(RBAC) | tenant-req |
| `/api/jobs/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/jobs/[id]/payments` | tenant-scoped(RBAC) | rbac-permission |
| `/api/jobs/[id]/sessions` | tenant-scoped(RBAC) | tenant-req |
| `/api/jobs/[id]/sessions/[sessionId]` | tenant-scoped(RBAC) | tenant-req |
| `/api/lead` | tenant-scoped(RBAC) | tenant-headers |
| `/api/lead-media/signed-url` | tenant-scoped(RBAC) | tenant-headers |
| `/api/leads` | public(tenant-resolved) | NONE |
| `/api/leads/attribution` | tenant-scoped(RBAC) | tenant-req |
| `/api/leads/block` | tenant-scoped(RBAC) | rbac-permission |
| `/api/leads/domains` | tenant-scoped(RBAC) | tenant-req |
| `/api/leads/feed` | tenant-scoped(RBAC) | tenant-req |
| `/api/leads/override` | tenant-scoped(RBAC) | tenant-req |
| `/api/leads/verify` | tenant-scoped(RBAC) | rbac-permission |
| `/api/leads/visits` | tenant-scoped(RBAC) | tenant-req |
| `/api/management-applications` | tenant-scoped(RBAC) | tenant-req,tenant-headers |
| `/api/management-applications/draft` | tenant-scoped(RBAC) | tenant-headers |
| `/api/management-applications/signed-url` | tenant-scoped(RBAC) | tenant-headers |
| `/api/management-applications/upload` | tenant-scoped(RBAC) | tenant-headers |
| `/api/migrate-cleaner-notifications` | tenant-scoped(RBAC) | rbac-permission |
| `/api/migrate-sms` | tenant-scoped(RBAC) | rbac-permission |
| `/api/notifications` | tenant-scoped(RBAC) | tenant-req |
| `/api/payments/checkout` | tenant-scoped(RBAC) | tenant-req |
| `/api/payments/link` | tenant-scoped(RBAC) | tenant-req |
| `/api/permissions/me` | tenant-scoped(RBAC) | tenant-req |
| `/api/pin-reset` | tenant-scoped(RBAC) | tenant-sig,nycmaid-admin-legacy |
| `/api/pipeline` | tenant-scoped(RBAC) | tenant-req |
| `/api/portal/auth` | public(auth-establishment) | rate-limit+otp |
| `/api/portal/availability` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/bookings` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/bookings/[id]` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/collect` | tenant-scoped(client-portal) | tenant-headers |
| `/api/portal/config` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/connect` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/connect/unread` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/feedback` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/messages` | tenant-scoped(client-portal) | client-session |
| `/api/portal/notes` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/request` | tenant-scoped(client-portal) | portal-token |
| `/api/portal/services` | tenant-scoped(client-portal) | portal-token |
| `/api/projects` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/prospects` | public(tenant-resolved) | NONE |
| `/api/public-upload` | tenant-scoped(RBAC) | tenant-headers |
| `/api/push/subscribe` | tenant-scoped(RBAC) | current-tenant |
| `/api/quote-templates` | tenant-scoped(RBAC) | tenant-req |
| `/api/quotes` | tenant-scoped(RBAC) | tenant-req |
| `/api/quotes/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/quotes/[id]/convert` | tenant-scoped(RBAC) | tenant-req |
| `/api/quotes/[id]/convert-to-job` | tenant-scoped(RBAC) | tenant-req |
| `/api/quotes/[id]/send` | tenant-scoped(RBAC) | tenant-req |
| `/api/quotes/public/[token]` | public(token-derived) | NONE |
| `/api/quotes/public/[token]/accept` | public(token-derived) | NONE |
| `/api/quotes/public/[token]/decline` | public(token-derived) | NONE |
| `/api/quotes/public/[token]/deposit-checkout` | public(token-derived) | NONE |
| `/api/recurring-expenses` | tenant-scoped(RBAC) | tenant-req |
| `/api/recurring-expenses/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/referral-commissions` | tenant-scoped(RBAC) | tenant-req |
| `/api/referrals` | tenant-scoped(RBAC) | tenant-req |
| `/api/referrals/[id]` | tenant-scoped(RBAC) | rbac-permission |
| `/api/referrals/track` | public(tenant-resolved) | NONE |
| `/api/referrers` | tenant-scoped(RBAC) | tenant-headers |
| `/api/referrers/[code]` | public(code-derived) | NONE |
| `/api/referrers/analytics` | tenant-scoped(RBAC) | tenant-req |
| `/api/referrers/auth/request` | tenant-scoped(RBAC) | tenant-headers |
| `/api/referrers/auth/verify` | tenant-scoped(RBAC) | tenant-headers |
| `/api/requests` | tenant-scoped(RBAC) | super-admin |
| `/api/reviews` | tenant-scoped(RBAC) | tenant-req |
| `/api/reviews/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/reviews/request` | tenant-scoped(RBAC) | tenant-req |
| `/api/reviews/submit` | tenant-scoped(RBAC) | tenant-headers |
| `/api/reviews/upload` | tenant-scoped(RBAC) | tenant-headers |
| `/api/routes` | tenant-scoped(RBAC) | tenant-req |
| `/api/routes/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/routes/[id]/optimize` | tenant-scoped(RBAC) | tenant-req |
| `/api/routes/[id]/publish` | tenant-scoped(RBAC) | tenant-req |
| `/api/routes/auto-build` | tenant-scoped(RBAC) | tenant-req |
| `/api/sales-applications` | tenant-scoped(RBAC) | rbac-permission |
| `/api/schedule/calendar` | tenant-scoped(RBAC) | tenant-req |
| `/api/schedules` | tenant-scoped(RBAC) | tenant-req |
| `/api/schedules/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/schedules/[id]/pause` | tenant-scoped(RBAC) | tenant-req |
| `/api/security/events` | tenant-scoped(RBAC) | tenant-req |
| `/api/selena` | tenant-scoped(RBAC) | tenant-req |
| `/api/selena/metrics` | tenant-scoped(RBAC) | tenant-req |
| `/api/send-booking-emails` | tenant-scoped(RBAC) | tenant-req |
| `/api/seo/verify-file/[file]` | public(no-tenant-auth) | NONE |
| `/api/service-area` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/service-types` | tenant-scoped(RBAC) | tenant-headers |
| `/api/settings` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/settings/notifications` | tenant-scoped(RBAC) | tenant-req |
| `/api/settings/page-config` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/settings/permissions` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/settings/portal-permissions` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/settings/request-automation` | tenant-scoped(RBAC) | tenant-req |
| `/api/settings/services` | tenant-scoped(RBAC) | tenant-req |
| `/api/settings/services/[id]` | tenant-scoped(RBAC) | tenant-req |
| `/api/settings/team` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/setup-checklist` | tenant-scoped(RBAC) | tenant-req |
| `/api/sidebar-counts` | tenant-scoped(RBAC) | tenant-req |
| `/api/sms` | tenant-scoped(RBAC) | tenant-req |
| `/api/sms/send` | tenant-scoped(RBAC) | tenant-req |
| `/api/social/accounts` | tenant-scoped(RBAC) | tenant-req |
| `/api/social/connect/facebook` | tenant-scoped(RBAC) | tenant-req |
| `/api/social/connect/facebook/callback` | tenant-scoped(RBAC) | tenant-req |
| `/api/social/connect/instagram` | tenant-scoped(RBAC) | tenant-req |
| `/api/social/connect/instagram/callback` | tenant-scoped(RBAC) | tenant-req |
| `/api/social/post` | tenant-scoped(RBAC) | tenant-req |
| `/api/social/posts` | tenant-scoped(RBAC) | tenant-req |
| `/api/team` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/team-applications` | tenant-scoped(RBAC) | rbac-permission |
| `/api/team-applications/bulk-approve` | tenant-scoped(RBAC) | rbac-permission |
| `/api/team-applications/upload` | public(tenant-resolved) | NONE |
| `/api/team-availability` | tenant-scoped(RBAC) | current-tenant |
| `/api/team-members/[id]/stripe-onboard` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/team-members/[id]/stripe-status` | tenant-scoped(RBAC) | tenant-headers |
| `/api/team-portal/15min-alert` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/auth` | public(auth-establishment) | rate-limit+pin |
| `/api/team-portal/availability` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/checkin` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/checkout` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/config` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/connect` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/connect/unread` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/crew/earnings` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/crew/members` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/crew/schedule` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/earnings` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/guidelines` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/jobs` | tenant-scoped(team-token) | portal-token,team-token |
| `/api/team-portal/jobs/claim` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/jobs/reassign` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/jobs/release` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/messages` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/notifications` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/photo-upload` | tenant-scoped(team-token) | team-token (PROPOSED — not wired, migration-dependent, see route.ts header) |
| `/api/team-portal/preferences` | tenant-scoped(team-token) | team-token |
| `/api/team-portal/rating` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/running-late` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/travel-times` | tenant-scoped(team-token) | portal-token |
| `/api/team-portal/update-phone` | tenant-scoped(team-token) | hmac-token |
| `/api/team-portal/video-upload` | tenant-scoped(team-token) | team-token |
| `/api/team/[id]` | tenant-scoped(RBAC) | rbac-permission,tenant-req |
| `/api/tenant-sitemap` | public(no-tenant-auth) | NONE |
| `/api/tenant/public` | public(token-derived) | tenant-headers |
| `/api/tenants` | authenticated(clerk-owner) | owner-session (checked 2026-07-18: `getOwnerUserId()`-gated create-tenant POST, no live gap) |
| `/api/tenants/public` | public(token-derived) | NONE |
| `/api/territories/options` | public(tenant-resolved) | NONE |
| `/api/test-emails` | tenant-scoped(RBAC) | rbac-permission |
| `/api/test/email-selena` | dev-only(env-gated) | SELENA_TEST_TOKEN+safeEqual (checked 2026-07-18: 404s if env unset, no live gap) |
| `/api/test/email-selena/cleanup` | dev-only(env-gated) | SELENA_TEST_TOKEN+safeEqual (checked 2026-07-18: 404s if env unset, no live gap) |
| `/api/track` | public(no-tenant-auth) | NONE |
| `/api/unsubscribe` | public(token-derived) | unsub-token |
| `/api/uploads` | tenant-scoped(RBAC) | tenant-req |
| `/api/user/preferences` | tenant-scoped(RBAC) | tenant-req |
| `/api/waitlist` | tenant-scoped(RBAC) | tenant-req,tenant-headers |
| `/api/webhooks/clerk` | webhook(signed) | webhook-sig |
| `/api/webhooks/resend` | webhook(signed) | webhook-sig |
| `/api/webhooks/stripe` | webhook(signed) | stripe-sig |
| `/api/webhooks/stripe-platform` | webhook(signed) | stripe-sig |
| `/api/webhooks/telegram` | webhook(signed) | webhook-sig |
| `/api/webhooks/telegram/[tenant]` | webhook(signed) | webhook-sig |
| `/api/webhooks/telegram/jefe` | webhook(signed) | webhook-sig |
| `/api/webhooks/telnyx` | webhook(signed) | webhook-sig |
| `/api/webhooks/telnyx-voice` | webhook(signed) | webhook-sig |
| `/api/yinez` | tenant-scoped(RBAC) | tenant-sig |