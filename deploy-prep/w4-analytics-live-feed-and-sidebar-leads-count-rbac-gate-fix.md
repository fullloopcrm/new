# W4 Report — analytics live-feed + sidebar-counts RBAC gate fix

**Branch:** p1-w4
**Commit:** 09e10e1d
**Scope:** file-only, no push/deploy/DB writes

## What was found

Continuing the controlled broad-hunt over lower-risk API surface for tenant
routes that call `getTenantForRequest()` (auth-only) without a matching
`requirePermission()` check, the same class of bug fixed repeatedly this
week (google/status, social/posts, broadcast-guidelines, admin/ai-chat,
etc).

1. **`GET /api/admin/analytics/live-feed`** — no permission check at all.
   Any authenticated tenant role, including `staff` (which lacks
   `campaigns.view` by default), could call this directly and read live
   visitor tracking data (domain, page, referrer, device, time on page,
   scroll depth) for the tenant's marketing sites. This is the same
   marketing/analytics fold as the already-fixed `GET /api/google/status`
   and `GET /api/social/posts`.

2. **`GET /api/sidebar-counts`** — returned the raw pending-leads count
   (from `website_visits`) to every authenticated role. The dashboard
   sidebar already nav-hides the Sales/leads item for roles without
   `leads.view` (`dashboard-shell.tsx`, `perm: 'leads.view'` on the Sales
   fold), but the API itself never enforced it — a UI-level gate with no
   matching API-level gate, calling the endpoint directly leaked the count
   to `staff`.

## Fix

1. `live-feed/route.ts` — swapped `getTenantForRequest()` for
   `requirePermission('campaigns.view')`, matching sibling routes.
2. `sidebar-counts/route.ts` — added a `canViewLeads` check
   (`hasPermission(ctx.role, 'leads.view', overridesFor(ctx))`) and redact
   `leads` to `0` when false, mirroring the existing
   `canViewFinance`/`canViewTeam` redaction pattern already in
   `GET /api/dashboard`.

## Verification

- Added `route.permission-gate.test.ts` for both routes (staff → 403 /
  redacted; manager → 200 / real value). New tests pass:
  `4 passed (4)` across the two new files.
- `npx tsc --noEmit` — clean, no errors.
- Re-ran existing tests for the touched dirs plus the sibling
  google/status and social/posts suites — all pass (`6 passed`).

## Not touched (reviewed, judged lower-value or not a real gap)

- `admin/smart-schedule`, `ai/chat`, `ai/assistant` (already tool-gated),
  `connect/*`, `changelog*`, `announcements/unread`, `dashboard/messages`
  (deliberately role-gated, not permission-based, per its own comment),
  `dashboard` route (already redacts finance/team), `indexnow`,
  `push/subscribe` (already fixed previously), `uploads`,
  `setup-checklist`, `user/preferences`, `permissions/me` — none expose
  data gated by a permission the caller's role would lack, or are
  intentionally open to all authenticated tenant members.
- `admin/translate` and `settings/request-automation` — no RBAC data leak,
  but both allow any authenticated tenant member to trigger a paid AI call
  / an email to the platform team with no `settings.edit`/cost gate. Flagged
  as a possible follow-up (abuse/cost-control, not a data-exposure gap) —
  not fixed here to stay within today's RBAC-gate pattern.

No push, deploy, or DB migration performed.
