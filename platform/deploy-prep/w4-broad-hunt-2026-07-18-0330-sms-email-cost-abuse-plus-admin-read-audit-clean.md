# Broad-hunt — W4, 2026-07-18 03:19 order

File-only, no push/deploy/DB. Order gave a choice of two surfaces; did
both since the first came up clean quickly.

## Surface 1: SMS/email cost-abuse (missing/weak rate limiting)

Enumerated every `sendSMS(`/`sendEmail(` call site under `src/app/api`
(59 non-test files) and classified each by auth pattern (`requirePermission`,
`requireAdmin`, cron-secret, webhook-signature, or public/unauthenticated),
then checked whether every public/unauthenticated one has `rateLimitDb`
protection:

- All public-facing send-triggering routes already have `rateLimitDb`:
  `client/book`, `client/reschedule/[id]`, `client/send-code`,
  `portal/auth`, `portal/collect`, `pin-reset`, `/api/chat`, `/api/yinez`,
  `/api/ai/chat`, `/api/admin/ai-chat`, `contact`, `feedback`, `inquiry`,
  `lead`, `leads`, `prospects`, `requests`, `referrers/auth/request`, the
  nyc-marketing-company contact form.
- Two public token-based routes with no rate limit
  (`client/confirm/[token]`, `documents/public/[token]/sign`) are both
  naturally idempotent — the underlying row transitions through an atomic
  claim/status-check on first success, so every repeat POST after the
  first short-circuits to `{ok:true, already...:true}` before reaching the
  send call. No repeat-send cost-abuse window exists on either.
- Admin-authenticated senders (`sms/send`, `reviews/request`,
  `admin/comhub/send`, `admin/find-cleaner/send`, etc.) send via the
  calling tenant's own paid Telnyx/Resend credentials under
  `requirePermission`/`requireAdmin` — self-inflicted cost at worst, not
  platform cost-abuse by an outside actor.
- Cron senders (`cron/confirmations`, `cron/reminders`,
  `cron/phone-fixup`, `cron/comhub-email`, etc.) are all gated by
  `protectCronAPI`/`CRON_SECRET` — confirmed `cron/phone-fixup` (which my
  first grep-pass flagged as auth-less) actually calls
  `protectCronAPI(request)`; false positive from keyword search.
- Webhook senders (`webhooks/telnyx`, `webhooks/telnyx-voice`) both verify
  the Telnyx signature before doing anything, and the voice route's
  missed-call SMS additionally has a `MISSED_CALL_SMS_COOLDOWN_MIN` (60
  min) throttle independent of the webhook auth.

No new gap found. This matches the existing
`w4-client-facing-reschedule-sms-cost-abuse-rate-limit-fix.md` fix already
in this worktree — that was the one real gap in this class and it's
already closed.

Noted but not actioned (already tracked as an open aging item, not new):
`rate-limit-db.ts`'s legacy fallback path is a count-then-insert race
under true concurrency; the atomic RPC migration
(`2026_07_17_rate_limit_check_and_record_atomic_PROPOSED.sql`) already
exists as a prepared file pending Jeff's DDL approval. Not re-flagging as
new since it's already surfaced.

## Surface 2: `admin/**` read audit

Read every `GET` handler across all 117 `src/app/api/admin/**` route
files. Checked three things per route: (a) is there an auth check at all,
(b) for `requirePermission`-gated routes (tenant operator surface), is
every query actually scoped by `tenant.tenantId`, (c) do any GET responses
leak raw secrets (`*_api_key`, tokens) rather than boolean
presence/absence.

- First-pass keyword grep flagged 3 routes as "no auth detected"
  (`admin/selena/monitor`, `admin/system-check`, `admin/google/callback`).
  All three are false positives from using an auth helper other than
  `requireAdmin`/`requirePermission`: `admin/selena/monitor` uses a
  `safeEqual`-checked bearer `ELCHAPO_MONITOR_KEY` (external ops
  monitoring, fails closed if the env var is unset); `admin/system-check`
  uses its own `verifyAdmin()` cookie check; `admin/google/callback` uses
  `verifyOAuthState` (signed CSRF state), the correct pattern for an OAuth
  redirect target that can't carry a session cookie from Google's
  redirect. All three are correctly gated.
- `admin/selena/sms-status` accepts either the same shared monitor key
  (with an explicit required `tenant_id` param) or
  `requirePermission('notifications.view')` — the monitor-key branch is
  checked with `safeEqual` before the caller-supplied `tenant_id` is ever
  trusted, so this isn't a bypass.
- Every `requirePermission`-gated tenant-operator route checked
  (`admin/analytics/live-feed`, `admin/find-cleaner/recent`,
  `admin/recurring-schedules[/[id]]`, `admin/reviews`,
  `admin/schedule-issues`, `admin/selena/score`, `admin/smart-schedule`,
  `admin/team-availability-batch`, `admin/travel-times`, `admin/users`,
  `admin/users/[id]`, `admin/users/[id]/pin`) scopes every query by the
  resolved `tenant.tenantId` — no cross-tenant read found.
- `requireAdmin`-gated routes (`admin/clients`, `admin/businesses/**`,
  `admin/bookings/[id]/closeout-summary`, `admin/bookings/[id]/cleaner-payout`,
  `admin/prospects/[id]`, `admin/comhub/contacts/[id]/context`,
  `admin/comhub/threads/[id]`, etc.) are Jeff's platform-level
  cross-tenant tool — `requireAdmin()` checks the `admin_token` cookie,
  not a tenant session, and several explicitly query by `id` alone with
  no `tenant_id` filter. Confirmed this is by design (matches the
  established `// tenant-scope-ok: platform super-admin surface
  (cross-tenant by design)` convention already used elsewhere in this
  codebase, e.g. `admin/system-check`), not a gap — same conclusion the
  earlier `idor-admin-surface-sweep-clean.md` pass reached for the sibling
  `admin/businesses/**` routes.
- Secret-exposure check: grepped every admin GET route selecting
  `*_api_key`/`*_secret`/`*_token` columns. All but one only use them
  server-side (sending SMS/email, or reducing to a boolean before the
  response — e.g. `admin/businesses/[id]`'s checklist uses
  `!!business.telnyx_api_key`, never the raw value).
  `admin/businesses/[id]` GET does `.select('*')` on `tenants` and returns
  the full row (`{ business, ... }`) including the raw encrypted-at-rest
  key envelopes (`v1:...`) verbatim in the JSON response. This is
  reachable only by an already-authenticated platform super-admin (the
  same single trust tier that can already read/write these values via the
  PUT endpoint on the same route), and the values are ciphertext, not
  plaintext — not a privilege escalation or plaintext-secret leak. Noting
  as a defense-in-depth observation, not a tracked gap: worth trimming to
  a curated response the next time that file is touched for another
  reason, but not worth a standalone fix given zero exploitable blast
  radius today.

No new exploitable gap found on either surface this pass.

## Verification

No code changed this pass (audit-only on both surfaces), so no `tsc`/test
run was needed or performed.

No push/deploy/DB this pass.
