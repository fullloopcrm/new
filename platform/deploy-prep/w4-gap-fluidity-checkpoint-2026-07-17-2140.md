# Gap/fluidity checkpoint — W4, 2026-07-17 21:40

Per the 21:27 order item 3. File-only, no push/deploy/DB.

## This pass's net change

- Found and committed leftover work from a prior session: the
  `update_booking` cleaner_id FK-leak fix in `src/lib/selena/tools.ts` +
  its 3 tests were sitting uncommitted in the working tree (the 21:13/21:30
  checkpoints both describe this fix as "done" with a writeup file, but the
  actual diff and the writeup itself were never `git add`ed/committed).
  Re-verified before committing: 64/64 `src/lib/selena/` tests pass, `tsc
  --noEmit` shows only the same 3 pre-existing baseline errors. Committed as
  `d83e765d`.
- Fresh-ground hunt (order item 1): picked up both next-target candidates
  named in the 21:30 checkpoint — the full `src/app/api/social/**`
  Facebook/Instagram OAuth+posting surface, and
  `src/app/api/finance/bank-connect/session/**` (Stripe Financial
  Connections) plus the bank-import/bank-transactions surface it pulled
  into. Both fully clean; also swept Google Business OAuth
  (`google/callback`/`google/status`), all 47 cron routes for
  auth-guard consistency (47/47 covered), `apply-ceo` +
  `migrate-cleaner-notifications`/`migrate-sms` +
  `internal/deploy-hook` + `domain-notes`, and did the first genuinely
  exhaustive (not spot-check) pass on `dangerouslySetInnerHTML` (524 call
  sites, not the 154 previously estimated — corrected the count). Full
  writeup:
  `w4-broad-hunt-2026-07-17-2134-social-google-oauth-plus-bank-connect-plus-cron-auth-plus-nyc-classifieds-jsonld-sweep-clean.md`.
- Continued surface (order item 2): also picked up a third carried-over
  lead — `src/app/admin/**` page-level direct-Supabase-call check, flagged
  as "not yet picked up" across the 21:03/21:13/21:30 checkpoints. Found 6
  admin/dashboard pages importing `supabaseAdmin` directly
  (`tenant-health`, `security`, `ai-usage`, `analytics`,
  `dashboard/layout.tsx`, `dashboard/page.tsx`); confirmed all 6 are Server
  Components (no `'use client'`), so `supabaseAdmin` runs server-side only
  and is never shipped to the browser — the pattern this lead worried about
  (client-side calls bypassing the API/auth layer) does not occur anywhere.
  Also specifically checked `admin/security/page.tsx`, which pulls raw
  `stripe_api_key`/`telnyx_api_key`/`resend_api_key` columns — confirmed
  those are only ever reduced to `present`/`encrypted` booleans server-side
  before reaching JSX, never rendered as plaintext. This lead is now
  closed, not just carried forward again.
- No live bug found this pass. A genuinely broad but clean sweep across
  three separate leads that had each been open for multiple checkpoints.

## Verification

`tsc --noEmit`: same 3 pre-existing baseline errors, unchanged (unrelated
to this session — `route.xss.test.ts` mock-typing issue and a
`sunnyside-clean-nyc` site-nav import mismatch). `src/lib/selena/`: 64/64
passing (re-ran after commit). No other code changed this pass, so no
other test suite needed re-running.

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 21:30 checkpoint — re-list only, no new status:
- `create-tenant-from-lead.ts` atomic-claim migration — PROPOSED,
  unapplied, highest real-money blast radius, now well over 24h stale.
- `referrers.total_earned`/`total_paid` atomic-bump migrations —
  PROPOSED 2026-07-16, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's
  product-call pending.
- `comhub_get_or_create_contact_by_email` TOCTOU hardening — still
  blocked on pulling its real live body first.
- `post-labor.ts`/`postDepositToLedger` entity_id design decision —
  needs Jeff/leader input.
- `categorization_patterns` recategorization semantics — open product
  question.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired, companion to
  an unapplied migration.
- `comhub-email` cron's `unread_count` bump — not dug into, low
  priority.
- CSRF-on-GET instances — judged not worth fixing, severity precedent.
- Dead clone `_lib/email-templates.ts` files (4 tenants) +
  `nycmaid/email-templates.ts`'s ~17 dead functions — cleanup candidate,
  pending Jeff's clone-deletion green light.
- `nycmaid/sms-templates.ts`'s 34 dead exports — low-priority cleanup.
- `post-adjustments.ts`'s `postCommissionPayment` doesn't independently
  verify `status !== 'void'` — inert today.
- `agreement.ts`'s HTML `buildAgreement()` — confirmed dead code.
- `admin/campaigns/preview/route.ts`'s `wrapEmail()` — unescaped, dead
  code (no frontend caller).
- `nyc-classifieds` marketplace backend — 18/22 client-called API paths
  have no route; pre-launch (`PreLaunchGate`), needs Jeff to confirm
  live-reachability before deciding build priority.
- SMS-body injection (smishing-style): central dispatch paths clean; a
  full per-caller sweep of all ~60 `sendSMS()` call sites for
  smishing-style content (not markup) remains open — lowest-priority lead
  still standing after this pass's `dangerouslySetInnerHTML` class closed.
- tenant.name HTML-injection class: fully closed, do not return without
  a new signal.
- onConflict/upsert-collision bug class: fully closed (32 sites swept
  16:52-21:30), do not return without a new signal.
- `documents/**` e-sign module: fully hardened, confirmed clean.
- Finance/payroll remains the most exhaustively audited surface this
  session (130+ prior reports now) — do not return without new signal.

## Closed this pass (do not re-open without a new signal)

- `src/app/api/social/**` (Facebook/Instagram OAuth + posting) — fully
  clean.
- `src/app/api/finance/bank-connect/session/**` + bank-import +
  bank-transactions categorization — fully clean, reconfirmed.
- Google Business OAuth (`google/callback`/`google/status`) — fully
  clean.
- Cron-auth guard consistency (47/47 routes) — fully clean.
- `dangerouslySetInnerHTML` — now exhaustively swept (524 sites, corrected
  from the 154 estimate), not just spot-checked. Every non-JSON.stringify
  site traced to either static developer copy or already-escaped JSON-LD.
- `src/app/admin/**` page-level direct-Supabase-call check — closed, no
  client-side DB bypass exists anywhere in admin/dashboard.
- `apply-ceo`, `migrate-cleaner-notifications`, `migrate-sms`,
  `internal/deploy-hook`, `domain-notes` — all individually read, clean.

## Next-target candidates if continuing fresh-ground hunting

- SMS-body smishing-content sweep (~60 `sendSMS()` call sites) — the one
  remaining open lead from the 21:30 checkpoint; content-moderation
  judgment call rather than a classic injection, lower priority than the
  items just closed.
- Beyond that, no specific untouched live-code lead is currently flagged.
  A future fresh-ground pass should re-survey the route list
  (`src/app/api/**`, 505 route files) against the deploy-prep report
  corpus for genuinely unread files, the way this pass found
  `apply-ceo`/`domain-notes`/the cron-auth sweep.

No push/deploy/DB this pass.
