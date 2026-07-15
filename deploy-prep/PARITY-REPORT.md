# PARITY-REPORT.md — nycmaid 100%-tenant parity vs source (thenycmaid/nycmaid @ 15837e3)

Source is READ-ONLY (`~/Desktop/nycmaid`, never modified — it is the rollback net).
Target is this FL platform, nycmaid tenant = `00000000-0000-0000-0000-000000000001`.
No cutover/webhook/DNS/deploy/prod-DB actions taken by any lane in this report.

**Structural note on this consolidation (W1, 2026-07-13 ~11:05):** each lane worker runs in
its own git worktree on its own branch (`p1-w1`…`p1-w6`), so `deploy-prep/PARITY-REPORT.md`
is currently **six separate branch-local files**, not one shared file — W2–W6's sections
below were built by reading their worktrees' copies directly (`/Users/jefftucker/flwork-p1-w2`
… `-w6`), not by them appending to this file. This TOP SUMMARY reflects the state of all six
files as of the timestamp above; it will need one more re-generation pass after the leader
merges all six branches into one, in case any lane lands further commits after this reading.

---

## TOP SUMMARY (consolidated by W1, all 6 lanes, as of 2026-07-13 ~11:05)

| Lane | Area | ✅ Match | ⚠️ Drift (open) | ❌ Missing (open) | Closed this pass |
|---|---|---|---|---|---|
| W1 | Email templates + send transport | 27/28 templates + `email.ts` + `client-email.ts` scope + 7 send-paths | 2 (phone number *new*; arrival-window note *known*) | 0 | 1 (`92de7d8a` — comhub-email nycmaid `email_from` safety net) |
| W1 | Tenant profile/config (comms) | 4 areas (Telegram, Anthropic, `payment_link`, ~20 dashboard/cron Telnyx/Resend call sites) | 1 (nycmaid-legacy stack reads platform env vars, not tenant columns) + 1 noted-no-risk (`selena_config`) | 0 | 0 (read-only audit lane, no fix authorized) |
| W2 | Crons (21 nycmaid crons) | 10 | 1 flagged (`generate-recurring` buffer-model mismatch, platform-wide, too broad to auto-port) | 0 | 7 (`5083a8e7`,`11a0e7fb`,`fba8a903`,`95af9291`,`8810cedc`,`404615a9`,`42b5d267`) |
| W3 | SMS copy (client/cleaner/admin) | 6 | 0 (all fixed) | 0 (all fixed) | 9 drift + 1 missing/wiring (2 commits — arrival-window/rate restore, cleaner-SMS rewire) |
| W4 | Funnel + portal + payment e2e | 6 | 0 (2 fixed) | 0 | 2 (time-slot parser fix, `ref_code`/payout-field sync fix) + 2 test-only commits locking in pre-existing fixes |
| W5 | Admin/comhub + marketing/SEO | 9 areas | 1 (unexplained `(646) 490-0130` support number, + a 3rd unexplained `(212) 202-9030` in shared template) | 0 | 2 (`f6657ff1` audit-log gap, `90b919f9` errors-viewer page) |
| W6 | Integrations/webhooks + Telnyx-401 root cause | 7 checklist rows (mostly already closed pre-session) | 0 fixed this pass (diff-only mandate) — root-caused Telnyx 401 as global-vs-per-tenant public-key mismatch, same shape latent in Resend/Stripe webhooks | 0 | 0 code fixes; 1 witness test added (`webhook-verify.test.ts`) proving the root-cause mechanism |

**Read across lanes:** three separate lanes (W2 crons, W3 SMS, W4 funnel, W5 marketing) each
independently ran into pieces of the **same two underlying findings** — see JEFF DECISIONS
#1 and #2 below, which merge those overlapping reports into one ask instead of five.

---

## JEFF DECISIONS — every item flagged across all 6 lanes, consolidated

### 1. 🔴 Which phone number should nycmaid's client-facing copy use? (highest priority — functional, not cosmetic)

Three lanes hit this independently from different angles:
- **W1 (email):** every transactional email (`emailWrapper` footer + 13 template bodies)
  reads `(646) 490-0130`; source used `(212) 202-8400` with zero exceptions. Baked in since
  the first FL port commit (`8ed0a1d1`).
- **W5 (marketing/SEO):** `(646) 490-0130` appears site-wide on `site/nycmaid/*`
  (nav/footer/legal pages/FAQ) and in the `schema.org ContactPoint` JSON-LD Google indexes —
  **zero hits for this number anywhere in nycmaid's live source.** Also found a **third,
  also-unexplained** number, `(212) 202-9030`, in the shared root template used by other
  tenant sites — suggests boilerplate leakage, not a real nycmaid number.
- **W6 (integrations):** confirms `(646) 490-0130` is FL's own **platform-wide generic
  support line** (same number on every tenant's marketing footer) — it is NOT wired to
  nycmaid's Telnyx account. `(212) 202-8400` is the number `tenant.telnyx_phone` actually
  points at and the number Selena/the review-engine listens for inbound SMS on. **Functional
  consequence:** any customer who texts or replies to `(646) 490-0130` per the email/site
  instructions gets silence — the automated review "DONE"-reply flow and any inbound-SMS
  automation silently never fires for that channel.

**Ask:** confirm whether `(646) 490-0130` is a real, staffed line Jeff wants kept for
transactional/marketing copy (then it needs a `support_phone` tenant-config field and,
separately, needs to actually be wired to receive/route SMS), or whether it's leftover
boilerplate that should be reverted to `(212) 202-8400` everywhere on `site/nycmaid/*` and
`lib/nycmaid/email-templates.ts` to restore 100% source parity and keep the automated
reply flow working. Also flag the stray `(212) 202-9030` for a separate check.

### 2. 🟡 Review-flow: restore the $25 selfie-video credit, or make the ask text match the $10-only reality?

W3, W4, and W6 all touched this; consolidated view:
- **W3 confirms the SMS ask-text is NOT drifted** — `smsReviewRequest` is byte-identical to
  source on both sides, same $10/$25 offer, same Zelle wording, same review link. (Don't
  double-count this against the SMS-copy lane.)
- **W4 and W6 confirm the drift is entirely in `lib/nycmaid/review-engine.ts`'s
  post-reply handling** (a deliberate change per code comment, "$25 video-review option
  removed per Jeff, 2026-07-05"): nycmaid detects a video reply (`looksLikeVideo` regex) and
  pays $25 + Zelle-worded ack; FL always pays a flat $10 with no video detection and no
  Zelle mention in the ack.
- **W6's specific catch, independent of which way Jeff decides:** the ask text (byte-
  identical to source) still *offers* $25 for video, but the code has never honored that
  offer since 2026-05-05 — i.e. FL is currently promising something it doesn't pay,
  regardless of which behavior is "correct." Worth fixing the inconsistency either way.

**Ask:** restore nycmaid's $25-video/Zelle-ack behavior in `review-engine.ts`, or keep the
flat $10 and edit the ask text so it stops promising a video option it won't pay.

### 3. 🟢 Email arrival-window disclaimer — likely uncontroversial, cheap follow-up (not really a decision)

- **W1 confirmed** email templates dropped `ARRIVAL_WINDOW_NOTE` (the "can't give an exact
  arrival time, even day-of" disclaimer) from 4 templates, per an explicit platform-wide
  design decision ("every tenant gets nycmaid's arrival-window mechanism, but the disclaimer
  copy was lost in the process").
- **W3 already restored** the underlying `ARRIVAL_WINDOW_NOTE`/`_SMS`/`_ES` constants to
  `src/lib/time-window.ts` and re-wired all 8 affected **SMS** templates — committed, tested.
- **W6 confirms** the **email** side (3 call sites: confirmation, reminder, reschedule) is
  still missing it, even though the constants W3 restored now exist to wire from.
- Not fixed by any lane — flagged, not touched, because "email copy" was explicitly on the
  3-items-diff-only list for this pass.

**Ask:** since the constants already exist post-W3, this is now a ~3-line wiring change
(no new copy to write or invent) — approve it and it can be closed at merge with minimal risk.

### 4. 🟡 Telnyx/Resend/Stripe: global env-var secrets vs per-tenant accounts (architecture decision)

W6 root-caused the 2026-07-07 Telnyx 401 to this; W1's tenant-profile/config lane
independently found the **outbound mirror** of the same issue:
- **W6 (inbound/webhook side):** `TELNYX_PUBLIC_KEY` is one global env var, but
  `tenant.telnyx_api_key`/`telnyx_phone` are per-tenant columns — a single global public key
  cannot verify signatures from multiple Telnyx accounts. Proven with a new witness test
  (`webhook-verify.test.ts`), not just theorized. Same-shaped risk flagged (untested against
  real traffic) in Resend inbound (`RESEND_WEBHOOK_SECRET`) and the tenant/Connect Stripe
  webhook (`STRIPE_WEBHOOK_SECRET`) — the latter is normally correct for FL's own Connect
  sub-accounts, but nycmaid is a foreign/standalone Stripe account, not a Connect sub-account.
- **W1 (outbound/send side):** `lib/nycmaid/sms.ts` + `lib/nycmaid/email.ts` (the
  highest-volume, most customer-visible nycmaid send path — booking confirmations, cleaner
  dispatch, the whole review funnel) read `process.env.TELNYX_API_KEY`/`TELNYX_FROM_NUMBER`/
  `RESEND_API_KEY` at module scope, **not** `tenants.telnyx_api_key`/`telnyx_phone`/
  `resend_api_key`. Currently only correct by assumption that Jeff has pointed those platform
  env vars at nycmaid's own credentials (unverified — Vercel-side, no repo/DB access to check).

**Ask (two independent decisions, same root cause):**
1. Confirm the current `TELNYX_PUBLIC_KEY`/platform Telnyx/Resend env vars actually hold
   nycmaid's own account's credentials (cheapest fix: re-verify + re-paste byte-for-byte).
2. Longer-term: decide whether to migrate to tenant-resolvable secrets (nullable per-tenant
   columns, tenant-first-then-env-fallback) so this doesn't silently break for nycmaid or any
   future multi-account tenant — W6 already scoped this as a migration-file-only proposal,
   not implemented pending sign-off, since it touches other live tenants' Connect flow.

### 5. 🟢 Crons: `generate-recurring` buffer model (platform-wide, not nycmaid-specific)

**W2:** nycmaid buffers a rolling 6 future bookings per schedule (up to 16 weeks out for
monthly patterns); FL generates on a fixed 4-week horizon regardless of frequency — close
enough for weekly schedules, but meaningfully thinner lookahead for biweekly/monthly nycmaid
schedules. This is shared booking-generation logic used by every tenant, not nycmaid-only
code — W2 declined to auto-port a platform-wide behavior change in a parity-diff pass.
**Ask:** decide whether to move to nycmaid's count-based buffer model platform-wide, or leave
the 4-week horizon and accept thinner lookahead for non-weekly nycmaid schedules.

### Already-decided / no action needed (context only, not a new ask)

- `rateOf` fallback `79 → 69`: **CLOSED.** W6 flagged this before W3's fix landed; W3's
  commit already fixed the one real instance (`sms-cleaning.ts`) and confirmed the email
  side already matched (`|| 69`) on both source and target. Nothing outstanding here.
- Telnyx voice: intentionally skipped per Jeff's own cutover plan (§R3) — not a new decision,
  just confirmed still true (W6).
- `selena_config` completeness: functionally moot for nycmaid (hardcoded persona, doesn't
  read the column) — a readiness-dashboard false-negative only, not a real gap (W1).

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

---

## LANE: SMS (W3)

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

---

## W2 — LANE: CRONS behavior (21 nycmaid crons vs FL routes)

Presence was already verified (all 21 nycmaid cron names have FL route
equivalents in `platform/vercel.json`; 3 — `reminders`, `payment-reminder`,
`schedule-monitor` — were already behavior-verified in an earlier pass per
`nycmaid-cutover-CHECKLIST.md` §J). This lane closes the remaining 18 "open"
items from that checklist by diffing LOGIC, not just presence, against
`~/Desktop/nycmaid/src/app/api/cron/*`.

**Tally: 10 ✅MATCH · 7 fixed (commits below) · 1 ⚠️FLAGGED for Jeff (not auto-ported).**

### ✅ MATCH — no drift, no action

| Cron | Notes |
|---|---|
| `confirmation-reminder` | nycmaid:`src/app/api/cron/confirmation-reminder/route.ts` vs FL:`platform/src/app/api/cron/confirmation-reminder/route.ts` — faithful tenant-scoped fan-out port, per-tenant dedupe via `sms_logs` preserved. |
| `rating-prompt` | Same file pair — CAP=10 bulk-block safety rail (the "157-SMS blast" lesson) correctly re-enforced **per tenant**, not just globally. |
| `late-check-in` | Same file pair — naive-timestamp comparison is behaviorally equivalent on both sides (Postgres ignores the tz suffix when casting a string to a `timestamp` column; both apps run in UTC, so digit-for-digit comparison matches). Minor note (not fixed): FL inlines its own `Bearer` check instead of the shared `protectCronAPI` helper other crons use — cosmetic, both fail closed to 401, no behavior difference. |
| `health-check` | nycmaid:54 lines vs FL:271 lines — FL is a strict superset (self-healing retry engine, stale-notification cleanup, stale-booking auto-complete) on top of the original connectivity/env checks. Covers nycmaid tenant by iterating all active tenants. |
| `backup` | Mechanism changed (nycmaid: CSV-via-email to `ADMIN_EMAIL`; FL: per-tenant JSON snapshot to Supabase Storage `platform-backups/<slug>/<date>.json`) but intent is preserved — iterates all active tenants including nycmaid. Deliberate architecture upgrade, not a regression. |
| `comms-monitor` | Platform-wide admin alert monitor (not tenant-specific by design in either version). FL substitutes Telegram (`alertOwner`) for nycmaid's email+SMS admin alert — reasonable platform-ops equivalent. |
| `sync-google-reviews` | Tenant-scoped correctly, upsert uses composite key `tenant_id,google_review_id`. **Note (not fixed, out of cron-lane scope):** nycmaid cached `avg_rating`/`total_reviews` onto `settings.google_business` each sync; FL dropped that aggregate-stats write. The admin UI (`admin/google-profile/page.tsx:39`) reads a `google_avg_rating` field that is never written anywhere in the codebase — appears to be a platform-wide dead field, not a nycmaid-specific regression. Flagging for whoever owns that admin surface. |
| `cleanup-videos` | Logic matches; storage bucket renamed `cleaner-photo` → `uploads`. **Note (not fixed — needs live-DB check, can't verify from code):** if nycmaid's synced video URLs still reference the old `cleaner-photo` path, `extractStoragePath()`'s regex (`/object/public/uploads/`) won't match them, so old files won't actually be deleted from storage (the DB pointer still clears fine — no functional/customer-facing break, just potential storage cost). |
| `payment-followup-daily` | Tenant-scoped correctly; nycmaid qualifies (`telnyx_api_key` + `payment_link` both set per the cutover checklist). Faithful port including the ET-slot gating, 14-day recency floor, per-slot idempotency, and the send cap. |
| `phone-fixup` | Tenant-scoped correctly; nycmaid-only in practice since it queries the `cleaners` table model (other FL tenants use `team_members`). Signed-token link, CAP=10, 7-day dedupe all preserved. |

### ❌/⚠️ FIXED — commits on `p1-w2`

| Cron | Bug | Fix | Commit |
|---|---|---|---|
| `sales-follow-ups` | Queried `deals.status` — **a column that doesn't exist.** `deals` was unified onto a single `stage` field (migration `2026_07_03_sales_pipeline_unify.sql`: new/qualifying/quoted/pending/sold/lost). The query has been erroring on every run, for every tenant, since that migration — cron silently 500s, no follow-up reminders ever fire. | `.eq('status','active')` → `.not('stage','in','(sold,lost)')`, matching nycmaid's `stage='active'` intent (still open). | `5083a8e7` |
| `outreach` | Same bug class: sales-board exclusion queried `deals.status`. Query errored → silently fell back to empty set → clients actively being worked in the sales pipeline received seasonal marketing SMS they should have been excluded from. | Same fix pattern. | `11a0e7fb` |
| `daily-summary` | Recurring-expiration dedup ("already notified within 7 days") filtered only on `tenant_id`+`type` — no client/schedule scope. The first expiring recurring schedule to fire in a tenant silently suppressed every **other** expiring schedule's warning for a full week. nycmaid scoped the dedup via a message `LIKE` match on client name + recurring type. | Restored the `.like('message', '%client%type%')` scope. | `fba8a903` |
| `comhub-email` | nycmaid hardcoded Yinez/Selena's **email** auto-reply OFF on 2026-05-29 (Jeff: she wasn't checking schedule availability before replying to email leads — a documented safety decision, not an oversight). The tenant-scoped FL port dropped that override entirely — Selena would auto-email nycmaid leads with the same bug Jeff turned off. | Gated the off-switch to the nycmaid tenant only; other tenants keep auto-reply (their own deliberate feature, unaffected). | `95af9291` |
| `refresh-job-postings` | Revalidated `/site/available-nyc-maid-jobs` + `/site/careers/operations-coordinator` (bare `/site/...` root) for "nycmaid." But `middleware.ts` (`ROOT_SITE_TENANTS` is empty; `nycmaid` is in `BESPOKE_SITE_TENANTS`) rewrites nycmaid's live domain to `/site/nycmaid/...` — the bare root is dead code for domain routing. nycmaid's actual live job/career pages were **never** being revalidated, reproducing the exact Google-for-Jobs staleness bug this cron exists to prevent. | Added the correct `/site/nycmaid/available-nyc-maid-jobs`, `/site/nycmaid/careers/commission-sales-partner`, `/site/nycmaid/careers/operations-coordinator` paths. Left the legacy root entries in place (harmless). | `8810cedc` |
| `anthropic-health` | nycmaid alerts at most once per 30 min per failure kind (system_state-backed) — "Jeff has no other signal the agent is dead," deliberately capped, not silenced. FL's port had no cooldown at all; this cron runs every 15 min, so a sustained Anthropic outage would page the owner's Telegram on every tick. | Ported the 30-min cooldown via a `notifications`-table dedup (same proven pattern `cron/comms-monitor` already uses) rather than `system_state`, which isn't referenced anywhere else in the current codebase and its schema couldn't be verified. | `404615a9` |
| `health-monitor` | The `reminders` check watched `email_logs` for a subject `ILIKE '%reminder%'` — but `cron/reminders` **never writes `email_logs`** (only `client/book` and `client/reschedule` do; `reminders` writes `notifications` rows). The check would find nothing and permanently report "reminders silent," false-alarming every 6h even while reminders fire correctly. | Replaced with checks on the notification types `cron/reminders` actually produces: `daily_ops_recap`, `daily_digest` (verified at `cron/reminders/route.ts:526,575`). | `42b5d267` |

### ⚠️ FLAGGED for Jeff — not auto-ported (too broad/risky for this pass)

| Cron | Drift |
|---|---|
| `generate-recurring` | nycmaid keeps a rolling buffer of **6 future bookings** per schedule (16-week lookahead for monthly patterns), replenished only when the count drops below 6. FL instead generates on a fixed **4-week horizon** from the latest existing booking, regardless of schedule frequency. For weekly schedules the two models land close; for **biweekly/monthly nycmaid schedules** FL's 4-week horizon produces meaningfully less lookahead than nycmaid's count-based buffer (e.g. a biweekly schedule: nycmaid buffers ~12 weeks out to hold 6 occurrences; FL only reaches 4 weeks = ~2 occurrences). This is core booking-generation logic **shared across every tenant on the platform**, not nycmaid-specific code — rewriting it to match nycmaid's count-based model in this pass would be a platform-wide behavior change I'm not comfortable making unreviewed in a parity-diff pass. Also note: the "auto-resume paused schedules" sub-feature is intentionally hardcoded to `NYCMAID_TENANT_ID` only (comment: "NYC Maid parity") — correct for nycmaid's own behavior, but is architecture debt against this repo's own GLOBAL-feature rule (`platform/CLAUDE.md`) worth cleaning up separately. |

### Also noticed, not in this lane (surfaced for the owning worker/lane)

- `deals.status` (nonexistent column) may be queried elsewhere outside `cron/*` — a broader grep turned up hits in `api/pipeline/route.ts`, `api/quotes/route.ts`, `api/deals/route.ts`, `api/deals/at-risk/route.ts`, `lib/selena/tools.ts`, `lib/tenant-db.test.ts`. Not verified individually (out of the crons lane) — worth a targeted sweep.
- `google_avg_rating`/`google_review_count` fields read by `admin/google-profile/page.tsx` appear to be dead (never written by any code path found) — platform-wide, not nycmaid-specific.

### Test coverage

Every fix above ships with a non-vacuous `route.test.ts` in the same directory
(verified failing against the pre-fix code via `git stash`, passing post-fix).
`npx tsc --noEmit` clean after each commit.
