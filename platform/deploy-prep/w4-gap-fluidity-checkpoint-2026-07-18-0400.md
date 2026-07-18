# W4 gap/fluidity checkpoint — 2026-07-18 04:00

## This pass

1. Fresh-ground surface #1: outbound-webhook SSRF — confirmed clean (no
   such feature exists; every genuine domain-derived fetch already routes
   through `src/lib/ssrf.ts`). Closes this 0330-checkpoint candidate.
2. Fresh-ground surface #2 (continuation): SMS-body smishing/content-length
   sweep — the standing-open lead carried forward since the 0236 checkpoint.
   Found and fixed a real, live, no-human-review bug: `POST /api/waitlist`
   relayed an uncapped, unauthenticated public `name` field verbatim into an
   admin SMS via `smsAdmins()` on both its success and DB-error-fallback
   paths. Applied the same boundary-length-cap fix to 4 sibling public
   intake routes sharing the identical gap (`/api/lead`, `/api/ingest/lead`,
   `/api/ingest/application`, `/api/contact`) since they feed the same
   `clients`/`team_applications` data that flows into
   `smsJobAssignment`/`smsLateCheckInAdmin`/`smsLateCheckOutAdmin`/
   `smsRunningLateAdmin` via later staff-assisted actions. 5 new test files,
   13 new tests, RED/GREEN-verified against the real POST handlers. tsc
   clean (2 pre-existing baseline errors only). Full suite 671/672 files,
   2368 passed + 1 documented pre-existing RED-until-fixed + 1 skipped, zero
   regressions. Full writeup:
   `w4-sms-smishing-name-length-cap-fix-plus-outbound-ssrf-clean-2026-07-18-0400.md`.
3. Gap/fluidity checkpoint: this file.

Commits: code+tests, then docs (see LEADER-CHANNEL for hashes).

## Aging items still open (re-confirmed present, not re-litigated this pass)

Unchanged from the 0330 checkpoint's list (itself unchanged from 0236) —
re-list only, no new status: `create-tenant-from-lead` atomic-claim
migration (PROPOSED, unapplied, highest real-money blast radius),
`referrers.total_earned`/`total_paid` atomic-bump migrations (PROPOSED
2026-07-16), `clients` dedup unique indexes (PROPOSED 2026-07-17),
`admin/cleanup-test-bookings` name-collision risk (Jeff's product-call
pending), `comhub_get_or_create_contact_by_email` TOCTOU hardening (blocked
on pulling its real live body), `post-labor.ts`/`postDepositToLedger`
entity_id design question, `categorization_patterns` recategorization
semantics (open product question), `team-portal/photo-upload/route.ts`
(PROPOSED/unwired), `comhub-email` cron's `unread_count` bump (low
priority), CSRF-on-GET instances (judged not worth fixing), dead clone
`_lib/email-templates.ts` files (4 tenants) + `nycmaid/email-templates.ts`
dead functions (cleanup candidate pending clone-deletion green light),
`nycmaid/sms-templates.ts` dead exports (includes the dead
`smsNewClient`/`smsNewBooking`/`smsNewApplication` confirmed unreferenced
again this pass — no live caller anywhere), `post-adjustments.ts`'s
`postCommissionPayment` inert status check, `rate_limit_check_and_record`
atomic RPC (PROPOSED, unapplied), `inbound_emails` dead storage,
`notify-cleaner.ts` dead code, `admin/campaigns/preview` self-XSS (dead
code, no frontend caller), `agreement.ts` dead code,
`documents.status='expired'` unreachable, `threads/[id]` assignee_id
(intentional), `voice/cleanup` unwired, `voice/dial`/`voice/control` target
whitelisting, 4 dead `sendPushToClient` exports, `notify()`'s latent
`channel:'push'` no-op, comhub voice `admin_phone`/transfer-target
whitelisting, invoices/quotes/documents `do_not_service` product question,
`sendPushToTeamMember`/`AllTeamMembers` `do_not_service` applicability, the
0844 indirect-prompt-injection finding on `agent.ts`/`tools.ts`
(architectural, needs Jeff's call), `/api/yinez` residual unverified-tenant
edge + self-reported-phone-establishes-identity items (both open, both
lower-severity than what's shipped), `cleaners` vs `team_members` ID-space
mismatch (`cron/phone-fixup`), `client/confirm/[token]` dead code
(`client_confirm_token` never written), `lead-media/signed-url` 32-bit path
entropy (style note, not tracked as a real gap), Jefe's non-refund owner
tools' per-tool idempotency parity (covered by webhook-level dedup already),
`telegram_webhook_events` needs periodic pruning once its migration is
applied, `admin/businesses/[id]` GET returns full raw `tenants` row incl.
ciphertext to an already-trusted super-admin (zero blast radius, cleanup
only).

## New (low-priority, non-tracked) observations from this pass

- `src/app/api/leads/route.ts` (FullLoop's own onboarding lead-gen, separate
  from tenant CRM data) and `src/app/api/inquiry/route.ts` (B2B acquisition
  inquiry form) both still lack a length cap on `name`/free-text fields.
  Neither has an SMS-relay path (email-only, and `inquiry`'s email template
  already escapes every field) — pure storage-bloat/abuse-volume risk, not a
  smishing vector. Not fixed this pass (kept scope to the routes that
  actually feed the tenant SMS pipeline); worth folding in if a future pass
  is already touching either file.
- The SMS-template layer itself (`sms-templates.ts`) still has no defensive
  truncation of its own — the fix this pass is at the intake boundary
  (matching the `/api/clients` precedent), not in the templates. A
  hypothetical future intake path that forgets this cap would reintroduce
  the same bug. Not opened as a tracked gap (would be speculative
  engineering against a path that doesn't exist yet), just flagged in case a
  future pass wants defense-in-depth at the template layer too.

## Next-target candidates if continuing fresh-ground hunting

- Both of this session's fresh-ground candidates (outbound SSRF,
  SMS-smishing sweep) are now closed as named categories — do not return
  without a new signal.
- A final confirming grep for Stripe/payment-provider calls missing an
  `idempotencyKey` beyond the 2 already-covered call sites, per the 0236
  checkpoint's note — still the one standing item from that list not yet
  picked up.
- Consider a TOCTOU/race-condition sweep (raised as a category two
  checkpoints ago, never actually run) or an authorization sweep of the
  `/api/admin/*` POST/PUT/DELETE surface (the 0330 pass only covered GET/read
  — mutating admin routes are still unaudited as a named category).

No push/deploy/DB this pass.
