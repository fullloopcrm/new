# W4 gap/fluidity checkpoint — 2026-07-18 04:28

Per the 04:19 LEADER order's 3-deep queue.

## This pass

1. Fresh-ground surface: the systematic TOCTOU/race-condition sweep flagged
   open at 04:12 (previously only sample-checked, never done exhaustively).
   Grepped every `src/app/api/**/public/**/route.ts` for `.update(` and read
   each one. Found a real, previously-unaddressed bug class present in
   **three** separate public GET routes: `invoices/public/[token]`,
   `quotes/public/[token]`, and `documents/public/[token]` all
   opportunistically bump status (`sent`→`viewed`, `overdue`, `expired`) as a
   side effect of rendering a page view, and all three wrote that status
   **unconditionally** after reading it — no compare-and-swap. A concurrent
   terminal-status change landing in the read→write gap (a Stripe webhook
   marking an invoice `paid`, a signer's atomic `accept()` on a quote, a
   `sign()`/`decline()`/`void()` on a document — all of which already use
   proper atomic claims) got silently clobbered back to
   `viewed`/`overdue`/`expired` by the GET. Real-world trigger: customer
   opens the invoice/quote/document link in one tab, pays/signs in another,
   then a stray reload or background poll on the first tab stomps the
   just-confirmed terminal status back to non-terminal. Fixed all three with
   the same compare-and-swap-on-read-status pattern the sibling
   accept/decline/sign routes already use (view-tracking fields split out as
   an unconditional write since they never conflict; the status transition
   guarded with `.eq('status', <value just read>)`, with a re-fetch-on-lost-
   race fallback on invoices/quotes so the response reflects the row's real
   current status rather than a stale guess).
2. Continued the surface: checked the remaining public-token
   status-mutating routes for the same class —
   `documents/public/[token]/decline` and `quotes/public/[token]/accept` /
   `decline` were already correctly guarded (explicit precedent this
   session's earlier work established); `documents/public/[token]/consent`
   never touches `status` at all, no clobber risk, left as-is. Also swept
   `bookings/[id]/team` (staff-facing double-assignment) and
   `client/book`'s same-date duplicate gate — the latter already has a
   proper DB unique-constraint + `23505` catch for its race; the former has
   no overlap/double-booking guard but is an authenticated-staff business-
   logic gap, not a security finding, so left as a Noticed item rather than
   fixed (see below).
3. Gap/fluidity: this file. Also discovered and fixed a verification-debt
   gap while investigating: 3 regression test files from earlier fixes this
   session (`documents/public/[token]/sign/route.void-race.test.ts`,
   `route.voided-doc-block.test.ts`, and
   `team-members/[id]/stripe-onboard/route.claim-race.test.ts`) were written
   and verified passing at the time but never `git add`ed — confirmed still
   GREEN against the already-committed fixes and committed them.

## Verification

- 3 new race-condition test files (`invoices/public/[token]/route.race.test.ts`,
  `quotes/public/[token]/route.race.test.ts`,
  `documents/public/[token]/route.race.test.ts`), 6 tests total. RED
  confirmed pre-fix for all 3 (via `git stash` of just the route.ts change +
  rerun), GREEN confirmed post-fix.
- `npx vitest run src/app/api/invoices src/app/api/quotes src/app/api/documents src/app/api/team-members` — 35 files / 92 tests pass (first commit); documents alone re-verified 9/9 files / 25/25 tests after the third fix.
- `npx tsc --noEmit` — no new errors (2 pre-existing baseline errors in
  `sunnyside-clean-nyc/_lib/site-nav.ts` only, confirmed present on the
  unmodified baseline every prior pass this session).
- Full suite: 673/675 files, 2373/2377 tests passed. 2 pre-existing failures,
  both confirmed unrelated: `cron/tenant-health/status-coverage-divergence.test.ts`
  (documented RED-until-fixed invariant test) and
  `cron/generate-recurring/route.duplicate-occurrence-race.test.ts` (a file I
  never touched — re-ran in isolation and it also failed there, consistent
  with the "flaky under full-suite parallel load" note from the 02:53/04:00
  checkpoints, not a regression from this pass).
- 2 commits: `6da08039` (invoices+quotes fix, 3 tests, + the 3 orphaned tests
  from earlier), `93972808` (documents fix, 1 test).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0313 checkpoint — re-list only, no new status. See
`w4-gap-fluidity-checkpoint-2026-07-18-0313.md` for the full list
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
voice/control target whitelisting, 4 dead sendPushToClient exports,
notify()'s latent `channel:'push'` no-op, comhub voice admin_phone/
transfer-target whitelisting, invoices/quotes/documents do_not_service
product question, sendPushToTeamMember/AllTeamMembers do_not_service
applicability, the 0844 indirect-prompt-injection finding on
`agent.ts`/`tools.ts` (still flagged, architectural, needs Jeff's call),
the `/api/yinez` residual unverified-tenant edge and
self-reported-phone-establishes-client-identity items (both still open,
both flagged for Jeff's call), the `cleaners` vs `team_members` ID-space
mismatch noticed in `cron/phone-fixup`, `client/confirm/[token]` dead code
(`client_confirm_token` column never written anywhere), the
`telegram_webhook_events` pruning cron (not wired), and Jefe's non-refund
owner tools lacking per-tool idempotency keys (lower priority, covered in
practice by webhook-level dedup). Also: `lead-media/signed-url`'s 32-bit
random path entropy note (style observation), the
`leads/block`/`leads/verify` `leads.view`-tier write-gate observation
(RBAC-granularity, not a security fix), and the still-generated-but-never-
consumed `team_member_token`/`cleanerToken` on bookings (dead code, harmless
— noted, not tracked as a bug).

## New aging items opened this pass

- `bookings/[id]/team` PUT (staff-facing, `bookings.edit`-gated) has no
  overlap/double-booking check when assigning a lead or extra team members —
  two staff concurrently assigning the same cleaner to overlapping jobs (or
  one staff member double-booking via a slow UI) is silently allowed. Not a
  security finding (authenticated, tenant-scoped, no escalation) — a
  business-logic/product gap. Flagged for Jeff's call on whether it's worth
  a fix.

## Next-target candidates if continuing fresh-ground hunting

- The public-view-GET status-clobber class is now closed across every
  `public/[token]` route in the app (invoices, quotes, documents all
  checked; portal/auth's own verify-code flow already uses safeEqual +
  atomic mark-used). The systematic TOCTOU sweep turned up real bugs this
  time, unlike the earlier sampled pass — worth extending the same
  systematic (not sampled) treatment to the **staff-authenticated**
  status-mutating routes next (bookings/[id], jobs/[id], deals PUT, etc.) —
  lower severity since they require an authenticated session, but the same
  "read status, branch in JS, write unconditionally" pattern could still be
  present and cause real data-integrity bugs for concurrent staff actions.
- Alternatively, pick up the `bookings/[id]/team` double-booking gap noted
  above if Jeff confirms it's worth fixing.

No push/deploy/DB this pass.
