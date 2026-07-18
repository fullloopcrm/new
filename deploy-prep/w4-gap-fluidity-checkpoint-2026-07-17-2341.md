# Gap/fluidity checkpoint — W4, 2026-07-17 23:41

Per the 23:26 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

Full details: `w4-comhub-voice-dial-toll-fraud-rate-limit-fix-2026-07-17-2340.md`.

1. Fresh ground (order item 1): IDOR sweep of admin comhub `contacts/[id]`,
   `messages/[id]`, `templates/[id]`, `threads/[id]` routes (+ list/create
   siblings) — the checkpoint's own suggested next candidate. All clean,
   correctly tenant-scoped, `.or()` filters already sanitized.
2. Real bug found continuing into the same surface (order item 2):
   `voice/dial` (`admin_phone`) and `voice/control`'s `transfer_blind`/
   `transfer_warm` (`payload.target`) place real, per-minute-billed
   outbound Telnyx calls to arbitrary caller-supplied phone numbers with
   **no rate limit** — unlike `comhub/send`'s SMS/email branches. Toll-
   fraud/cost-abuse vector, same class as several earlier fixes this
   session on other paid actions. Fixed with a shared
   `comhub-voice-dial:<tenantId>` bucket (20/10min) across both routes.
   Grepped all `api.telnyx.com/v2/calls` call sites repo-wide to confirm
   this is bounded to exactly these 2 instances (the 3rd, the inbound
   webhook's ring-fanout, dials server-derived targets, not user input —
   not part of this class).
3. Gap/fluidity checkpoint: this file.

## Verification

RED/GREEN mutation-verified via `git diff`/`git apply -R` (4/4 new
assertions failed pre-fix, pass post-fix). New test file for `voice/dial`
(had none before, 2 tests); `voice/control` extended 6→10 tests. Full
comhub suite: 7 files/26 tests passing. `tsc --noEmit`: clean except the
same 2 pre-existing baseline errors in `sunnyside-clean-nyc/_lib/
site-nav.ts` noted every checkpoint this session. Full repo suite: 641/643
files, 2264/2268 tests — same 2 documented pre-existing failures every
checkpoint this session (`cron/tenant-health` RED-until-fixed invariant,
`cron/generate-recurring` known flaky race). Zero regressions.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 21:34 through 23:23 checkpoints — re-list only, no new
status:
- `create-tenant-from-lead.ts` atomic-claim migration — PROPOSED, unapplied,
  highest real-money blast radius, now well over 24h stale.
- `referrers.total_earned`/`total_paid` atomic-bump migrations — PROPOSED
  2026-07-16, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email` TOCTOU hardening + retry-on-
  unique_violation — PROPOSED, pending DDL.
- `post-labor.ts`/`postDepositToLedger` entity_id design decision — needs
  Jeff/leader input.
- `categorization_patterns` recategorization semantics — open product
  question.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired.
- `comhub-email` cron's `unread_count` bump — not dug into, low priority.
- CSRF-on-GET instances — judged not worth fixing, severity precedent.
- Four dead clone `_lib/email-templates.ts` files (~3500 lines) — cleanup
  candidate, pending Jeff's clone-deletion green light.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority cleanup, still
  unaddressed.
- `post-adjustments.ts`'s `postCommissionPayment` `status !== 'void'` check
  — inert today, re-check only if a direct caller is added.
- `rate_limit_check_and_record` atomic RPC — PROPOSED, pending DDL.
- `inbound_emails.html_body`/`raw` — dead storage, zero readers today.
- `src/lib/nycmaid/notify-cleaner.ts`'s `notifyCleaner()` — dead code,
  missing tenant_id filter, flag for whoever wires it up.
- `admin/campaigns/preview/route.ts`'s `wrapEmail()` raw-color-in-style —
  self-XSS only, cheap-hardening candidate, still not fixed.
- `agreement.ts`'s `buildAgreement()` (HTML version) — confirmed dead code,
  cleanup candidate.
- Push-notification send paths (`sendPushTo*`) for the analogous consent/
  preference gate — flagged repeatedly, still not looked at.
- `documents.status = 'expired'` — defined terminal status with no cron/code
  path that ever sets it, currently unreachable in practice.
- `threads/[id]` PATCH's caller-supplied `assignee_id` — no check it's a
  real tenant_member (data-integrity only, not a security bypass; flagged
  05:11, intentionally not fixed — ambiguous whether strict validation is
  wanted).
- `voice/cleanup` — unwired dead code, doesn't call Telnyx, only sweeps DB
  rows (noted 05:11).

## New this pass

- `comhub-voice-dial:<tenantId>` rate-limit bucket (20 req / 10 min),
  shared across `voice/dial` POST and `voice/control`'s `transfer_blind`/
  `transfer_warm` actions. Do not re-sweep these two routes for this
  specific gap without a new signal.
- Confirmed (not fixed, pre-existing and out of scope for this pass):
  `voice/dial`'s `admin_phone` and `voice/control`'s transfer `target` are
  still not validated against the tenant's own registered numbers/members
  — only throttled now, not whitelisted. A determined attacker with a
  valid admin session can still dial/transfer to any number, just capped
  at 20/10min per tenant instead of unlimited. Whitelisting against
  `tenant_members`/`comhub_admin_voice_settings.fallback_cell_phone` would
  close this further but is a larger product-scoping question (does the
  UI's free-text "ring me" field ever legitimately need to hit a number
  outside the roster? e.g. a manager's personal cell not yet added as a
  tenant_member) — flagging rather than guessing.

## Next-target candidates if continuing fresh-ground hunting

- Whitelisting `admin_phone`/transfer `target` against tenant roster
  (see above) — a deeper hardening of the surface just touched, gated on
  a product question rather than a clear bug.
- Push-notification send paths (`sendPushTo*`) — carried forward
  repeatedly, next most obvious continuation of the do_not_service/
  sms_consent class on a different channel.
- The ~30+ direct `sendEmail(`/`sendSMS(` call sites outside booking-
  lifecycle/campaigns/crons (one-off admin/dashboard routes) — narrowing
  pool.
- Re-run the postgrest-filter-injection sweep pattern against surfaces not
  yet covered.

No push/deploy/DB this pass.
