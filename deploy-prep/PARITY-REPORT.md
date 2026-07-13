# PARITY-REPORT.md — nycmaid 100%-tenant parity vs source (thenycmaid/nycmaid @ 15837e3)

Source is READ-ONLY (`~/Desktop/nycmaid`, never modified — it is the rollback net).
Target is this FL platform, nycmaid tenant = `00000000-0000-0000-0000-000000000001`.
No cutover/webhook/DNS/deploy/prod-DB actions taken by any lane in this report.

---

## LANE: EMAIL (W1)

Scope: `~/Desktop/nycmaid/src/lib/email-templates.ts` (28 exports incl. `emailWrapper`) +
`~/Desktop/nycmaid/src/lib/email.ts` vs FL `platform/src/lib/nycmaid/email-templates.ts` +
`platform/src/lib/nycmaid/email.ts` + `platform/src/lib/messaging/client-email.ts`.

### Template-by-template (email-templates.ts, 28/28 exports present both sides)

Function names, signatures, order, and line count are 1:1 (source 1142 lines / target 1139 —
delta is entirely the drift items below, no missing/extra templates).

| Template | Verdict | Note |
|---|---|---|
| `emailWrapper` | ⚠️DRIFT | phone number swap — see Finding 1 below |
| `clientBookingReceivedEmail` | ✅MATCH* | *drops `ARRIVAL_WINDOW_NOTE` (Finding 2) + phone (Finding 1) |
| `clientRatingPromptEmail` | ✅MATCH | byte-identical (`src/lib/email-templates.ts:160` / `nycmaid/email-templates.ts:161`) |
| `clientReviewRequestEmail` | ✅MATCH* | *phone (Finding 1) only; review link + $10 promo unchanged (Finding 4/5 below) |
| `clientConfirmationEmail` | ✅MATCH* | *drops note (Finding 2) + phone (Finding 1); $10 self-booking promo block present unchanged both sides |
| `clientReminderEmail` | ✅MATCH* | *drops note (Finding 2) + phone (Finding 1) |
| `clientCancellationEmail` | ✅MATCH* | *phone (Finding 1) |
| `clientThankYouEmail` | ✅MATCH | byte-identical (10% discount + referral copy unchanged) |
| `clientPaymentDueEmail` | ✅MATCH* | *phone (Finding 1); buy.stripe.com button present unchanged both sides (Finding 5) |
| `cleanerAssignmentEmail` | ✅MATCH* | *phone (Finding 1) |
| `cleanerDailySummaryEmail` | ✅MATCH* | *phone (Finding 1) |
| `cleanerCancellationEmail` | ✅MATCH* | *phone (Finding 1) |
| `referralWelcomeEmail` | ✅MATCH | byte-identical |
| `referralCommissionEmail` | ✅MATCH | byte-identical |
| `newReferrerAdminEmail` | ✅MATCH | byte-identical (+escapeHtml, Finding 3) |
| `newBookingAdminEmail` | ✅MATCH | byte-identical (+escapeHtml, Finding 3) |
| `backupEmail` | ✅MATCH | byte-identical |
| `cleanerWelcomeEmail` | ✅MATCH* | *phone (Finding 1) |
| `verificationCodeEmail` | ✅MATCH | byte-identical |
| `adminNewClientEmail` | ✅MATCH | byte-identical (+escapeHtml, Finding 3) |
| `adminNewBookingRequestEmail` | ✅MATCH | byte-identical (+escapeHtml, Finding 3) |
| `adminDailyNotificationDigestEmail` | ✅MATCH | byte-identical |
| `adminPendingRemindersEmail` | ✅MATCH | byte-identical |
| `adminDailyOpsRecapEmail` | ✅MATCH | byte-identical |
| `clientRescheduleEmail` | ✅MATCH* | *drops note (Finding 2) + phone (Finding 1) |
| `adminRescheduleEmail` | ✅MATCH | byte-identical (+escapeHtml, Finding 3) |
| `cleanerRescheduleEmail` | ✅MATCH* | *phone (Finding 1) |
| `referralSignupNotifyEmail` | ✅MATCH* | *phone (Finding 1) |

### `email.ts` (send transport)

✅MATCH — `platform/src/lib/nycmaid/email.ts` is functionally byte-identical to
`~/Desktop/nycmaid/src/lib/email.ts:1-87` (from-address `'The NYC Maid <hi@thenycmaid.com>'`
at line 52 both sides, same retry/backoff, same owner-BCC logic, same `logEmailFailure`).
Only diff is a `// tenant-scope-ok` provenance comment on the target side, no behavior change.

### `client-email.ts` → `platform/src/lib/messaging/client-email.ts`

Source has no standalone `client-email.ts`; this file is the FL-side per-tenant EMAIL
resolver (added `2ed14ad5`). ✅MATCH-scope — it routes exactly 2 of the 28 templates
(`clientBookingReceivedEmail`, `clientConfirmationEmail`) through `isNycmaid(tenant)` gating
on `tenant.slug === 'nycmaid'`; the other 26 are invoked directly by nycmaid-only call
sites, all confirmed importing `sendEmail` from `@/lib/nycmaid/email` (not the generic
`@/lib/email`, whose default sender is `'Full Loop CRM <hello@fullloopcrm.com>'`):
`src/lib/nycmaid/notify-cleaner.ts`, `src/lib/nycmaid/client-contacts.ts`,
`src/lib/nycmaid/admin-contacts.ts`, `src/app/api/team-portal/checkout/route.ts`,
`src/app/api/cron/phone-fixup/route.ts`, `src/lib/selena/core.ts`, `src/lib/selena/tools.ts`.
**From-address confirmed correct on every nycmaid send path checked — no fullloop-noreply leak.**

❌MISSING → CLOSED: `src/app/api/cron/comhub-email/route.ts`'s per-tenant IMAP/Resend
loop resolves `emailFrom` from `tenants.email_from` with no nycmaid-specific floor — if
nycmaid's row is ever migrated onto that profile path before `email_from` is populated,
the generic default would leak. Fixed with a tenant-scoped default gated to
`NYCMAID_TENANT_ID`, non-vacuous regression test (3 cases: nycmaid-no-email_from →
`hi@thenycmaid.com`; other-tenant-no-email_from → unchanged `null`, no over-broad
default; nycmaid-with-email_from → explicit value still wins). Commit `92de7d8a`.

### Findings requiring Jeff's call (NOT auto-reverted)

**Finding 1 — Phone number swap, NOT on the known-drift list (new, flagging).**
Every client/cleaner "Questions?" contact link in the FL nycmaid templates
(`emailWrapper` footer + 13 template bodies) reads `sms:6464900130` / `(646) 490-0130`.
Source uses `sms:2122028400` / `(212) 202-8400` throughout, with zero exceptions.
This isn't accidental drift-by-neglect — it was baked in from the very first FL port
commit (`8ed0a1d1`), and the FL nycmaid marketing site (`app/site/nycmaid/*`) deliberately
publishes **two** numbers: "Sales (212) 202-8400" vs "Support (646) 490-0130". But there
is no `support_phone`/`sales_phone` tenant-config field driving this split — it's hardcoded
copy in a handful of marketing pages, and the *transactional* email templates (booking
confirmations, payment-due, reminders) got the support number exclusively, not the sales
number existing customers already know from source. **I did not revert this** — I don't
know whether (646) 490-0130 is a real, staffed line Jeff wants transactional emails routed
to, or a leftover from an early port. Flagging for a product decision: should nycmaid's
client/cleaner-facing transactional emails say (212) 202-8400 (matches 100% source parity)
or (646) 490-0130 (matches the newer sales/support split)? Getting this wrong misdirects a
real customer's day-of question to the wrong (possibly unstaffed) line.

**Finding 2 — "Time vs arrival-window" (one of the 5 known email-copy items) — CONFIRMED real, flagging only.**
`platform/src/lib/time-window.ts` dropped `ARRIVAL_WINDOW_NOTE` / `_SMS` / `_ES` entirely
(source `src/lib/time-window.ts:28-39`) with an explicit comment: "Platform-wide default
per Jeff: every tenant gets nycmaid's arrival-window behavior to start." That generalized
the 2-hour-window *mechanism* but silently dropped the nycmaid-specific disclaimer copy
("We can't give an exact arrival time, even day-of...") from 4 templates that used it in
source: `clientBookingReceivedEmail`, `clientConfirmationEmail`, `clientReminderEmail`,
`clientRescheduleEmail`. Per the master queue's exception list this is an intentional
email-copy drift — **flagging, not reverting.**

**Finding 3 — escapeHtml hardening — target AHEAD of source, no action needed.**
Target wraps client/cleaner/referrer name, email, address, notes, and ref-code fields in
`escapeHtml()` (`src/lib/escape-html.ts`) across every admin/cleaner template; source has
none of this (plain interpolation). This is a deliberate XSS-hardening pass (commit
`327ea8f4`, already covered by `escape-html.test.ts`) — not a gap to close, noted so Jeff
knows the target is stricter here, not merely different.

**Finding 4 & 5 — the other 3 of the 5 known email-copy items: re-verified, NOT actual drift today.**
- **79 vs 69**: both source and target consistently default `hourly_rate || 69` (4 call
  sites each, `email-templates.ts:113,229,507,566` source / `114,230,506,565` target) —
  no `79` literal exists in either file. Already matches; nothing to flag or fix.
- **review link**: both use `https://g.page/r/CSX9IqciUG9SEAE/review` identically in
  `emailWrapper`, `clientReviewRequestEmail`, and `clientThankYouEmail`. Matches.
- **buy.stripe.com button** (`clientPaymentDueEmail`): present, unchanged, byte-identical
  on both sides (`https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03?client_reference_id=...`).
  NOT removed in target — the master queue's premise for this item doesn't hold for the
  *email* lane (may be accurate for a different surface, e.g. SMS — out of this lane).
- **$10 self-booking promo** (`clientConfirmationEmail`): present, unchanged, byte-identical
  discount/promo block on both sides. NOT removed in target.

Flagging all 5 known items back to Jeff as instructed, but noting only 2 of 5 (Finding 1's
phone number is new/unlisted, Finding 2's arrival-window note) are live drift; the other 3
already match and needed no action.

### Not fixed — out of lane, avoiding collision

`src/lib/selena/tools.ts:933` still hardcodes `'Message from The NYC Maid'` as the email
subject for `handleSendToClient` on **this branch** (p1-w1). Per LEADER-CHANNEL 20:04/22:20,
W5 already fixed this brand-leak on p1-w5 (commit `6d12ca35`, tenant-name-derived subject +
regression tests) — selena/tools.ts is W5's lane, not touched here to avoid a re-collision;
will land at merge.

### Tally

- ✅ MATCH: 27/28 templates + `email.ts` + `messaging/client-email.ts` scope + all nycmaid
  send-path from-addresses checked (7 call sites)
- ⚠️ DRIFT (flagged for Jeff, not reverted): phone number (Finding 1, new), arrival-window
  note (Finding 2, known)
- ❌ MISSING → CLOSED: comhub-email nycmaid emailFrom safety net (commit `92de7d8a`)
- Known-list items re-verified as non-issues: 79-vs-69, review link, stripe button, $10 promo (3 of 5)

Commits this pass: `92de7d8a` (fix + test). tsc --noEmit clean; full vitest 115 files /
991 passed + 1 pre-existing expected-fail, 0 regressions.
