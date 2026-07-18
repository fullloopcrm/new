# W4 gap/fluidity checkpoint — 2026-07-18 04:44

Per the 04:38 LEADER order's 3-deep queue.

## This pass

1. Fresh-ground surface: the 04:28 checkpoint's own "next-target candidate"
   — extend the systematic (not sampled) TOCTOU sweep from the just-fixed
   public `/public/[token]` view routes to their **staff-authenticated**
   siblings on the same status-mutating surface (bookings, jobs, deals,
   invoices, quotes). Read every `bookings/[id]*`, `jobs/[id]*`,
   `deals/[id]*`, `invoices/[id]`, and `quotes/[id]` handler end-to-end
   (not grep-sampled) looking for the "read status via plain SELECT, branch
   in JS, write unconditionally" shape.
   - `bookings/[id]/route.ts` (PUT/DELETE), `bookings/[id]/status/route.ts`,
     `bookings/[id]/reset/route.ts`, `jobs/[id]/route.ts` (PATCH),
     `deals/[id]/stage/route.ts` — **all already atomic-claim/CAS-guarded**
     from earlier passes this session (each carries an explicit "Atomic
     re-check" / "Atomic claim" comment citing the same pattern).
   - `invoices/[id]/route.ts` (PATCH, DELETE/void) and `quotes/[id]/route.ts`
     (PATCH, DELETE) were **not** — genuine, previously-unaddressed bug,
     same class as the public-token routes fixed in the prior checkpoint's
     pass but on the staff-facing siblings:
     - `invoices/[id]` PATCH read `existing.status`, rejected edits on
       paid/partial/void/refunded invoices, then wrote the edit
       unconditionally — a concurrent Stripe webhook marking the invoice
       `paid` in the read-write gap let the edit through anyway, silently
       rewriting line items/totals on an already-paid invoice.
     - `invoices/[id]` DELETE (void) read status + amount_paid_cents,
       rejected already-void/refunded/paid invoices, then wrote the void
       unconditionally — a concurrent payment landing in the gap let the
       void through on an invoice that just got paid, no refund
       reconciliation.
     - `quotes/[id]` PATCH read `existing.status`, rejected edits on
       accepted/converted quotes, then wrote unconditionally — a concurrent
       customer `accept()` in the gap let the edit through, silently
       rewriting line items/totals/deposit on a just-accepted quote
       (possibly after a deposit was already paid against the pre-edit
       total).
     - `quotes/[id]` DELETE read status, rejected accepted/converted, then
       deleted unconditionally — a concurrent accept() in the gap let the
       delete destroy a quote the customer just accepted, with a
       deposit-checkout flow possibly already in progress against it.
   - Fixed all four with the same `.eq('status', existing.status)` +
     `.maybeSingle()` compare-and-swap pattern used throughout this
     session, returning 409 on a lost race instead of silently clobbering.
2. Continued the surface: also read `team-portal/jobs/{claim,reassign,
   release}`, `finance/periods/[id]`, `team-applications/bulk-approve`,
   `documents/[id]/duplicate`, and `reviews/[id]` for the same shape.
   - `team-portal/jobs/claim` and `team-applications/bulk-approve` already
     atomic-claim-guarded (first-writer-wins via `.is(...)`/re-checked
     `.eq('status','pending')` in the UPDATE's own WHERE).
   - `finance/periods/[id]` PATCH and `reviews/[id]` PUT write status
     fields with **no prior read at all** — no read-write gap exists to
     race, so no TOCTOU (a genuine last-write-wins concurrent-edit
     footgun for periods/reviews, but that's a different, much lower-
     severity class — not fixed, not flagged as a real finding).
   - `documents/[id]/duplicate` reads `src.status` only to decide whether
     to stamp `voided_from` on a brand-new row it's creating — never
     writes back to the source row conditioned on that read, so no race.
3. Gap/fluidity: this file.

## Verification

- 2 new race test files (`invoices/[id]/route.status-race.test.ts`,
  `quotes/[id]/route.status-race.test.ts`), 8 tests total (2 clobber-
  prevention + 2 no-regression per route, PATCH and DELETE each). RED
  confirmed pre-fix via `git diff` + `git apply -R` / `git apply` (not
  `git stash` — disabled in worker worktrees, all 4 share one stash stack)
  for all 4 clobber-prevention cases; GREEN confirmed post-fix, 8/8.
- Fixing the routes to call `.maybeSingle()` instead of `.single()` broke
  2 pre-existing test files (`invoices/[id]/route.client-scope.test.ts`,
  `quotes/[id]/route.client-scope.test.ts`) whose hand-rolled Supabase mock
  only implemented `.single()`, not `.maybeSingle()` — added `maybeSingle()`
  support to both mocks (additive only, no assertion changes).
- `npx vitest run src/app/api/invoices src/app/api/quotes` — 26 files / 71
  tests pass.
- `npx tsc --noEmit` — no new errors (same 2 pre-existing baseline errors
  in `sunnyside-clean-nyc/_lib/site-nav.ts` only).
- Full suite: 677/678 files, 2384/2387 tests passed (+ 1 expected-fail + 1
  skipped). 1 pre-existing failure, confirmed unrelated and already
  documented as RED-until-fixed:
  `cron/tenant-health/status-coverage-divergence.test.ts`. The other
  intermittent failure noted in the 04:28 checkpoint
  (`cron/generate-recurring/route.duplicate-occurrence-race.test.ts`) did
  not reproduce this run — consistent with the "flaky under full-suite
  parallel load" note, not a regression.
- 1 commit: `344f585e` (invoices+quotes staff-side race fix, 4 handlers, 2
  new test files, 2 mock fixes).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0428 checkpoint — re-list only, no new status. See
`w4-gap-fluidity-checkpoint-2026-07-18-0428.md` for the full list
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
(RBAC-granularity, not a security fix), the still-generated-but-never-
consumed `team_member_token`/`cleanerToken` on bookings (dead code,
harmless), and the `bookings/[id]/team` PUT double-booking gap (staff-
facing business-logic gap, not a security finding — flagged for Jeff's
call, not fixed).

## New aging items opened this pass

- `finance/periods/[id]` PATCH and `reviews/[id]` PUT both write
  status-like fields with no read-then-branch at all, so two concurrent
  PATCHes (e.g. two admins independently locking/reopening the same
  accounting period, or two review-status updates racing) is plain
  last-write-wins with no read-write gap to exploit — not a security
  finding, but a data-integrity footgun worth a product call. Lower
  priority than the fixed invoices/quotes bugs since these lack the
  "customer/webhook can move the row to a value that makes the write
  actively harmful" property that made those real. Flagged, not fixed.

## Next-target candidates if continuing fresh-ground hunting

- The staff-authenticated status-mutating surface for the core
  booking/job/deal/invoice/quote domain is now closed (bookings, jobs,
  deals, invoices, quotes, team-portal claim, bulk-approve all either
  already-guarded or freshly fixed this pass). Worth extending the same
  systematic treatment to the **admin/** surface next — specifically
  `admin/businesses/[id]`, `admin/prospects/[id]`, `admin/tenants/[id]`,
  `admin/recurring-schedules/[id]` (exception/pause already covered per
  earlier commits, PATCH main route not yet re-verified this session),
  and `campaigns/[id]` — none of these were read this pass.
- Alternatively, revisit the `bookings/[id]/team` double-booking gap or
  the finance/periods + reviews last-write-wins footgun noted above if
  Jeff confirms either is worth a fix.

No push/deploy/DB this pass.
