# Gap/fluidity checkpoint — W4, 2026-07-17 23:23

Per the 23:02 LEADER order item 3. File-only, no push/deploy/DB.

## This pass

Full details: `w4-broad-hunt-2026-07-17-2311-payment-retention-cron-consent-bypass-fix.md`.

1. Also committed (not this pass's finding, but was left uncommitted at
   session start): the prior session's e-sign terminal-status guard +
   post-claim void-race guard, referenced by the 23:02 LEADER order as
   already-closed work (`b1e63ff4`).
2. Fresh ground (order item 1): swept ~25 previously-unaudited API surfaces
   (ingest/lead+application, apply-ceo, cpa year-end-zip, prospects,
   inquiry, import-clients, catalog, sidebar-counts, setup-checklist,
   service-area, indexnow, pipeline, client-analytics, domain-notes,
   recurring-expenses, quote-templates, unsubscribe, errors, public-upload,
   contact, track, plus 4 unaudited `[id]`-dynamic admin routes). All clean
   — already properly gated by prior sessions.
3. Real bug found (order item 2, continued): pivoted to this session's own
   do_not_service/sms_consent bug class (fixed 3x already tonight for the
   booking-lifecycle SMS pipeline, campaign sends, and the `notify()`
   dispatcher) and swept every remaining `cron/*` file for the same gap.
   Found and fixed it in **5 crons**: `payment-reminder` (generic branch),
   `payment-followup-daily`, `retention`, `confirmations` (client day-before
   branch), `post-job-followup` (both booking and job branches).
   `cron/outreach` was checked and already fully gated — confirms this is a
   real, bounded gap, not a codebase-wide miss.
4. Gap/fluidity checkpoint: this file.

## Verification

RED/GREEN mutation-verified in two batches. Full repo suite: 640/642 test
files, 2258/2262 tests passing — both failures confirmed pre-existing/
unrelated (documented RED-until-fixed `tenant-health` invariant; documented
`cron/generate-recurring` race flake, reran in isolation and it passes
cleanly, confirming it's the known flake). `tsc --noEmit`: clean except the
same 2 pre-existing baseline errors in `sunnyside-clean-nyc/_lib/
site-nav.ts` noted in every checkpoint this session.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 21:34 through 23:01 checkpoints — re-list only, no new
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
  preference gate — flagged twice now, still not looked at.
- `documents.status = 'expired'` — defined terminal status with no cron/code
  path that ever sets it, currently unreachable in practice (noted when the
  e-sign fix was made).

## New this pass

- The do_not_service/sms_consent bug class, now closed across every
  `cron/*` file that calls `sendSMS`/`sendEmail` directly to a client. Do
  not re-sweep `cron/*` for this specific class without a new signal — the
  remaining unswept cron files (`anthropic-health`, `auto-reply-reviews`,
  `cleanup-videos`, `comhub-email`, `comms-monitor`, `confirmation-reminder`,
  `follow-up`, `health-check`, `health-monitor`, `hr-document-reminders`,
  `jefe-heartbeat`, `lifecycle`, `no-show-check`, `refresh-job-postings`,
  `sales-follow-ups`, `schedule-monitor`, `sync-google-reviews`,
  `system-check`, the `seo-*` family) were grepped for `sendSMS(`/
  `sendEmail(` call sites and either have none or were already checked in
  prior sessions.
- `src/lib/types.ts` gained a `sms_consent`/`do_not_service` pair on the base
  `ClientRecord` interface and a new `ClientNamePhoneConsent` Pick type —
  reusable for any future route needing a typed (non-`as unknown as`) client
  join with consent fields.

## Next-target candidates if continuing fresh-ground hunting

- Push-notification send paths (`sendPushTo*`) — carried forward twice now,
  next most obvious continuation of this exact class on a different channel.
- The ~30+ direct `sendEmail(`/`sendSMS(` call sites outside booking-
  lifecycle/campaigns/crons (one-off admin/dashboard routes) — narrowing
  pool as crons get swept.
- Genuinely fresh, zero-prior-coverage surfaces: none identified this pass
  beyond what's listed above as checked-clean. Next session should either
  pick up push-notification consent gating or pivot to a wholly different
  bug class (e.g. re-run the postgrest-filter-injection sweep pattern
  against surfaces not yet covered, or an IDOR sweep of the admin
  comhub/contacts/messages/templates/threads `[id]` routes, not yet checked
  this session).

No push/deploy/DB this pass.
