# W4 — deals PATCH financial-lock guard + job-session status-regression guard — 2026-07-18 05:28

Per the 05:11 LEADER order's 3-deep queue: (1) fresh-ground surface, (2)
continue whatever it opens up, (3) keep gap/fluidity current.

## This pass

Continued the "PUT/PATCH lacks the guard its sibling DELETE/POST already has"
pattern-search the 05:05 checkpoint named as its next-target candidate:
`documents/[id]`, `deals/[id]`, `team-applications/[id]`.

1. **`documents/[id]` PATCH — confirmed clean.** Already CAS-guards on
   `.eq('status', 'draft')`, matching DELETE's own guard exactly (both cite
   the same "void first and duplicate" rationale). Nothing to fix.
2. **`team-applications/[id]` — doesn't exist as a resource route.** Only
   `team-applications/route.ts` (collection-level) and `bulk-approve/` exist;
   no per-id PUT/DELETE pair to compare. Not applicable.
3. **`deals/[id]` PATCH — genuine, previously-unaddressed bug, fixed.**
   `DELETE /api/deals/[id]` already blocks hard-deleting a deal once it
   carries real revenue history (stage `'sold'`, or a linked quote that's
   accepted/deposit-paid/converted — `checkDealDeletable`, comment cites the
   `deal_activities` cascade-delete audit-trail risk). `PATCH` had **zero**
   equivalent guard: any `sales.edit`-permitted tenant user could silently
   rewrite `value_cents`/`client_id` on that same closed deal —
   misattributing already-collected revenue to a different client, or
   diverging the reported deal value from what actually sold — with no audit
   trail and no way to reconcile it afterward. Same bug class as the
   `campaigns/[id]` and `finance/expenses/[id]` fixes earlier this session,
   just on the deals resource.
   - Fix gates only on an *actual* change to `value_cents`/`client_id` (not
     mere field presence): the dashboard's save form
     (`pipeline/[id]/page.tsx`) always resends the current `value_cents`
     alongside notes/follow-up edits in one PATCH, so a presence-based gate
     would have broken ordinary post-sale note-taking. Confirmed via a repo
     grep that no dashboard call ever sends `client_id` through PATCH at all
     (only set at deal creation), so blocking it post-sale has zero UX
     impact.
   - Reuses `checkDealDeletable` directly (DRY — one source of truth for
     "this deal has closed real revenue") rather than re-deriving the
     sold/real-quote-history logic inline.
   - Atomic CAS (`.neq('stage', 'sold')`) added to the update's own WHERE
     when the write touches either financial field, closing the direct
     stage-flip race window between the guard read and the write. The
     quote-side signal (accepted/deposit-paid/converted) can't be
     conditioned in the same single-table UPDATE statement, so a narrower
     residual race remains there — a quote being accepted in the exact
     window between the guard read and the write completing. Flagged, not
     closed; same class of best-effort-atomicity note as other cross-table
     guards this session.
4. **Continuing the surface**, swept the other three `*-delete-guard.ts`
   families for the same shape (`booking-delete-guard`, `client-delete-guard`,
   `team-member-delete-guard`):
   - `bookings/[id]` PUT — already has its own dedicated, well-guarded
     atomic-CAS status lock blocking `completed`/`paid` → `cancelled`
     (pre-existing, matches `booking-delete-guard`'s own rationale
     word-for-word). Clean, nothing to fix.
   - `clients/[id]` PUT — no revenue-bearing fields in its assignable set
     (name/email/phone/address/status/source/notes/preferred_team_member_id/
     sms_consent); `client-delete-guard` protects against cascade-destroying
     *related* rows on hard-delete, not against a field on the client's own
     row being rewritten. Not the same bug shape — clean.
   - `cleaners/[id]` PUT / `team/[id]` PUT — `pay_rate_cents`/`hourly_rate`
     are forward-looking config for future jobs, not a rewrite of any
     already-recorded payroll/payout row. Not the same bug shape — clean.
   - **`jobs/[id]/sessions/[sessionId]` PATCH — second genuine bug, fixed.**
     This route's own header comment already documents that it "hard-deletes
     the same `bookings` row through a different entry point" as
     `DELETE /api/bookings/[id]` and reuses `checkBookingDeletable`
     accordingly for its own DELETE. But its **PATCH** writes the identical
     `bookings.status` column through a third door with no equivalent guard
     at all: `PATCH {status:'cancelled'}` on a session already `'completed'`
     (or `'paid'`) sailed through unconditionally — no check, no CAS, nothing
     — silently un-completing a session whose completion may have already
     fired `releasePaymentsForEvent` (a real stage-gated payment release).
     This is exactly the class `bookings/[id]` PUT's own guard exists to
     prevent ("no downstream reconciliation — payroll team_pay, referral
     commission clawback — anywhere in this codebase"), just reachable
     through the job-session door instead. Fixed by mirroring that same
     guard here (block any status change away from `'completed'`/`'paid'`
     while the session is currently in one of those states) plus an atomic
     CAS (`.not('status','in','(completed,paid)')`) on the write itself,
     closing the race window between the `loadOwnedSession` read and the
     write — same pattern the file already uses for its own completion
     claim.

## Verification

- New test `route.sold-deal-financial-lock.test.ts` (7 tests: open-deal
  free edit, sold-deal note edit that resends the unchanged value, blocked
  value_cents change on Sold, blocked client_id change on Sold, blocked
  value_cents change with an accepted linked quote (pre-Sold), allowed
  non-financial edit on that same quoted deal, 404 on missing). RED
  confirmed pre-fix via `git diff` + `git apply -R` on `route.ts` alone (4/7
  failing — the two 409s, plus the 404 case since the old code threw to 500
  on a missing row via `.single()`); GREEN post-fix.
- New test `route.completed-status-regression-guard.test.ts` (5 tests:
  blocks completed→cancelled, blocks paid→pending, allows a non-status note
  edit on a completed session, allows an open session to cancel normally,
  allows idempotent re-confirm of completed→completed). RED confirmed
  pre-fix on `route.ts` alone (2/5 failing — the two blocking assertions);
  GREEN post-fix.
- Extended two existing hand-rolled Supabase mocks to support the new query
  shapes (additive only, no assertion changes, same pattern as prior
  checkpoints): `route.client-scope.test.ts` (deals) gained `neq`/
  `maybeSingle`; `route.status-idempotent.test.ts` (job sessions) gained
  `.not(col,'in',...)` support plus an array-returning `.select()` path for
  the update-without-`.single()` shape the new CAS uses.
- `npx vitest run "src/app/api/deals/[id]/"` — 4 files / 17 tests pass.
- `npx vitest run "src/app/api/jobs/[id]/sessions/[sessionId]/"` — 5 files /
  21 tests pass.
- `npx vitest run "src/app/api/bookings/" "src/app/api/jobs/" "src/lib/booking-delete-guard" "src/lib/deal-delete-guard" "src/app/api/deals/"`
  — 49 files / 174 tests pass (broader blast-radius check for both fixes).
- `npx tsc --noEmit` — no new errors (same 2 pre-existing baseline errors in
  `sunnyside-clean-nyc/_lib/site-nav.ts` only, unchanged from prior
  checkpoints).
- Full suite: 680/682 files, 2403/2407 tests passed (+1 expected-fail +1
  skipped). Same 2 pre-existing aging failures as every prior checkpoint,
  neither touched by this change: `cron/tenant-health/status-coverage-divergence.test.ts`
  (RED-until-fixed, documented) and
  `cron/generate-recurring/route.duplicate-occurrence-race.test.ts`
  (previously noted as flaky under full-suite parallel load).
- 2 commits (one per fix, matching session convention).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0505 checkpoint's list — see that file for the full
inventory (create-tenant-from-lead atomic-claim migration, referrers
atomic-bump migrations, clients dedup unique indexes,
admin/cleanup-test-bookings name-collision, comhub_get_or_create_contact_by_email
TOCTOU, post-labor.ts entity_id design question, categorization_patterns
semantics, team-portal photo-upload unwired, comhub-email cron unread_count,
CSRF-on-GET, 4 dead clone email-templates files, nycmaid sms-templates dead
exports, post-adjustments.ts inert check, rate_limit_check_and_record atomic
RPC, inbound_emails dead storage, notify-cleaner.ts dead code, campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports, notify()'s
latent `channel:'push'` no-op, comhub voice admin_phone/transfer-target
whitelisting, invoices/quotes/documents do_not_service product question,
sendPushToTeamMember/AllTeamMembers do_not_service applicability, the 0844
indirect-prompt-injection finding on `agent.ts`/`tools.ts`, the `/api/yinez`
residual unverified-tenant edge and self-reported-phone-establishes-client-identity
items, the `cleaners` vs `team_members` ID-space mismatch, `client/confirm/[token]`
dead code, the `telegram_webhook_events` pruning cron (not wired), Jefe's
non-refund owner tools lacking per-tool idempotency keys, `lead-media/signed-url`'s
32-bit random path entropy note, the `leads/block`/`leads/verify`
`leads.view`-tier write-gate observation, the still-generated-but-never-consumed
`team_member_token`/`cleanerToken` on bookings, the `bookings/[id]/team` PUT
double-booking gap, `finance/periods/[id]` PATCH / `reviews/[id]` PUT's
last-write-wins footgun, `admin/prospects/[id]` PATCH `approve`'s missing
re-approve guard, and `campaigns/send/route.ts` dead-code duplicate send
implementation.

## New aging items opened this pass

- `deals/[id]` PATCH's financial-lock guard has a narrow residual race: the
  quote-side signal (accepted/deposit-paid/converted) in `checkDealDeletable`
  can't be conditioned atomically in the same single-table UPDATE the way the
  `stage` column can. A quote getting accepted in the exact window between
  the guard read and the write completing could still let a stale
  value_cents/client_id edit through. Much narrower than the bug just fixed
  (which had zero guard at all); flagged as a residual, not closed.

## Next-target candidates if continuing fresh-ground hunting

- The full `*-delete-guard.ts` family sweep is now closed out (booking,
  client, deal, team-member all checked this pass; deals PATCH and job-session
  PATCH were the only two real findings — bookings/[id] PUT and clients/[id]
  PUT and cleaners|team/[id] PUT are all already clean or not the same bug
  shape).
- Worth a fresh angle next: grep for other tables with more than one write
  door (a dedicated `[id]` PUT/PATCH plus a nested sub-resource route writing
  the same status/amount column) beyond the four guard families already
  swept — `invoices`/`quotes` have several nested subroutes
  (`invoices/[id]/payment`, `quotes/[id]/accept`, etc.) that may share this
  same "two doors, one guarded" shape without going through a
  `*-delete-guard.ts` helper at all.

No push/deploy/DB this pass.
