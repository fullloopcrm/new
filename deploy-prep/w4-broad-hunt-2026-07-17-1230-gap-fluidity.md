# W4 gap/fluidity — 2026-07-17 12:30

Closing out the leader's 12:06 3-deep queue.

## Item 1 (fresh-ground hunting) — landed

`booking-notes/upload` MODE 1 image_urls injection, fixed and committed
(`f8fa19b1`). Full writeup:
`deploy-prep/w4-broad-hunt-2026-07-17-1226-booking-notes-image-url-injection-fix.md`.

Before landing on it, ruled out two candidates as already-known, not fresh:
- `referral-commissions` `total_earned`/`total_paid` lost-update race —
  found and file-only proposed 2026-07-16 (`referrer_total_{earned,paid}
  _atomic_bump_PROPOSED.sql`), blocked on Jeff approving prod DDL. Not
  re-landed; nothing new to do here until the migration is approved.
- `cron/recurring-expenses` double-post — already closed by the
  `journal_entries` unique-index + `post_journal_entry()` NULL-return
  contract (`2026_07_13_journal_entries_dedup_constraint_PROPOSED.sql`,
  same "not yet applied to prod" state, but the application code already
  handles both sides of that contract correctly).

## Item 2 (scheduling/dispatch depth) — re-confirmed swept clean

The 11:30 pass already read through `routes/[id]/optimize`,
`routes/[id]/publish`, `routes/[id]/route.ts`, and `routes/route.ts` and
declared them swept with no landing. Re-checked `routes/[id]/publish`
independently this pass with a specific double-fire-SMS hypothesis (the
same class fixed repeatedly elsewhere this session for cron/webhook
triggers) — ruled it out: unlike those cases, "Send to team" is an
intentionally repeatable UI action (button relabels to "Re-send SMS" once
`published_at` is set, `dashboard/sales/routes/page.tsx:219`), so an
atomic once-only claim would break the legitimate re-send path rather than
close a real gap. A genuine double-click race here is a cosmetic
duplicate-text annoyance, not a data-integrity or cost-abuse bug worth the
UX regression. No further scheduling/dispatch landing this pass — the
surface looks genuinely exhausted at this point across ~25+ reports this
session.

## Item 3 (this report)

Full suite: 563 files, 2074 passed / 2 failed (pre-existing,
`cron/tenant-health/status-coverage-divergence.test.ts` — documented
intentional RED invariant, unrelated to any change this pass) / 1 skipped.
`npx tsc --noEmit`: same 2 pre-existing unrelated failures as every prior
report this session (`bookings/broadcast/route.xss.test.ts` mock typing,
`sunnyside-clean-nyc/_lib/site-nav.ts` import mismatch), no new errors.

Standing pending-approval queue (file-only, awaiting Jeff's go-ahead on
prod DDL, not re-listed in full — see each file):
- `2026_07_16_referrer_total_earned_atomic_bump_PROPOSED.sql`
- `2026_07_16_referrer_total_paid_atomic_bump_PROPOSED.sql`
- `2026_07_13_journal_entries_dedup_constraint_PROPOSED.sql`
- `2026_07_13_rls_pass3_tenant_policies_PROPOSED.sql` /
  `..._pass4_...sql`
- `2026_07_17_accounting_periods_audit_trigger_PROPOSED.sql`

No push, no deploy, no DB write this pass. 1 commit (`f8fa19b1`).
