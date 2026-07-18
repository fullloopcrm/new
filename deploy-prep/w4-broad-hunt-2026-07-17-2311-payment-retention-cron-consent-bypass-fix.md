# W4 broad hunt — 2026-07-17 23:11 — do_not_service/sms_consent bypass in payment + retention crons

File-only, no push/deploy/DB. Per the 23:02 LEADER order item (1) new fresh-ground surface.

## Starting point

Swept ~25 genuinely-unaudited API surfaces this session (`ingest/lead`,
`ingest/application`, `apply-ceo`, `cpa/[token]/year-end-zip`, `prospects`,
`inquiry`, `import-clients`, `catalog`, `sidebar-counts`, `setup-checklist`,
`service-area`, `indexnow`, `pipeline`, `client-analytics`, `domain-notes`,
`recurring-expenses` (+ its cron), `quote-templates`, `unsubscribe`,
`errors`, `public-upload`, `contact`, `track`, plus every `[id]`-dynamic
admin route not yet covered by a deploy-prep filename this session —
`changelog/[id]`, `seo/verify-file/[file]`, `clients/[id]/contacts/
[contactId]`, `webhooks/telegram/[tenant]`). All came back clean —
already properly tenant-scoped, permission-gated, rate-limited, or
input-validated by prior sessions. Not re-litigating any of these without a
new specific signal.

## Real bug found (order item 2, continued from item 1)

Pivoted to the session's own established bug class (do_not_service/
sms_consent bypass, fixed 3x already tonight in 89c2cdd9, 14fa0888,
da0b904d for the booking-lifecycle SMS pipeline, campaign sends, and the
`notify()` dispatcher) and swept the crons that class hadn't reached yet:
every `sendSMS(`/`sendEmail(` call site across `src/app/api/cron/*`.

Found the same bug in **three more crons**, all previously unaudited for
this class:

1. **`cron/payment-reminder/route.ts`** (generic, non-nycmaid branch) — the
   client payment nudge (`+15min` alert stage) called `sendSMS()` directly
   off a `clients(name, phone)` select with no `sms_consent`/`do_not_service`
   check at all. (The nycmaid branch, gated via `isNycMaid()` →
   `runNycMaidPaymentReminder()` → `sendClientSMS()`, was already safe — that
   helper enforces the gate internally.) The admin overdue-escalation SMS in
   the same file is intentionally left un-gated (operational alert to the
   business's own number), matching the established convention from the
   booking-lifecycle fixes.
2. **`cron/payment-followup-daily/route.ts`** — worse: per its own
   docstring, "today that's nycmaid" is the *only* tenant this cron chases
   (scope requires both a Telnyx key and a `payment_link`), yet it calls
   `sendSMS()` directly rather than routing through the nycmaid
   `getClientContacts()`/`sendClientSMS()` fan-out helper that would have
   caught this — so even the one tenant this class is supposed to already
   protect was still exposed. A DNS-flagged or STOP-replied client got a
   payment-balance text up to 3x/day, every day, until paid.
3. **`cron/retention/route.ts`** — already filtered on `status NOT IN
   (inactive, do_not_contact)` and `sms_consent = true` (fixed earlier this
   session for the stale-`active`-column bug), but never checked the
   separate `do_not_service` boolean column — a genuinely different
   mechanism a client can be flagged through independent of `status`. A
   client with `status='active'`, `sms_consent=true`, `do_not_service=true`
   still got the 30-90-day win-back SMS.

`cron/outreach/route.ts` was checked and is already fully gated
(`.neq('do_not_service', true)` + `sms_marketing_opt_out` + `sms_consent`) —
no change needed, confirms this is a real gap in the other crons, not a
codebase-wide miss.

Continued the same sweep across the rest of `src/app/api/cron/*` (grepped
every file for `sendSMS(`/`sendEmail(` call sites lacking a `do_not_service`/
`sms_consent` check) and found **two more**:

4. **`cron/confirmations/route.ts`** — the client day-before appointment-
   confirmation SMS (`etHour === 13` branch) selected `clients(name, phone)`
   with no consent/DNS check. (The team-member hourly confirm-request SMS in
   the same file is operational and intentionally left ungated, matching the
   established convention.)
5. **`cron/post-job-followup/route.ts`** — both the standalone-booking
   review-request SMS and the multi-session-job review-request SMS selected
   `clients(name, phone)` with no consent/DNS check.

`cron/phone-fixup/route.ts` was checked and is a different class — it emails
`cleaners` (team members, nycmaid-legacy table) about an invalid phone
number, not a client-facing marketing/reminder send, so it's out of scope
for this class.

## Fix

- `payment-reminder/route.ts`: added `sms_consent, do_not_service` to the
  `clients(...)` embed select; gated the client-nudge `sendSMS()` call on
  `client.sms_consent !== false && !client.do_not_service`.
- `payment-followup-daily/route.ts`: same select addition; added a `continue`
  guard immediately after resolving `client` (before the per-slot idempotency
  check and the `dryRun` would-text count, so dry-run reporting reflects the
  gate too).
- `retention/route.ts`: added `.neq('do_not_service', true)` to the existing
  `clients` query filter chain, same convention as `cron/outreach`.
- `confirmations/route.ts`: added `sms_consent, do_not_service` to the
  tomorrow-bookings `clients(...)` embed select; gated the client SMS on the
  same condition. Extended the shared `ClientRecord`/`BookingTomorrowConfirm`
  types in `src/lib/types.ts` (new `ClientNamePhoneConsent` Pick type) since
  this route uses typed `.returns<>()` rather than an `as unknown as` cast.
- `post-job-followup/route.ts`: added `sms_consent, do_not_service` to both
  the bookings and jobs `clients(...)` embed selects; gated both `sendSMS()`
  call sites.

## Verification

RED/GREEN mutation-verified in two batches (one per fix-set as they were
found): saved each batch's diff to a patch, `git apply -R` to revert, ran the
new `route.do-not-service.test.ts` files against the unpatched code — 7/11
assertions failed exactly as expected across both batches (every "does not
text when opted-out/DNS" case; the "still texts an eligible client"
regression-guard cases passed both before and after, as they should).
Reapplied both patches — all new tests pass, plus every pre-existing test in
the 5 affected route directories (29 tests across 12 files total, no
collateral breakage).

Full repo suite: 640/642 test files, 2258/2262 tests passing. Both failures
confirmed pre-existing/unrelated to this pass: the documented RED-until-
fixed `tenant-health` status-coverage invariant (noted in every checkpoint
this session), and the documented `cron/generate-recurring` race flake
(noted in commit da0b904d) — reran the latter in isolation, passes cleanly
(2/2), confirming it's the known flake, not a regression. `tsc --noEmit`:
clean except the same 2 pre-existing baseline errors in
`sunnyside-clean-nyc/_lib/site-nav.ts` noted in every checkpoint this
session.

## Also committed this pass

The prior session's e-sign terminal-status guard + post-claim void-race
guard (`platform/src/app/api/documents/public/[token]/sign/route.ts`) was
verified but left uncommitted in the working tree at session start — the
23:02 LEADER order referenced it as already-closed work, so committed it
first (`b1e63ff4`) before starting this pass's hunt.

## Next-target candidates if continuing fresh-ground hunting

- Push-notification send paths (`sendPushTo*`) for the analogous consent/
  preference gate — flagged as unchecked in the 22:16 checkpoint, still not
  looked at.
- The ~30+ direct `sendEmail(`/`sendSMS(` call sites outside booking-
  lifecycle/campaigns/crons (one-off routes) — narrowing candidate pool as
  crons get swept; not yet exhausted.
- Genuinely fresh, zero-prior-coverage surfaces remaining as of this
  checkpoint: `referral-commissions` (checked — already fixed),
  `sidebar-counts`/`setup-checklist`/`service-area`/`indexnow`/`pipeline`/
  `client-analytics`/`domain-notes`/`recurring-expenses`/`quote-templates`/
  `import-clients`/`catalog` (all checked this pass, clean). Remaining
  unchecked cron files: `anthropic-health`, `auto-reply-reviews`,
  `cleanup-videos`, `comhub-email`, `comms-monitor`, `confirmation-reminder`,
  `confirmations`, `daily-summary` (checked prior session, clean), `follow-up`,
  `generate-recurring`, `health-check`, `health-monitor`, `hr-document-
  reminders`, `jefe-heartbeat`, `late-check-in` (checked prior session,
  clean), `lifecycle`, `no-show-check`, `phone-fixup`, `post-job-followup`,
  `refresh-job-postings`, `sales-follow-ups`, `schedule-monitor`, `sync-
  google-reviews`, `system-check` (checked prior session), the `seo-*` family
  (SEO automation, unlikely to send client-facing SMS/email). Worth a
  targeted sweep for any that call `sendSMS`/`sendEmail` directly.

No push/deploy/DB this pass.
