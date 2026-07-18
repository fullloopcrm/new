# W4 gap/fluidity checkpoint — 2026-07-18 05:05

Per the 04:53 LEADER order's 3-deep queue (new leader session-21 boot).

## This pass

1. Fresh-ground surface: the 04:44 checkpoint's own "next-target candidate"
   — systematic (not sampled) read of the admin/** surface it named:
   `admin/businesses/[id]`, `admin/prospects/[id]`, `admin/tenants/[id]`,
   `admin/recurring-schedules/[id]` (+ its `pause`/`regenerate`/`exception`
   subroutes), and `campaigns/[id]`.
   - `admin/businesses/[id]` PUT/DELETE, `admin/tenants/[id]` PUT,
     `admin/prospects/[id]` PATCH — all `requireAdmin()` (platform-superadmin
     only), all arbitrary-field updates with no status-gated branch-then-
     write shape (no "reject if status is X, then write anyway" pattern to
     race). Not a TOCTOU class bug. `admin/prospects/[id]` PATCH's `approve`
     action does re-run Stripe-checkout-session creation on a re-approve of
     an already-approved prospect (no `prospect.status==='approved'` guard),
     which would overwrite `stripe_checkout_url`/`stripe_checkout_session_id`
     with a second session — wasteful but superadmin-only, not attacker-
     reachable, same low-priority class as other admin-only footguns noted
     in prior checkpoints. Flagged, not fixed.
   - `admin/recurring-schedules/[id]` GET/PUT/DELETE and its `pause`/
     `regenerate`/`exception` subroutes — already fully guarded from earlier
     sessions (optimistic-concurrency CAS on `regenerate` via `updated_at`,
     per-row re-check on `exception`'s skip/move/reassign, no read-write gap
     on `pause`/DELETE-resume/base-DELETE since none of them branch on a
     prior read before writing). Nothing new here.
   - `campaigns/[id]` — **genuine, previously-unaddressed bug.** DELETE
     already blocks non-draft campaigns (409, comment cites
     `campaign_recipients` cascade-delete audit-trail preservation,
     `route.delete-guard.test.ts`). PUT had **zero** such guard despite
     sitting right next to it: any `campaigns.create`-permitted tenant user
     (the `admin` tenant role, not platform-superadmin) could
     `PUT {status:'draft'}` onto an already-`sent`/`sending` campaign,
     re-arming the atomic claim in `send/route.ts` (`WHERE status NOT IN
     ('sent','sending')`) for a genuine re-send — real emails/SMS re-billed
     and re-delivered to the whole client base — or silently rewrite
     `subject`/`body`/`recipient_filter` on a campaign that's already gone
     out, falsifying the same audit trail the DELETE guard exists to
     protect. Same bug class as the DELETE guard's own stated rationale, just
     on the sibling verb. Fixed with the session's standard CAS pattern:
     `.neq('status','sent').neq('status','sending')` on the UPDATE, 409 with
     a clear message when the campaign is already sent/sending, 404 preserved
     for a genuinely missing row.
2. Continued the surface: checked `campaigns/send/route.ts` (top-level POST +
   PUT, a separate/older campaign-send implementation with its own
   `campaign_recipients` per-recipient tracking and retry flow) for the same
   double-send shape — it already atomically claims via
   `.eq('status','draft')` before sending, no gap. But it's **dead code**:
   grepped the dashboard UI and the only fetch to a campaign-send endpoint is
   `campaigns/[id]/page.tsx` → `POST /api/campaigns/${id}/send` — nothing
   calls `POST/PUT /api/campaigns/send`. Noted as an aging item, not touched
   (out of scope, and still reachable directly so not risk-free to just
   delete without confirming nothing external depends on it).
3. Gap/fluidity: this file.

## Verification

- New test file `route.status-guard.test.ts` (4 tests: 409 on sent, 409 on
  sending — content rewrite blocked too, 200 on draft, 404 on missing). RED
  confirmed pre-fix via `git diff` + `git apply -R` (3/4 failing — the two
  409 assertions plus the 404 case, since the old code had no guard and
  returned a generic 500 instead of 404 on a not-found row too); GREEN
  confirmed post-fix.
- Fixing the route to use `.maybeSingle()` instead of `.single()` (needed so
  a CAS miss doesn't throw a PGRST116 "no rows" error) required adding
  `neq()` + `maybeSingle()` support to the existing hand-rolled Supabase mock
  in `route.permission-gate.test.ts` (additive only, no assertion changes) —
  same mock-gap pattern hit repeatedly this session.
- `npx vitest run "src/app/api/campaigns/[id]/"` — 6 files / 23 tests pass.
- `npx tsc --noEmit` — no new errors (same 2 pre-existing baseline errors in
  `sunnyside-clean-nyc/_lib/site-nav.ts` only, unchanged from prior
  checkpoints).
- Full suite: 677/679 files, 2387/2391 tests passed (+ 1 expected-fail + 1
  skipped). 2 pre-existing failures, both already documented aging items,
  neither touched by this change:
  `cron/tenant-health/status-coverage-divergence.test.ts` (RED-until-fixed,
  documented since earlier checkpoints) and
  `cron/generate-recurring/route.duplicate-occurrence-race.test.ts`
  (previously noted as flaky under full-suite parallel load — reproduced
  this run, did not reproduce last run; consistent with that description,
  not a regression from this change).
- 1 commit: `3b3d7852` (campaigns/[id] PUT status-clobber fix, 1 new test
  file, 1 mock fix).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0444 checkpoint's list (create-tenant-from-lead
atomic-claim migration, referrers atomic-bump migrations, clients dedup
unique indexes, admin/cleanup-test-bookings name-collision,
comhub_get_or_create_contact_by_email TOCTOU, post-labor.ts entity_id design
question, categorization_patterns semantics, team-portal photo-upload
unwired, comhub-email cron unread_count, CSRF-on-GET, 4 dead clone
email-templates files, nycmaid sms-templates dead exports,
post-adjustments.ts inert check, rate_limit_check_and_record atomic RPC,
inbound_emails dead storage, notify-cleaner.ts dead code, campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports, notify()'s
latent `channel:'push'` no-op, comhub voice admin_phone/transfer-target
whitelisting, invoices/quotes/documents do_not_service product question,
sendPushToTeamMember/AllTeamMembers do_not_service applicability, the 0844
indirect-prompt-injection finding on `agent.ts`/`tools.ts` (still flagged,
architectural, needs Jeff's call), the `/api/yinez` residual
unverified-tenant edge and self-reported-phone-establishes-client-identity
items (both still open, both flagged for Jeff's call), the `cleaners` vs
`team_members` ID-space mismatch noticed in `cron/phone-fixup`,
`client/confirm/[token]` dead code, the `telegram_webhook_events` pruning
cron (not wired), Jefe's non-refund owner tools lacking per-tool idempotency
keys (lower priority), `lead-media/signed-url`'s 32-bit random path entropy
note, the `leads/block`/`leads/verify` `leads.view`-tier write-gate
observation, the still-generated-but-never-consumed
`team_member_token`/`cleanerToken` on bookings, the `bookings/[id]/team` PUT
double-booking gap, and `finance/periods/[id]` PATCH / `reviews/[id]` PUT's
last-write-wins footgun (both flagged, not security findings).

## New aging items opened this pass

- `admin/prospects/[id]` PATCH `approve` action has no
  `prospect.status==='approved'` guard — re-approving generates a second
  Stripe checkout session, overwriting the stored URL/session id with the
  new one (the old session becomes orphaned but still technically payable
  until it expires). Platform-superadmin-only, not attacker-reachable, same
  class as other admin-only footguns already on this list. Flagged, not
  fixed.
- `campaigns/send/route.ts` (top-level POST + PUT — recipient-level-tracking
  send/retry, distinct from `campaigns/[id]/send`) is dead code: no dashboard
  fetch reaches it, only `campaigns/[id]/send` is wired to the UI. It's
  internally consistent (its own atomic claim, no bugs found) but represents
  a second, unused implementation of "send a campaign." Worth a product call
  on whether to delete it; not touched this pass (still directly reachable,
  didn't want to remove something without confirming no external caller
  depends on it).

## Next-target candidates if continuing fresh-ground hunting

- The admin/** surface named by the prior checkpoint is now closed out
  (businesses, prospects, tenants, recurring-schedules + subroutes,
  campaigns all read this pass; only fresh finding was campaigns/[id] PUT,
  now fixed).
- Worth extending the same "PUT lacks the guard its sibling DELETE/POST
  already has" pattern-search to other resource pairs with an existing
  DELETE or send-style guard: `documents/[id]` (has an e-sign void-bypass fix
  already per the 2300 checkpoint — worth confirming PUT there has an
  equivalent status guard, not just DELETE), and `deals/[id]` /
  `team-applications/[id]` if either has an asymmetric guard between verbs.
- Alternatively, revisit the two footguns flagged this pass
  (admin/prospects re-approve, campaigns/send dead code) if Jeff confirms
  either is worth a fix/removal.

No push/deploy/DB this pass.
