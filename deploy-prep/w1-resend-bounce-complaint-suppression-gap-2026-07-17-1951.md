# webhooks/resend: email.complained never handled, email.bounced suppression dead for real sends (2026-07-17 19:51)

## Bug
`webhooks/resend/route.ts` only handled `email.bounced`, and only by
updating a `campaign_recipients` row looked up via `resend_email_id`. That
column is populated exclusively by `POST /api/campaigns/send` (the
`notify()` + recipient-tracking implementation) -- but the actual send
button wired into the dashboard UI is `POST /api/campaigns/[id]/send`,
which calls `sendEmail()` directly and never creates a `campaign_recipients`
row at all (confirmed via repo-wide grep + git-blame: `campaigns/send` has
zero callers anywhere in the app; `campaigns/[id]/send` was wired to the
panel by `74021bfc`, 2026-04-25 -- orphaned for 3 months).

Net effect for every real campaign send: a hard bounce or spam complaint
never suppressed anything. `email.complained` (recipient hit "report spam")
wasn't handled at all -- zero suppression, zero audit trail. A client who
marked a campaign as spam kept receiving every future one. Live CAN-SPAM /
deliverability gap, not hypothetical.

## Fix (file-only, no push/deploy/DB)
- `src/lib/email.ts` -- `sendEmail()` accepts an optional `tags` param,
  passed through to Resend's API (round-trips back on the webhook payload
  as `data.tags`).
- `src/lib/notify.ts` -- tags client-recipient emails (`recipientType ===
  'client'`) with `tenant_id`/`client_id` at send time, on both the
  primary-channel and email-fallback send paths. Also now returns
  `providerMessageId` for callers that need it.
- `src/app/api/campaigns/[id]/send/route.ts` -- tags its direct
  `sendEmail()` call the same way, since this route never creates a
  `campaign_recipients` row for the old join to work against.
- `src/app/api/webhooks/resend/route.ts` -- on `email.complained` or
  `email.bounced`, reads `data.tags.tenant_id`/`client_id` back (no DB join
  needed), sets `clients.email_marketing_opt_out` + timestamp scoped by
  `tenant_id`, and logs to `marketing_opt_out_log` with a distinct `method`
  per event type (`email_complaint` vs `email_bounce`) for audit-trail
  clarity. Missing tags -> logs a warning, no crash, no suppression
  (untagged/legacy sends can't be attributed, doesn't break the webhook).
- `src/lib/migrations/072_marketing_opt_out_log_email_bounce_complaint_methods.sql`
  (prepared, not applied) -- extends `marketing_opt_out_log.method`'s CHECK
  constraint for the two new values. Written to be correct whether
  migration 050's stricter constraint or migration 007's looser
  `CREATE TABLE IF NOT EXISTS` original shape is actually live (no Supabase
  env in this worktree to confirm which applied) -- `DROP CONSTRAINT IF
  EXISTS` no-ops harmlessly either way.

## Tests
- `src/app/api/webhooks/resend/route.complaint-bounce-suppression.test.ts`
  (new) -- `email.complained` suppresses the exact tagged client, scoped by
  `tenant_id` (a different tenant's client sharing the same email is left
  untouched), logs `method:'email_complaint'`; untagged events no-op
  cleanly; `email.bounced` suppresses + logs `method:'email_bounce'`.
- `src/app/api/campaigns/[id]/send/route.resend-tags.test.ts` (new) --
  confirms the route's `sendEmail()` call carries the
  `tenant_id`/`client_id` tags.
- `src/lib/notify.test.ts` (extended) -- confirms `notify()` tags
  client-recipient sends and returns `providerMessageId`.

## Verification (independently re-run this session, not just trusted from
## the prior report)
- `tsc --noEmit`: 0 errors in any touched file. 4 pre-existing baseline
  errors elsewhere (admin-auth route typing, two other workers'
  in-progress cron test files, untracked sunnyside-clean-nyc site-nav.ts),
  none touched by this change.
- Targeted: 6 test files across `campaigns/[id]/send`, `webhooks/resend`,
  `notify` -- 38/38 passed, 0 regressions on adjacent tests in the same
  files (race condition test, unsubscribe-link test).
- Full suite: 591/591 files, 3195 passed + 1 pre-existing expected-fail
  (same one flagged by other workers all session), 0 regressions.
- `eslint` on touched files: 0 errors, 8 warnings -- all the same
  pre-existing `_arg`-unused-mock-parameter class used throughout this
  session's test files, none new logic warnings.

## Not touched (flagged, not fixed)
- The `campaigns/send` vs `campaigns/[id]/send` two-route architecture
  question (one has real recipient-tracking + `notify()` but zero UI
  callers; the other is what the UI actually calls and has none of that)
  is a routing/consolidation decision for Jeff, not something to resolve
  unilaterally -- logged separately in JEFF-MORNING-QUEUE.md per the
  leader's 15:03 order. This fix works around it (tags carry the
  attribution instead of a DB join) rather than depending on a
  reconciliation that hasn't happened.
- `[id]/page.tsx`'s stat tiles read `open_count`/`click_count`, neither of
  which exists as a column anywhere (real tracked name is `opened_count`;
  `click_count` has no producer at all) -- a separate, smaller display bug,
  noted alongside the routing question, not fixed here.
- tenant_domains schema lane reconfirmed intact, no drift
  (043/055/056/059/068/069 + prior primary-invariant/normalization fixes).

Commit: 12b3e4ca. File-only. No push/deploy/DB.
