# NYC Maid → FullLoop Parity Report

Source of truth (READ-ONLY, never modified): `~/Desktop/nycmaid` @ `15837e3` (repo `thenycmaid/nycmaid`).
Target: this FL platform, nycmaid tenant = `...001`.

---

## W3 — SMS copy lane (client / cleaner / admin)

Scope: client SMS (13 runtime templates, `lib/messaging/sms-cleaning.ts`), cleaner SMS
(job-assignment/daily-summary/late-check), admin SMS (new-booking/digest/payment-overdue).
Cross-referenced against `nycmaid-cutover-CHECKLIST.md` §D/§L and `nycmaid-cutover-plan-2026-07-07.md` §5.

### Client SMS — 13 runtime templates (`src/lib/messaging/sms-cleaning.ts` vs `nycmaid/src/lib/sms-templates.ts`)

The checklist marked this row `✅ faithful` (CHECKLIST.md:97, :28). That was **stale** — the
resolved runtime file (`sms-cleaning.ts`, selected by `clientSmsTemplates()` for
`industry='cleaning'` tenants) had drifted on 9 of 13 templates:

| # | Template | Verdict | Detail |
|---|---|---|---|
| 1 | `bookingReceived` | ⚠️DRIFT→FIXED | rate fallback `$79→$69` (sms-cleaning.ts:38 vs source sms-templates.ts:19); arrival-window note paraphrased instead of literal `ARRIVAL_WINDOW_NOTE_SMS` (sms-cleaning.ts:50 vs source:24) |
| 2 | `bookingConfirmed` | ⚠️DRIFT→FIXED | rate fallback `$79→$69`; missing `ARRIVAL_WINDOW_NOTE_SMS` sentence entirely (source:36) |
| 3 | `confirmationReminder` | ⚠️DRIFT→FIXED | missing `\n\n${ARRIVAL_WINDOW_NOTE_SMS}\n\n` paragraph (source:42) |
| 4 | `bookingConfirmation` | ⚠️DRIFT→FIXED | missing `ARRIVAL_WINDOW_NOTE_SMS` paragraph after arrival-window mention (source:86); cancel-policy wording and payment wording were already ✅MATCH |
| 5 | `reminder` | ⚠️DRIFT→FIXED | missing note in both the "in 2 hours" and default branches (source:99,101) |
| 6 | `cancellation` | ✅MATCH | sms-cleaning.ts:100-103 vs source:104-107, brand-templated only |
| 7 | `reschedule` | ⚠️DRIFT→FIXED | missing `${ARRIVAL_WINDOW_NOTE_SMS} ` before "Details:" (source:112) |
| 8 | `thankYou` | ✅MATCH | sms-cleaning.ts:111-114 vs source:115-118 |
| 9 | `ratingQ1` | ✅MATCH | sms-cleaning.ts:117-119 vs source:46-48 |
| 10 | `bookingConfirmationES` | ⚠️DRIFT→FIXED | missing `ARRIVAL_WINDOW_NOTE_ES` (source:132) |
| 11 | `reminderES` | ⚠️DRIFT→FIXED | missing note in both branches (source:145,147) |
| 12 | `cancellationES` | ✅MATCH | sms-cleaning.ts:141-144 vs source:150-153 |
| 13 | `rescheduleES` | ⚠️DRIFT→FIXED | missing `ARRIVAL_WINDOW_NOTE_ES` (source:158) |

Root cause: `src/lib/time-window.ts` in the target was missing the `ARRIVAL_WINDOW_NOTE`,
`ARRIVAL_WINDOW_NOTE_SMS`, `ARRIVAL_WINDOW_NOTE_ES` constants entirely (present in
`nycmaid/src/lib/time-window.ts:28-37`) — every client SMS template that should carry the
"no exact arrival time, even day-of" disclaimer had silently dropped it.

**Fix applied:**
- Restored the three constants to `src/lib/time-window.ts` (byte-identical to source).
- `src/lib/messaging/sms-cleaning.ts`: fixed `rateOf()` fallback `79→69`; re-added the
  `ARRIVAL_WINDOW_NOTE_SMS`/`_ES` sentence to the 8 templates listed above, line-for-line
  against source. Tenant-scoped automatically — this file is only selected for
  `industry='cleaning'` tenants (nycmaid, the-florida-maid); no other tenant touches it.
- Non-vacuous tests added: `src/lib/messaging/sms-cleaning.test.ts` (9 tests — asserts the
  $69 fallback and the presence of the EN/ES disclaimer in each affected template).

### Cleaner SMS — job-assignment / daily-summary / late-check-in / late-check-out

❌**MISSING** — not a copy drift but a **wiring** gap. The checklist's note
("primary path uses nycmaid/sms-templates.ts smsJobAssignment ... verified line-for-line",
CHECKLIST.md:101) was **stale/incorrect**: `platform/src/lib/nycmaid/sms-templates.ts` (the
282-line file with PIN/supplies/bilingual copy matching source exactly) is **dead code** —
grep confirms its only live import anywhere in the app is `smsReviewRequest` from
`lib/nycmaid/review-engine.ts`. Every real booking route
(`api/bookings/route.ts`, `api/bookings/[id]/route.ts`, `api/bookings/[id]/team/route.ts`,
`api/bookings/batch/route.ts`, `api/cron/daily-summary/route.ts`,
`api/cron/late-check-in/route.ts`) actually sent the **generic, non-cleaning** copy
(`lib/sms-templates.ts`) to the nycmaid tenant — no PIN, no supplies note, no `/team` portal
link, no bilingual body matching nycmaid's exact wording.

**Fix applied** (tenant-scoped, global-architecture-compliant per `platform/CLAUDE.md`'s
GLOBAL RULE — one shared codebase, tenant differs by data):
- Added `src/lib/messaging/team-sms.ts` — `jobAssignment`, `dailySummary`,
  `lateCheckInCleaner`, `lateCheckInAdmin`, `lateCheckOutCleaner`, `lateCheckOutAdmin`,
  ported line-for-line from `nycmaid/src/lib/sms-templates.ts:170-274`, brand-parameterized
  (name, `${brand.site}/team` portal) with PIN sourced from `team_members.pin`.
- Added `src/lib/messaging/team-sms-resolver.ts` — `teamSmsTemplates(tenant)` /
  `teamSmsTemplatesFor(tenantId)`, gated on `isCleaningTenant()` (same gate already used by
  `client-sms.ts`). Cleaning tenants get the rich copy; the ~23 other tenants get byte-identical
  output to before (no-op) — verified by test.
- Rewired all 6 call sites above to use the resolver instead of calling the generic
  functions directly; added `pin` (and `hourly_rate` where missing) to the relevant
  `team_members`/`bookings` selects so the rich copy has the data it needs.
- Non-vacuous tests: `src/lib/messaging/team-sms-resolver.test.ts` (6 tests — asserts PIN/
  portal/bilingual body appear for a `industry:'cleaning'` tenant and do NOT change output
  for a non-cleaning tenant).
- `tsc --noEmit` clean, full `vitest run` green (621/621) after the rewire.

### Admin SMS — new-booking / digest / payment-overdue

✅**MATCH (both sides dead/no-op — nothing to port)**:
- `smsNewBooking` (source `sms-templates.ts:276`, target `sms-templates.ts:141`): imported
  in nycmaid's own `api/client/book/route.ts:10` but **never called** — dead code in the
  source of truth itself. Target's copy is equally unwired. No live behavior exists to port.
- `smsPaymentDueAdmin` (source `sms-templates.ts:242`): defined, **zero callers** anywhere in
  nycmaid source. Same in target. Nothing to close.
- "Digest": there is no admin-facing SMS digest in nycmaid. The only "digest" in the source
  is `adminDailyNotificationDigestEmail` (`nycmaid/src/lib/email-templates.ts:877`), an
  **email** template sent from `api/cron/reminders/route.ts` — out of this SMS lane, owned
  by whichever lane covers email-copy parity (CHECKLIST.md:100, "Email copy — 28 templates,
  not yet diffed" — separate item, separate lane).
- `smsLateCheckInAdmin`/`smsLateCheckOutAdmin` — these ARE live (wired in
  `api/cron/late-check-in/route.ts`) and are covered above under "late-check", not repeated
  here.

### Flagged for Jeff (NOT auto-reverted, per leader instruction)

- **Review-flow SMS is already at parity** — `smsReviewRequest` in both
  `nycmaid/src/lib/sms-templates.ts:70-72` and target's `lib/nycmaid/sms-templates.ts:65-67`
  are byte-identical (the `$25` selfie-video offer + Zelle wording + the same Google review
  link are present on both sides in this file). The "dropped $25 video" drift noted in the
  cutover docs (CHECKLIST.md §E, plan §R2) lives in the **email** copy / rating re-bill
  behavior (`lib/nycmaid/review-engine.ts`), not in SMS copy — flagging so Jeff doesn't
  double-count it against this lane.
- `rateOf` `79→69`: fixed as directed ("that one IS a real fix, not the flagged
  product-drift") — see Client SMS section above.

### Commits (this lane)

1. `fix(sms): restore arrival-window disclaimer + $69 rate fallback in client cleaning SMS`
2. `fix(sms): tenant-scoped rich cleaner SMS (PIN/supplies/portal) for job-assignment, daily-summary, late-check-in/out`

### Tally

- ✅ MATCH: 6 (client templates: cancellation, thankYou, ratingQ1, cancellationES; admin: new-booking, payment-overdue — both dead-code-match)
- ⚠️ DRIFT → FIXED: 8 (client templates, arrival-window note) + 1 (rate fallback, shared across 2 templates)
- ❌ MISSING → FIXED: 1 (cleaner job-assignment/daily-summary/late-check-in/out wiring, 6 call sites)
- 🏳️ FLAGGED for Jeff (not touched): review-flow $25 video / Zelle wording / review link (confirmed: NOT an SMS-copy drift, already faithful in SMS; drift is in email/review-engine, different lane)

`npx tsc --noEmit` clean. `vitest run`: 621/621 passing (15 new tests added this lane).
