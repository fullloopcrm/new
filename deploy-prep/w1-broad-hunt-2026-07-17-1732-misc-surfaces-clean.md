# W1 — broad fresh-ground hunt, misc previously-unaudited API surfaces (2026-07-17 17:32)

Fresh-ground pass per 17:24's queue item 1. Stale-order note first: this
worktree's system order text (timestamped 17:15) was already fully executed
and reported at 17:23, acked at 17:24 (HEAD `38c376d2`/`e29218ec` match) —
confirmed via `git log` before doing any new work. Continued from the actual
latest standing order (17:24's fresh 3-deep queue, item 1: new fresh-ground
surface).

## Surfaces swept, all clean, no live bug found

Picked a wide spread of previously-unnamed-tonight API routes (cross-checked
directory names against every prior deploy-prep doc title first) rather than
one deep vertical:

- `quote-templates` (list+create, tenant-scoped, `sales.view`/`sales.edit`
  gated) — correct auth, correct tenant scoping on both GET and POST.
- `audit` (audit-log viewer, `audit.view` gated, tenant-scoped, paginated) —
  clean.
- `announcements/unread` — read/mark-read on `platform_announcement_reads`,
  `onConflict: 'announcement_id,tenant_id'` is tenant-compound (not the
  single-column collision class W4 closed at 17:16), safe.
- `user/preferences` — per-member prefs, `onConflict:
  'tenant_member_id,page'` also tenant-compound-safe; correctly no-ops
  (doesn't error) for impersonation sessions with no real membership row.
- `push/subscribe` — already carries a detailed prior-session security
  comment + `route.security.test.ts`; identity for all 3 roles
  (admin/team_member/client) is verified session-derived, never
  request-body-trusted. Already hardened, not this session's find.
- `territories/options` — public, explicitly no-PII by design, cached
  hourly. Clean.
- `sms` (admin manual conversation reply) + `sms/send` (manual blast) — both
  explicitly document "no consent filtering, caller is responsible" as
  deliberate (direct two-way admin reply / explicit admin-triggered send,
  not an automated client-facing cron), consistent with the standing
  distinction this session has drawn between automated-send consent gating
  (fixed 4x tonight) and admin-manual actions (correctly left alone). FK-owned
  `conversation_id` cross-tenant-injection guard already present and correct.
- `catalog` (service_types CRUD) — tenant-scoped on every verb incl.
  PATCH/DELETE, clean.
- `team` (roster list/create) — already carries the owner-role-escalation
  guard (`route.owner-escalation.test.ts`) preventing a non-owner admin from
  minting a new `owner` team member; PIN correctly stripped from the list
  response.
- Google OAuth surface, both dashboard (`/api/google/auth`+`/callback`) and
  admin-initiated (`/api/admin/google/auth`+`/callback`) variants, plus the
  shared `lib/oauth-state.ts` CSRF-state signer/verifier and `lib/google.ts`
  token storage — all already hardened: HMAC-signed + timing-safe-compared +
  15-min-expiring `state` param (CWE-352 CSRF fix already landed, own test
  file), refresh_token encrypted at rest via `secret-crypto`, and
  `getValidAccessToken`'s refresh-grant path correctly re-uses the OLD
  refresh_token rather than trusting a (usually absent) one from the refresh
  response — would have been a silent-revoke bug if it didn't. `admin/google
  /reply` writes through `tenantDb(tenantId)` (auto tenant-filtered update),
  not a bare `supabaseAdmin` call — safe.
- `pipeline` (Kanban snapshot) — read-only, tenant-scoped, clean.
- `connect/unread` — channel list correctly tenant-scoped BEFORE being used
  to filter the messages count query; no cross-tenant leak path.
- `deals`/`deals/[id]`/`deals/[id]/stage` — already extensively hardened
  from prior passes (client-ownership, stage-race, sold-conversion,
  at-risk-naive-ET, owner-alert-escape tests all present); re-read, no new
  bug.
- `requests` (public partner-request intake + admin review) — rate-limited
  (3/10min per IP + 24h per-email dedup), `escapeHtml()` already applied to
  every interpolated field in the notification email (same STORED-XSS class
  fixed on apply-ceo at 16:52 — this one was never vulnerable), admin-only
  filtered list requires `requireAdmin()`.
- `client/*` overview (book/collect/recurring/properties/verify-code/etc.) —
  already has extensive dedicated test coverage from prior passes
  (crossTenantClient, race, pricing, date-time-window). Re-scanned, no new
  bug.

## Noted, not fixed — dead feature, not a bug

`quote_templates` (the table `/api/quote-templates` reads/writes) has **zero
UI consumers anywhere in the repo** — grepped `src/` for `quote-templates`/
`quote_templates` outside the route file itself and found only
`src/middleware.ts` (route allowlist) and the two migration files that
created the table/RLS policy. The whole list+create API is real,
authenticated, and tenant-scoped (not a security bug — same
no-live-caller/dead-code class W4 flagged for `lead-media/signed-url` at
16:19 and the site-clone auth.ts cluster at 16:11), just never wired into
`/dashboard/quotes` or the quote builder. Not fixed — building the missing
UI/wiring is a product decision (does the quote builder actually want
reusable templates?), not a bug fix, and out of this pass's scope.

## Verification

No code changed this pass — file-only investigation only, no fix landed.
`npx tsc --noEmit` clean (same 2 pre-existing baseline errors:
`admin-auth` route type quirk + untracked `sunnyside-clean-nyc/site-nav.ts`,
both unrelated and pre-existing). `tenant_domains` schema lane
(043/055/056/059/068/069) reconfirmed intact, no drift, no DB commands run.
