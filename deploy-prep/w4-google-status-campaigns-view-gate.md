# W4 controlled-broad-hunt finding: GET /api/google/status missing campaigns.view gate

## Bug

`GET /api/google/status` (`platform/src/app/api/google/status/route.ts`) called `getTenantForRequest()` directly with **no `requirePermission` check**. The route backs `/dashboard/google` (Google Business connection status, review average/count, post count, auto-reply setting), which sits under the Marketing fold in `dashboard-shell.tsx`'s nav (`perm: 'campaigns.view'`) — but that nav gate is client-side/UX only, and the page component itself does no server-side role check either.

`staff` has no `campaigns.*` permission by default (`rbac.ts`). Any authenticated tenant member, including `staff`, could hit the API directly (bypassing the hidden nav item) and read Google review stats, post counts, and the auto-reply toggle state — same class of gap as the already-fixed sibling `GET /api/social/posts` (commit 5456cc27), which lives under the same Marketing/campaigns.view fold.

## Fix

Gated `GET` on `requirePermission('campaigns.view')`, matching the exact pattern used for `GET /api/social/posts`. Swapped the destructured `tenant.id` reads (`getGoogleTokens`, `getGoogleBusiness`, and the three `supabaseAdmin` queries) for `tenant.tenantId` since `requirePermission` returns the full `TenantContext` rather than the nested `Tenant` row (`TenantContext.tenantId === TenantContext.tenant.id`, verified against `tenant-query.ts`).

File: `platform/src/app/api/google/status/route.ts`

## Also checked, not fixed (lower-risk surface, no clear gap)

- `GET /api/admin/analytics/live-feed` — same `getTenantForRequest()`-only shape, returns non-PII site-visit analytics (page/referrer/device/time-on-page, no names/emails/phones). Grepped the whole `src/app` tree: no frontend page calls this endpoint at all — appears to be dead/orphaned (its sibling `/api/admin/analytics` is a *different*, `requireAdmin()`-gated platform-admin route). Flagging for someone to confirm dead-code status and either wire it up with a gate or remove it, but not touching it this pass since it's unreachable from any current UI path and low sensitivity.
- `GET /api/setup-checklist`, `GET /api/sidebar-counts`, `GET /api/changelog(+[id])`, `GET /api/announcements/unread`, `/api/connect/*` (channels/messages/unread), `/api/user/preferences`, `/api/permissions/me`, `/api/push/subscribe`, `/api/indexnow` — reviewed, all either self-scoped-by-design (own user's prefs/permissions/subscriptions), platform-wide non-tenant data (changelog/announcements), or intentionally whole-team features with no `perm` field on their nav entries either (Loop Connect, Docs, Feedback all match this pattern) — no gap found.
- `POST /api/admin/translate` (Claude-key-consuming utility, any authenticated role) and `GET /api/admin/smart-schedule` (cleaner-scoring for booking assignment) — real candidates for a permission gate (translate burns Anthropic spend per-call like the earlier campaigns.generate finding; smart-schedule exposes team routing/scoring to any role) but deferred this pass to keep the batch to one verified fix — flagging for next pass.

## Verification

- New `route.permission-gate.test.ts`: staff GET → 403; manager GET (has `campaigns.view`) → 200.
- RED/GREEN verified via backup/restore (cp to /tmp, restore pre-fix route.ts, confirmed test failed 200≠403, restored fixed version, confirmed pass) — no `git stash` used.
- `npx tsc --noEmit` — clean.
- Full suite: `npx vitest run` — 343/344 files, 1448/1452 tests pass (1 pre-existing unrelated RED test, `src/app/api/cron/tenant-health/status-coverage-divergence.test.ts`, a documented "RED until fixed" invariant repeatedly flagged by other workers this session, unchanged by this commit).

Commit: fix(security) d266744e.

File-only, no push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.
