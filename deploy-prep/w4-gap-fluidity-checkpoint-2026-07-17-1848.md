# Gap/fluidity checkpoint — W4, 2026-07-17 18:48

Per 18:30 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground: `src/lib/nycmaid/sms-templates.ts` — checked for the same
   unescaped-user-input class as the email-templates.ts fix closed out
   this session (see the closure commit `f5fa9544`, previously uncommitted
   from the prior turn — committed at the start of this pass). Confirmed
   34 of 35 exports dead code (only `smsReviewRequest` has a live caller).
   The live path, and the one genuinely user-controlled string in the
   whole SMS pipeline (`proof_url`), are both clean — SMS has no HTML
   render context for the email bug class to reproduce in, and `proof_url`
   is stored but never displayed anywhere.
2. Continued into the actually-high-traffic sibling files (`src/lib/sms-
   templates.ts`, `src/lib/messaging/sms-cleaning.ts`) that serve real
   client SMS traffic — also clean, same reasoning. Full write-up:
   `w4-broad-hunt-2026-07-17-1845-nycmaid-sms-templates-plus-shared-sms-
   surface-clean.md`.
3. This checkpoint.

## Housekeeping note

The 18:30 order's praised fix (nycmaid email-templates.ts) had been made
and documented by the prior turn but never committed — closed that out
first this turn (commit `f5fa9544`, includes the regression test file that
was also sitting uncommitted). Flagging in case other in-flight work from
prior turns is sitting uncommitted in the worktree; worth a `git status`
sanity check at the top of future turns if reports and working-tree state
ever drift apart again.

## Sweep status

**SMS surface (nycmaid-specific + shared) is now confirmed clean.** No new
cleanup candidates surfaced this pass — unlike the email-templates dead-
code finding, `nycmaid/sms-templates.ts`'s 34 dead functions are a single
file, not a multi-file clone situation, and lower priority to flag for
deletion (19KB, one file, no live/dead confusion risk the way the four
email clone forks had).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 18:35 checkpoint — re-list only, no new status:
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

## Next-target candidates if continuing fresh-ground hunting

- `platform/src/lib/finance/` non-ledger, non-report files not yet
  enumerated individually (ledger-reports.ts checked at 18:13; siblings
  unconfirmed) — likely the highest-value next fresh-ground target given
  this session's money-bug track record.
- A second `platform/src/components` pass hasn't happened since 17:10's
  XSS/postMessage/eval sweep — not obviously warranted without a new bug
  class to check for.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority single-file
  cleanup candidate, not security-relevant.

No push/deploy/DB this pass.
