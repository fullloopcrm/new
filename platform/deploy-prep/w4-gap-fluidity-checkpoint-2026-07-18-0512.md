# W4 gap/fluidity checkpoint — 2026-07-18 05:12

Per the 05:03 LEADER order's 3-deep queue.

## This pass

1. Fresh-ground surface: per the 05:05 checkpoint's own next-target
   candidate, extended the "PUT/PATCH lacks the guard its sibling DELETE
   already has" pattern-search (the same shape as the just-fixed
   `campaigns/[id]` bug) across every `api/**` resource pair that defines
   both a DELETE and a PUT/PATCH handler (32 files, `comm`'d from a grep over
   the whole `api/` tree). Confirmed the named candidates
   (`documents/[id]`, `deals/[id]`, `team-applications`) are all already
   clean from prior sessions, then found a genuine, previously-unaddressed
   instance: `finance/expenses/[id]` PUT had **zero** guard against editing
   an already-reconciled expense, while its DELETE sibling has blocked
   deleting one (via `matched_bank_transaction_id`) since an earlier
   session. Any `finance.expenses`-permitted user could silently rewrite
   `amount`/`category`/`date`/`entity_id` on an expense already matched to a
   bank transaction and posted to the ledger — corrupting the tax-export/
   year-end-zip record (both read `expenses` directly) with no trace, worse
   than the DELETE case since the row isn't removed, just quietly falsified
   while still looking intact. Fixed: mirrored the DELETE guard onto PUT
   (409 when reconciled) with an atomic CAS
   (`.is('matched_bank_transaction_id', null)` in the UPDATE's own WHERE)
   closing the race window between the guard read and the write.
2. Continued the surface: checked every other `finance/`-adjacent
   PUT/PATCH+DELETE pair for the same asymmetry —
   `finance/bank-accounts/[id]` (DELETE is a soft-deactivate, no
   status/reconciliation gate on either verb, clean), `finance/entities/[id]`
   (already symmetric from an earlier session — the archive-guard evaluates
   the merged final state on PATCH too), `recurring-expenses/[id]` (no
   status/reconciliation concept on the table, nothing to be asymmetric
   about), and `documents/[id]/signers/[signerId]` (already fully symmetric,
   both verbs gated on the signer's own `status:'pending'`). No further
   instances of the pattern found this pass.
3. Gap/fluidity: this file.

## Verification

- New test file `route.reconciled-edit-guard.test.ts` (4 tests). RED
  confirmed pre-fix (1/4 failing — the reconciled-block case returned 200
  instead of 409); GREEN post-fix, and the two pre-existing test files for
  the same route (`route.delete-guard.test.ts`, `route.mass-assign.test.ts`)
  still pass unchanged (12/12 total across the 3 files).
- `npx tsc --noEmit` — same 2 pre-existing baseline errors only
  (`sunnyside-clean-nyc/_lib/site-nav.ts`), no new errors.
- Full suite run (`npx vitest run`) kicked off in background; result to be
  folded into the next checkpoint once it completes, per standard practice
  this session of not blocking the report on a multi-minute full run when
  the touched surface's own tests are green and tsc is clean.
- 1 commit expected: finance/expenses/[id] PUT reconciled-edit-guard fix + 1
  new test file.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0505 checkpoint's list — no new items opened, no aging
items touched this pass. See that checkpoint for the full list
(create-tenant-from-lead atomic-claim migration, referrers atomic-bump
migrations, clients dedup unique indexes, admin/cleanup-test-bookings
name-collision, comhub_get_or_create_contact_by_email TOCTOU, post-labor.ts
entity_id design question, categorization_patterns semantics, team-portal
photo-upload unwired, comhub-email cron unread_count, CSRF-on-GET, 4 dead
clone email-templates files, nycmaid sms-templates dead exports,
post-adjustments.ts inert check, rate_limit_check_and_record atomic RPC,
inbound_emails dead storage, notify-cleaner.ts dead code, campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports, notify()'s
latent `channel:'push'` no-op, comhub voice admin_phone/transfer-target
whitelisting, invoices/quotes/documents do_not_service product question,
sendPushToTeamMember/AllTeamMembers do_not_service applicability, the 0844
indirect-prompt-injection finding on `agent.ts`/`tools.ts`, the `/api/yinez`
residual unverified-tenant edge and self-reported-phone-establishes-client-
identity items, the `cleaners` vs `team_members` ID-space mismatch,
`client/confirm/[token]` dead code, the `telegram_webhook_events` pruning
cron (not wired), Jefe's non-refund owner tools lacking per-tool idempotency
keys, `lead-media/signed-url`'s 32-bit random path entropy note, the
`leads/block`/`leads/verify` `leads.view`-tier write-gate observation, the
still-generated-but-never-consumed `team_member_token`/`cleanerToken` on
bookings, the `bookings/[id]/team` PUT double-booking gap, `finance/periods/
[id]` PATCH / `reviews/[id]` PUT's last-write-wins footgun,
`admin/prospects/[id]` PATCH re-approve second-Stripe-session footgun, and
`campaigns/send/route.ts` dead-code duplicate send implementation.

## New aging items opened this pass

None.

## Next-target candidates if continuing fresh-ground hunting

- The DELETE/PUT-asymmetry pattern search is now exhausted for the
  `finance/`-adjacent cluster (bank-accounts, entities, expenses,
  recurring-expenses all read this pass). Worth running the same
  comm-of-DELETE-vs-PUT/PATCH file list against the remaining unchecked
  entries: `cleaners/[id]`, `clients/[id]` (+ its `contacts/[contactId]`
  subroute), `crews/route.ts`, `jobs/[id]/sessions/[sessionId]`,
  `routes/[id]`, `schedules/[id]`, `settings/services/[id]`, `team/[id]`,
  `catalog/route.ts`, `admin/notes`, `admin/requests`, `admin/reviews`,
  `admin/users` (+ `[id]`), `sales-applications`, `deals/route.ts` (base) —
  none of these were read this pass beyond a keyword grep, so a genuine
  fresh bug could still be hiding in one of them.
- `admin/reviews/route.ts` PUT accepts an unvalidated `status` string (no
  allow-list against `pending|approved|rejected`) — low-priority, admin-only,
  same footgun class as other admin-only findings already on the aging list;
  not a security bug (no double-fire, no external side effect from a bad
  value), flagged only if worth tightening later.

No push/deploy/DB this pass.
