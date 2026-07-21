# email.complained/bounced never suppressed anything; the campaign-tracking table it depended on is unreachable dead code (2026-07-17 19:48)

## Fresh-ground discovery

Auditing `src/app/api/webhooks/resend/route.ts` (zero prior test coverage,
zero prior gap-doc mention this session) for the email-side twin of the SMS
STOP/START TCPA gap closed earlier tonight (`client_contacts` secondary
contacts). Found a live CAN-SPAM/deliverability gap plus a much bigger
structural finding underneath it:

1. **`email.complained` (Resend's spam-report event) was never handled at
   all** — not a single line of code referenced it. A client hitting "report
   spam" on any email did nothing: no suppression, no log, nothing. The
   handler's `else { return {ok:true} }` silently dropped it every time.
2. **`email.bounced` only ever updated a `campaign_recipients` row looked up
   by `resend_email_id`.** Tracing where `resend_email_id` gets written
   turned up migration `070_campaign_recipients_resend_tracking_columns.sql`
   (an earlier session's own work) — its comment already documents that the
   *columns* were added but the *write path* was "a separate, deliberately
   deferred follow-up." Tracing further: **that write path was never going
   to matter anyway**, because the UI's actual Send button
   (`src/app/dashboard/campaigns/[id]/page.tsx` → `POST
   /api/campaigns/${id}/send` → `campaigns/[id]/send/route.ts`) calls
   `sendEmail()`/`sendSMS()` directly and **never creates a
   `campaign_recipients` row at all**. The *other* route that does create
   tracking rows (`/api/campaigns/send`, with `notify()` + per-recipient
   rows + a retry-failed `PUT`) has **zero UI callers** — grepped the whole
   `src/` tree, only a doc reference and its own test file mention it. It's
   fully-built, fully-wired, and completely unreachable from the product.
   Migration 071's `telnyx_message_id` is the identical gap on the SMS side.

Net effect before this fix: for every real campaign or transactional client
email sent through the live UI, a spam complaint or a hard bounce (Resend's
own event-type docs: "the recipient's mail server **permanently** rejected
the email" — not a transient bounce) never stopped anything. The same
client kept receiving every future marketing send indefinitely.

## Fix (file-only, no push/deploy/DB)

Decoupled the suppression logic entirely from the dead `campaign_recipients`
join, so it works regardless of which send route (live or dead) sent the
email:

- **`src/lib/email.ts`** — `sendEmail()` takes an optional `tags?: {name,
  value}[]`, passed through to `client.emails.send()`. Resend echoes tags
  back verbatim on every webhook event (`data.tags`), confirmed against
  Resend's own example payload (fetched their docs to confirm the exact
  field shape, not guessed) and their tag-value charset (ASCII letters,
  digits, `_`, `-` — UUIDs fit).
- **`src/lib/notify.ts`** — every client-recipient email (`recipientType:
  'client'`) is now tagged with `{tenant_id, client_id}` at send time. This
  is additive-only (`tags` is optional, zero effect on the other 120
  `notify()` call sites). Also captures the provider's own message id
  (`sendEmail()`'s `data.id`, `sendSMS()`'s `data.data.id` — confirmed the
  Telnyx nesting against `nycmaid/sms.ts`'s existing extraction pattern) as
  a new additive `providerMessageId` field on `notify()`'s return value —
  unused by this fix directly, but restores the capability the 070/071
  migrations' deferred wiring was aiming for, for any future caller that
  does track via `campaign_recipients`.
- **`src/app/api/campaigns/[id]/send/route.ts`** (the actual live send
  path) — tags its direct `sendEmail()` call the same way, since it bypasses
  `notify()` entirely.
- **`src/app/api/webhooks/resend/route.ts`** — new handling for
  `email.complained` and `email.bounced`: reads `data.tags.tenant_id` /
  `data.tags.client_id`, sets `clients.email_marketing_opt_out = true` +
  `email_marketing_opted_out_at`, tenant-scoped (`.eq('id',
  clientId).eq('tenant_id', tenantId)` — never trusts the id alone), and
  writes an audit row to `marketing_opt_out_log` (same table
  `/api/unsubscribe` already uses), with distinct `method` values
  (`email_complaint` / `email_bounce`) so an audit trail can show *why* a
  client got suppressed, not just that they did. Missing tags → warns and
  no-ops, doesn't crash. The existing (still-dead-for-real-traffic)
  `campaign_recipients` delivered/opened/bounced tracking block is
  untouched — left as-is, doesn't conflict with the new tag-based path.
- **`src/lib/migrations/072_marketing_opt_out_log_email_bounce_complaint_methods.sql`**
  (new, prepared-not-applied) — `marketing_opt_out_log.method`'s CHECK
  constraint (migration 050) only allows `'email_link' | 'sms_stop' |
  'admin'`. Neither new value fit, and — flagged in the migration's own
  comment — there's schema-history ambiguity about whether that CHECK is
  even live (migration 007 created the same table earlier, without a CHECK,
  and a duplicate `CREATE TABLE IF NOT EXISTS` in 050 would have been a
  no-op if 007 ran first; no live Supabase env in this worktree to confirm
  which shape is actually deployed). Written to be correct under either
  case: `DROP CONSTRAINT IF EXISTS` then re-`ADD CONSTRAINT` under
  Postgres's standard auto-generated name for an unnamed inline CHECK.

## Verification

- `tsc --noEmit --pretty false`: 0 new errors (5 pre-existing baseline
  errors elsewhere, unchanged — admin-auth route typing, two cron test
  files' spread-argument typing, sunnyside-clean-nyc's site-nav.ts import
  names).
- `eslint` on all 6 touched/new TS files: 0 errors, only pre-existing-style
  warnings (underscore-prefixed unused mock args, already this repo's
  convention; two unrelated unused-import warnings already present in
  `notify.ts` before this change).
- New tests: `notify.test.ts` (+4 new cases: client emails get tagged,
  admin/team-member emails do NOT get tagged, SMS provider id capture using
  the real nested Telnyx shape; +1 existing assertion updated for the new
  additive `providerMessageId` field), `route.resend-tags.test.ts` (new file
  — the live campaign-send route tags outbound email; an already-opted-out
  client is never sent to or tagged),
  `route.complaint-bounce-suppression.test.ts` (new file, first-ever test
  coverage for `webhooks/resend/route.ts` — complaint suppresses + logs,
  bounce suppresses + logs with a distinct method, tenant-scoping isolation
  (a different tenant's client sharing the same email address is
  untouched), untagged events no-op without crashing, an unrelated event
  type (`email.opened`) is provably not touched by the new path).
- Full targeted suite (`notify`, `campaigns/**`, `webhooks/resend`,
  `webhooks/telnyx`): 61 passed, 0 regressions.
- RED-confirmed all three files: `git diff` of the 4 touched non-test files
  saved to a patch, `git apply -R` to revert (not `git stash` — shared
  `.git` dir across all 4 workers, flagged in this session's own prior gap
  docs), re-ran the 3 test files — 5 failures in `notify.test.ts` (clean
  expected-vs-received diffs, e.g. missing `tags`/`providerMessageId`, not
  import errors), 3 failures across the other two files (`campaign_recipients`
  suppression assertions correctly false, tags correctly `undefined`) — a
  total of 8 genuine RED failures across all three new/changed test
  surfaces, confirming the tests actually exercise the fix. `git apply` to
  restore, re-ran — all 33 relevant tests GREEN.

## Not fixed / flagged, not touched — this is the bigger finding

- **Two parallel, functionally-different campaign-send implementations
  exist**, and the one with recipient-level tracking, delivery-status
  aggregation, and retry-failed support (`/api/campaigns/send`, `PUT` for
  retry) is **completely unreachable from the product UI**. The one the UI
  actually calls (`/api/campaigns/[id]/send`) has none of that — no
  `campaign_recipients` rows, no per-recipient delivered/opened/bounced
  status, no retry mechanism, no `campaigns.total_recipients` /
  `sent_count` (it only ever sets `recipient_count`). This is a
  product/architecture decision for Jeff, not something to unilaterally
  merge or redirect — flagging with full detail rather than guessing which
  route should win. If the tracking route is meant to become live, migrations
  070/071's "deferred follow-up" (capturing `resend_email_id` /
  `telnyx_message_id` at send time so the campaign_recipients join actually
  resolves) is still open and would need to target whichever route survives.
- Did not touch `src/lib/nycmaid/email.ts` — a second, separate `sendEmail`
  implementation (positional args, not the shared `src/lib/email.ts`) used
  by the nycmaid-specific code path. If it sends client-facing marketing
  email outside campaigns, it doesn't carry these attribution tags either.
  Not audited this pass — flagging as an adjacent surface, not expanding
  scope into it unasked.
- Did not extend suppression to non-marketing (transactional) email —
  `email_marketing_opt_out` only gates campaign/marketing sends by existing
  convention (per `campaigns/[id]/send/route.ts` and `/api/campaigns/send`
  both already checking it); a hard bounce or spam complaint does NOT stop
  booking confirmations, payment receipts, etc. through this fix. Debatable
  whether a hard-bounced address should also stop transactional mail (a
  truly dead address won't receive either), but that's a different
  suppression semantic than "marketing opt-out" and out of scope for this
  pass — flagging, not deciding.
- Left the existing `campaign_recipients`-based delivered/opened/bounced
  tracking block in `webhooks/resend/route.ts` exactly as-is (still a
  no-op for real traffic via the live send route, per the finding above) —
  did not remove it or attempt to fix its join, since doing so productively
  requires the architecture decision above.
- tenant_domains schema lane reconfirmed intact, no drift (043/055/056/059/
  068/069/072 — 072 is this pass's own new migration, unrelated table).

File-only. No push/deploy/DB.
