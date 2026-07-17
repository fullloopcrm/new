# Gap/fluidity checkpoint — W4, 2026-07-17 19:49

Per the 19:28 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground: closed out the 6-file residual list flagged in the 19:23
   report (`agreement.ts`, `csv-parse.ts`, `login-alert.ts`,
   `deal-delete-guard.ts`, `unsubscribe-token.ts`, plus `agreement-pdf.ts`).
   Found and fixed a real bug: `login-alert.ts`'s admin login-alert email
   interpolated the raw `user-agent` header (fully attacker-controlled)
   plus `ip`/`who`/tenant-name into HTML with zero escaping — reachable by
   anyone with a valid (stolen/leaked) admin PIN, letting them inject
   HTML/phishing content into the very "if this wasn't you" security
   notification.
2. Continued the same bug shape: found and fixed 2 more instances —
   `security.ts`'s `logSecurityEvent` (tenant name live-reachable via
   `api_key_change`) and `selena-legacy-email.ts`'s `formatHtmlReply`
   (tenant name in every automated AI reply footer sent to external
   leads). Full write-up:
   `w4-broad-hunt-2026-07-17-1938-login-alert-and-security-event-html-injection-fix.md`.
3. This checkpoint.

## Sweep status

Every `src/lib/` file that builds an HTML email
(`login-alert.ts`/`security.ts`/`selena-legacy-email.ts`/
`proposal-email.ts`/`jefe/actions.ts`/`agreement.ts`/`messaging/shell.ts`)
is now read and checked for the unescaped-interpolation bug class. 3 real
fixes, 1 dead-code non-issue, rest confirmed clean. No further leads open
in this bug class under `src/lib/`.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 18:51 checkpoint — re-list only, no new status:
- `create-tenant-from-lead.ts` atomic-claim migration — PROPOSED, unapplied,
  highest real-money blast radius, now well over 24h stale.
- `referrers.total_earned`/`total_paid` atomic-bump migrations — PROPOSED
  2026-07-16, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email` TOCTOU hardening — still blocked
  on pulling its real live body first.
- `post-labor.ts`/`postDepositToLedger` entity_id design decision — needs
  Jeff/leader input.
- `categorization_patterns` recategorization semantics — open product
  question.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired.
- `comhub-email` cron's `unread_count` bump — not dug into, low priority.
- CSRF-on-GET instances (2026-07-17 18:10 pass) — judged not worth fixing,
  severity precedent.
- Four dead clone `_lib/email-templates.ts` files (~3500 lines,
  `nyc-mobile-salon`/`wash-and-fold-hoboken`/`wash-and-fold-nyc`/`the-nyc-
  interior-designer`) — cleanup candidate, not a security fix, pending
  Jeff's clone-deletion green light per `platform/CLAUDE.md`'s known-debt
  section.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority single-file
  cleanup candidate, not security-relevant.
- `post-adjustments.ts`'s `postCommissionPayment` doesn't independently
  verify `status !== 'void'` — inert today, flagged for re-check only if a
  direct caller is ever added.
- `agreement.ts`'s HTML `buildAgreement()` — confirmed dead code this
  pass (zero callers), new low-priority cleanup candidate if Jeff ever
  wants dead-code removed; not a security issue.

## Next-target candidates if continuing fresh-ground hunting

- The `src/lib/` HTML-email-builder sweep is now closed — do not return
  to it without a new bug class to check for.
- Natural next fresh-ground target: the same unescaped-interpolation bug
  class, but for HTML email built directly inline inside
  `src/app/api/**` route files (rather than via a `lib/` helper) — not yet
  swept as its own dedicated pass.
- Finance/payroll remains the most exhaustively audited surface this
  session (120+ prior reports) — do not return there without new signal.

No push/deploy/DB this pass.
