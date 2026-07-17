# Gap/fluidity checkpoint — W4, 2026-07-17 18:35

Per 18:16 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground: `src/lib/nycmaid/email-templates.ts` (nycmaid's own richer
   email templates, a same-named but separately-maintained sibling of the
   already-twice-audited `src/lib/email-templates.ts`) had zero prior
   coverage this session. Found and fixed a real, live bug: attacker-
   controlled `clients.name` (settable via the public, unauthenticated
   `POST /api/client/book`) rendered unescaped into the client's own
   booking-received/confirmation emails. Full write-up:
   `w4-broad-hunt-2026-07-17-1830-nycmaid-email-templates-unescaped-clientname-fix.md`.
2. Continued by confirming the fix's full blast radius: both live callers of
   the two fixed functions (`client/book/route.ts`,
   `client/recurring/route.ts`, both via `messaging/client-email.ts`) are
   now covered; grepped for any other caller of `nycmaidEmail.*` — none
   exist.
3. This checkpoint.

## Sweep status

**`lib/nycmaid/email-templates.ts`: now audited and fixed for the two live
functions.** The other 25 exported functions in the same file are confirmed
dead code (no importer anywhere, including test-emails) — not fixed,
matching this session's bar against padding busywork onto unreachable code.

## New cleanup candidate surfaced this pass (not fixed — out of scope)

Found **four more full-file forks** of this same email-template set, one
per legacy per-tenant site clone (`nyc-mobile-salon`, `wash-and-fold-
hoboken`, `wash-and-fold-nyc`, `the-nyc-interior-designer` — each under
`src/app/site/<tenant>/_lib/email-templates.ts`, ~500-1000 lines). Confirmed
zero importers for all four — genuinely dead, not wired to any of those
tenants' actual booking flow (which routes through the shared, already-
audited `../email-templates.ts` for every tenant except `nycmaid`). Same
escaping gaps present (one spot-checked copy is worse — dropped an
`escapeHtml()` call the nycmaid original still has). ~3500 lines of dead,
security-stale duplicate code. Consistent with `platform/CLAUDE.md`'s
"Known debt" section already flagging `wash-and-fold-nyc`/`wash-and-fold-
hoboken` as pre-GLOBAL-rule clones pending an auth/routing cutover before
deletion — not safe to delete unilaterally this pass (those directories
also serve live `(app)/admin`/`(app)/dashboard` routes for those tenants).
Flagging for whoever executes that migration.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 18:15 checkpoint — re-list only, no new status:
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

## Next-target candidates if continuing fresh-ground hunting

- The four dead clone `_lib/email-templates.ts` files (above) — cleanup,
  not a security fix, once Jeff green-lights the clone deletion.
- `src/lib/nycmaid/sms-templates.ts` (19KB, not yet read this session) —
  plain-text SMS bodies, lower injection risk than HTML email but unread;
  worth a quick pass to confirm no link/URL-injection angle.
- `platform/src/lib/finance/` non-ledger, non-report files not yet
  enumerated individually (ledger-reports.ts checked at 18:13; siblings
  unconfirmed).
- A second `platform/src/components` pass hasn't happened since 17:10's
  XSS/postMessage/eval sweep — not obviously warranted without a new bug
  class to check for.

No push/deploy/DB this pass.
