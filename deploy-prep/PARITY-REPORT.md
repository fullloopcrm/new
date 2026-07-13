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

---

## LANE: TENANT-PROFILE/CONFIG (W1)

**Scope per dispatch:** CHECKLIST §B (comms config) + integrations config, diff the FL
nycmaid tenant row config vs nycmaid live env (Telnyx number/key, Resend key+domain,
Telegram token+chat_id, Anthropic key, `email_from`, `payment_link`, `selena_config`
completeness). Confirm every code send-path reads the **tenant field**, not a platform
env default. This is a **read-only audit** lane — no "close the gap" instruction was
given (unlike the other PARITY-DIFF lanes), and no DB command was run to produce it
(W1's standing rule): every claim below is grounded in code reads + a read-only file
read of `~/Desktop/nycmaid/.env.local` (names only, values never printed/logged).

**Canonical registry used for this audit:** `src/lib/tenant-profile.ts` `PROFILE_FIELDS`
— the one place the codebase itself declares which `tenants` column backs each comms
field (`telnyxKey`→`telnyx_api_key`, `telnyxPhone`→`telnyx_phone`, `resendKey`→
`resend_api_key`, `resendDomain`→`resend_domain`, `emailFrom`→`email_from`,
`telegramBotToken`→`telegram_bot_token`, `telegramChatId`→`telegram_chat_id`,
`anthropicKey`→`anthropic_api_key`). `payment_link` and `selena_config` aren't in this
registry (payment_link is booking-money-path, selena_config is AI persona) so those are
traced separately below.

### ✅ MATCH — Telegram (fully tenant-scoped, no leak)

`src/lib/nycmaid/notify.ts:57-62` selects `telegram_bot_token, telegram_chat_id` from
the tenant row, decrypts with `decryptSecret()`, and calls `sendTelegram(chatId,
text, botToken)` — the tenant's own bot, not the platform `TELEGRAM_BOT_TOKEN`/
`TELEGRAM_OWNER_CHAT_ID` env fallback in `src/lib/telegram.ts:4-8` (that fallback exists
for `notifyOwnerOnTelegram`/Jefe-internal alerts only, a different call path). Correct.

### ✅ MATCH — Anthropic (tenant-scoped with intentional platform fallback)

`src/lib/anthropic-client.ts` `resolveAnthropic(tenantId)` reads `tenants.anthropic_api_key`
first, falls back to the platform key only if the tenant hasn't set one — this fallback
is deliberate and documented (`anthropicKey` tier is `optional` in the registry, not
`critical`). Confirmed at every nycmaid Claude-call site: `selena/agent.ts:422`,
`selena/core.ts:2316`, `nycmaid/conversation-scorer.ts:216` — all call `resolveAnthropic(tid)`,
none construct `new Anthropic()` directly. No leak.

### ✅ MATCH — `payment_link` (tenant-scoped, faithfully ported)

`team-portal/15min-alert/route.ts:62,164-165` and `cron/payment-followup-daily/route.ts:63,75,109`
both select and gate on `tenant.payment_link` — the code comment at
`15min-alert/route.ts:9` documents the port explicitly: `hardcoded Stripe PAY_LINK ->
tenant.payment_link (per-tenant)`. Source (`~/Desktop/nycmaid/src/lib/email-templates.ts:482`)
hardcodes `https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03` directly in the email template
(no env/config indirection at all in source); FL correctly generalized that into a real
per-tenant column instead of also hardcoding it. No leak, no drift.

### ⚠️ DRIFT — Telnyx SMS + Resend email: nycmaid's OWN customer-facing send path does
### NOT read the tenant column CHECKLIST §B says is set

This is the one real finding of this lane, and it's a genuine split-brain, not a cosmetic
nit:

**Two parallel send stacks exist for the nycmaid tenant simultaneously:**

1. **Generic/dashboard/cron stack** (`src/lib/sms.ts`, `sendSMS({ telnyxApiKey, telnyxPhone })`)
   — used by `bookings/*`, `quotes/[id]/send`, `invoices/[id]/send`, `documents/*`,
   `campaigns/[id]/send`, `reviews/request`, `webhooks/telnyx` (inbound owner-reply), and
   the crons `confirmations`, `reminders`, `late-check-in`, `payment-reminder`,
   `payment-followup-daily`, `outreach`, `retention`, `post-job-followup`,
   `daily-summary`. Every one of these selects `telnyx_api_key, telnyx_phone` (and
   `resend_api_key`/`email_from` where relevant) **from the tenant row** and passes them
   through explicitly. ✅ Correct, tenant-scoped, no leak — confirmed at ~20 call sites.

2. **nycmaid-legacy stack** (`src/lib/nycmaid/sms.ts` + `src/lib/nycmaid/email.ts`) — used
   by `client-contacts.ts` (client-facing booking/confirm/reminder SMS), `notify-cleaner.ts`
   (cleaner assignment SMS), `admin-contacts.ts` (owner alerts), `review-engine.ts` (the
   entire rating/review-request flow), and one PIN-reminder send in `selena/core.ts:1285`.
   **These read `process.env.TELNYX_API_KEY` / `process.env.TELNYX_FROM_NUMBER` /
   `process.env.RESEND_API_KEY` at module scope** (`nycmaid/sms.ts:3-4`,
   `nycmaid/email.ts:19-26`) — **platform env vars, not `tenants.telnyx_api_key` /
   `tenants.telnyx_phone` / `tenants.resend_api_key`.** The email from-address is also a
   hardcoded literal (`'The NYC Maid <hi@thenycmaid.com>'`, `nycmaid/email.ts:52`), not a
   read of `tenants.email_from`.

**Why this matters:** stack 2 is nycmaid's *highest-volume, most customer-visible* path —
booking confirmations, cleaner dispatch, and the whole review/rating funnel all go
through it. CHECKLIST §B marks "Telnyx key + number set & correct" / "Resend key set ·
domain set" ✅ — that refers to the **tenant row columns** (confirmed populated per the
checklist, and those columns ARE what stack 1 correctly reads). But stack 2 **ignores
those columns entirely**. Today this is silently correct only because someone (presumably
Jeff, outside this repo — Vercel project env vars, which I have no access to check or
read) has apparently also set the *platform* `TELNYX_API_KEY` / `TELNYX_FROM_NUMBER` /
`RESEND_API_KEY` env vars to nycmaid's own credentials — this is unverified by me since
it lives in Vercel, not the repo or DB. Two concrete risks if that assumption is wrong or
changes:

- **If those platform env vars are ever repointed** (e.g., a future tenant reuses them,
  or someone rotates them thinking they're "the platform default" rather than realizing
  they're secretly nycmaid's real production credentials) — nycmaid's booking
  confirmations, cleaner dispatch, and reviews silently break or silently send from the
  wrong account.
- **If Jeff edits `telnyx_api_key`/`telnyx_phone`/`resend_api_key`/`email_from` via the
  admin profile UI** (`tenant-profile.ts`'s write path, `PATCH /api/admin/businesses/[id]`)
  believing it updates nycmaid's live comms — for stack 1 it does; for stack 2 (the
  actual client/cleaner/review traffic) **it has zero effect**, because that code never
  reads the column.

This is the same underlying architecture risk W6 already flagged from the *inbound webhook*
side (`LEADER-CHANNEL` 10:44 entry: `TELNYX_PUBLIC_KEY` global env vs `tenant.telnyx_api_key`
per-tenant mismatch causing the Jul-7 401) — this lane found the **outbound send** mirror of
the same problem, one level deeper: it's not just signature verification reading a
different key than the DB column, it's the entire nycmaid-legacy send stack never reading
the DB column at all.

**Not fixed / not reverted** — per this lane's explicit scope (audit + flag only, config
values are Jeff's call, and collapsing two send stacks into one is an architectural
decision bigger than "port nycmaid's behavior," the framing every other PARITY-DIFF lane
was given). Flagging for Jeff:
1. Confirm the Vercel-level `TELNYX_API_KEY` / `TELNYX_FROM_NUMBER` / `RESEND_API_KEY` env
   vars are actually nycmaid's own credentials (not a stale platform default) — I cannot
   check this myself (no Vercel/infra access, no DB command).
2. Decide whether to (a) leave the split as-is until the standalone-nycmaid retirement
   (the code's own comment calls this "nycmaid-legacy... retires with the standalone
   cutover"), or (b) migrate `nycmaid/sms.ts`/`nycmaid/email.ts` onto the tenant-column
   reads now so the admin profile UI actually controls nycmaid's real send credentials.

### ⚠️ NOTED, not a live risk — `selena_config` completeness is moot for nycmaid

Grepped `selena_config` across every `src/lib/nycmaid/*.ts` and `src/lib/selena/core.ts`
(nycmaid's actual live agent, confirmed via the `LEADER-CHANNEL` finding that nycmaid
"bypasses this path via their own hardcoded intake") — **zero hits.** nycmaid's persona,
pricing copy, tone, greeting, and intake questions are all hardcoded literal strings in
`core.ts`/`nycmaid/*.ts`, not sourced from `tenants.selena_config` jsonb at all. So:

- **Functionally: no risk.** Whatever is (or isn't) in nycmaid's `selena_config` column has
  zero effect on nycmaid's actual live behavior.
- **Readiness-UI accuracy gap:** the generic profile registry (`tenant-profile.ts`) will
  still evaluate nycmaid against `businessDescription`, `aiName`, `tone`, `greeting`,
  `reviewLink`, etc. as `selena`-store fields and may report them "unfilled"/incomplete in
  any dashboard/readiness view, even though real behavior is fine — a dashboard
  false-negative, not a functional gap. Flagging so nobody chases a phantom "incomplete
  selena_config" ticket for this tenant.

### Tally

- ✅ MATCH: Telegram (fully tenant-scoped), Anthropic (tenant-scoped w/ intentional
  fallback), `payment_link` (tenant-scoped, correctly generalized from source's hardcoded
  link), ~20 generic dashboard/cron Telnyx/Resend call sites (tenant-scoped)
- ⚠️ DRIFT (flagged for Jeff, not fixed — audit-only lane, no close-the-gap instruction):
  nycmaid-legacy stack (`nycmaid/sms.ts`, `nycmaid/email.ts` — client-contacts,
  notify-cleaner, admin-contacts, review-engine, one Selena PIN-reminder) reads platform
  env vars / hardcoded literals instead of `tenants.telnyx_api_key` / `telnyx_phone` /
  `resend_api_key` / `email_from`
- ⚠️ NOTED, no action needed: `selena_config` completeness is functionally moot for
  nycmaid (readiness-UI-only gap)
- **Not independently verified (out of lane's permitted tooling):** the actual current
  values in the FL nycmaid tenant row (whether `telnyx_api_key`/`resend_api_key`/etc. are
  populated with the *correct* live credentials) — this lane had no DB-command access per
  standing rule; CHECKLIST §B already marks these ✅ as of 2026-07-07 from Jeff's own
  verification. This report only confirms/refutes which **code paths** read those columns
  vs. an env default, not the literal populated values today.

No commits this pass — read-only audit, no code changed, no fix requested by dispatch scope.
