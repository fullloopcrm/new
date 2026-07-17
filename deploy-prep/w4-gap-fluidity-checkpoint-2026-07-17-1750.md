# Gap/fluidity checkpoint — W4, 2026-07-17 17:50

Per 17:37 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground: closed out the last two unreviewed Postgres RPC groups
   (`seo_*`, `cpa_token_bump_usage`) -- both clean, no action needed. Full
   write-up in `w4-broad-hunt-2026-07-17-1745-categorization-patterns-key-mismatch-plus-stale-outreach-count.md`.
2. That closure opened a new angle -- JS-side (not SQL RPC) read-then-write
   counter bumps -- which surfaced two real, previously-unflagged bugs:
   - `categorization_patterns`'s 3-column lookup (`tenant_id, pattern,
     coa_id`) doesn't match its actual 2-column unique index (`tenant_id,
     pattern`). Not a race -- 100% reproducible on ordinary sequential
     re-categorization. Silent (unchecked insert error), so `hit_count`
     just quietly stopped incrementing with zero observability. Fixed
     across all 3 call sites (`bank-transactions/[id]`,
     `accept-suggestions`, `receipts/attach`), same house
     catch-23505-and-refetch idiom used for the pure-race defense-in-depth
     layer. Committed (`fix(finance/categorization): ...`).
   - `deals/at-risk` POST `touch` trusted a client-supplied
     `outreach_count` instead of reading it server-side -- a
     human-think-time staleness window, not just a race. Currently dead
     code (no frontend caller exists yet, confirmed by grep), fixed anyway
     since it's cheap and the same bug class. Committed
     (`fix(deals/at-risk): ...`).
3. This checkpoint.

## Sweep status

**Postgres RPC surface: now fully exhausted.** Every RPC function
(`comhub_get_or_create_*`, `seo_*`, `cpa_token_bump_usage`,
`post_journal_entry`, `rate_limit_check_and_record`) has been reviewed for
both the missing-function-vs-caller shape and the TOCTOU-race shape across
this session's passes. No further RPC-group candidates remain.

**JS-side counter-bump surface: spot-checked, not exhaustive.** Grepped
`app/api/` for `+ 1`-shaped counter writes (~20 hits). Two real bugs found
and fixed (above). Reviewed and confirmed clean/low-severity: `health-check`
cron `retry_count` (already claim-guarded), `invoices|quotes|documents`
public `view_count` (cosmetic, no unique-index collision risk, same
accepted-risk class as elsewhere), `recurring-expenses` cron `failure_count`
(not dug into, cron-internal). This was a targeted grep, not a systematic
walk of every counter-shaped field in the codebase -- see next-target below.

## Aging items still open (re-confirmed present, not re-litigated)

- `create-tenant-from-lead.ts` missing atomic claim on `converted_tenant_id`
  -- still the highest real-money blast-radius PROPOSED-but-unapplied
  migration, now well over 24h stale.
- `referrers.total_earned` / `total_paid` lost-update races -- migrations
  proposed (2026-07-16), not wired, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) -- same pending state.
- `admin/cleanup-test-bookings` name-collision risk -- Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email`'s TOCTOU race hardening -- the
  `_by_phone`/`_thread` race-safety migration was applied-as-proposed
  (trimmed, 29258be2); `_by_email`'s own race hardening is blocked on
  pulling its real live body first (its tracked-migration body was never
  written, confirmed to exist live but untracked).
- `post-labor.ts` / `postDepositToLedger` entity_id design decision --
  still needs Jeff/leader input, not a straight copy of the session's
  established pattern.
- Whether `categorization_patterns` should overwrite `coa_id` on a
  recategorization (retrain the learned mapping) vs. keep the original --
  new this pass, deliberately left as an open product question rather than
  assumed; current fix preserves the original coa_id.

## Next-target candidates if continuing fresh-ground hunting

The JS-side counter-bump sweep was targeted, not systematic -- a full walk
of every `.update({ field: existing + 1 })`-shaped write across `src/lib/`
(not just `app/api/`) could surface more of the same key-mismatch class
Finding A represents. `src/lib/` broadly (259 files) still has no
file-by-file walk (carried forward from the 17:30 checkpoint, still true).
`comhub-email` cron's `unread_count` bump (per-thread, inside an IMAP
mailbox lock that only serializes IMAP ops, not concurrent cron
invocations for the same tenant) is a plausible low-priority race
candidate not dug into this pass -- badge-count severity only, not money.

No push/deploy/DB this pass.
