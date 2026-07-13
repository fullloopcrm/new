# PARITY-DEPLOY-BATCH — ordered deploy manifest for this session's commits

Built 2026-07-13 ~10:57am from `git log` on all 6 sibling worktrees (p1-w1..w6),
scoped to commits made **today (2026-07-13, ~10:18am–10:57am)** — this session's
work only. Older commits (yesterday and before) are excluded except where a
LEADER-named bug (telegram sig) turned out to predate today; that one is called
out separately in Section E.

None of these commits are merged to `main`. None are on PR #14 or #15 (those
two PRs are unrelated hotfixes cherry-picked from *yesterday's* work — TCPA
sms_consent and a selena IDOR fix — see Section E). Every commit below is only
on its own worker branch and needs to be cherry-picked or merged before it
ships. **No DB writes, pushes, or deploys have happened — this is a read plan
only.**

---

## A. LIVE customer-facing fixes — deploy NOW

These are actively breaking things for real users/tenants today. Ordered by
severity/blast-radius (money and 500s first).

| # | Ref | Branch | Impact | Scope | Files |
|---|-----|--------|--------|-------|-------|
| A1 | `5083a8e7` | p1-w2 | `sales-follow-ups` cron 500s on **every run, every tenant** — queries `deals.status`, a column that hasn't existed since the 2026-07-03 pipeline-unify migration (spine is `stage`). Fixed to `.not('stage','in','(sold,lost)')`. | ALL-TENANT | `platform/src/app/api/cron/sales-follow-ups/route.ts` (+test) |
| A2 | `11a0e7fb` | p1-w2 | Same bug class in `outreach` cron: `deals.status` query errors → silently falls back to empty set → clients actively in the sales pipeline get seasonal marketing SMS they should be excluded from (compliance-adjacent). | ALL-TENANT | `platform/src/app/api/cron/outreach/route.ts` (+test) |
| A3 | `d0518bfc` | p1-w6 | Job-application photo upload posts to `/api/upload`, which does not exist — **every applicant is blocked from submitting** the wepayyoujunk/junk-hauler application form. Switched to the working `/api/apply/signed-url` flow already used by other tenants; also tightens client mime validation so iPhone HEIC fails fast instead of silently. | Multi-tenant (junk-hauler vertical forms) | `.../JobApplicationForm.tsx` (+test) |
| A4 | `54ab717b` | p1-w4 | Client booking time-slot parser: fixed 9am–4pm lookup map silently defaulted any other slot (incl. NYC Maid's live **8:00 AM** option) to 9:00 AM — clients picking 8am/5pm/6pm got mis-booked with no error. Ported nycmaid's regex time parser. | ALL-TENANT (shared booking code, not gated) | `platform/src/app/api/client/book/route.ts` (+test) |
| A5 | `3e85fa28` | p1-w4 | Referrer portal (`/referral`, reachable on every tenant's custom domain) showed an **`undefined` referral code/link** to every referrer — POST wrote `referral_code` but GET never selected `ref_code` back out, and `client/book`'s attribution lookup could never match a new signup. Also restores dropped `zelle_email`/`apple_cash_phone` persistence and an admin-notify-on-signup that existed in source and was silently missing here. | ALL-TENANT | `platform/src/app/api/referrers/route.ts` (+test) |
| A6 | `d03220f2` | p1-w3 | Client cleaning SMS (`sms-cleaning.ts`) dropped the "no exact arrival time, even day-of" **arrival-window disclaimer** on 8 of 13 templates (missing constants in `time-window.ts`) — clients no longer get an expectation-setting text before their appointment. Also restores the `$69` rate fallback (was silently `$79`). | Cleaning-industry tenants (nycmaid + others on that vertical) | `sms-cleaning.ts`, `time-window.ts` (+test) |
| A7 | `95af9291` | p1-w2 | nycmaid's Yinez/Selena **email auto-reply-off override** (Jeff turned this off 2026-05-29 because Selena wasn't checking schedule availability before replying) was dropped in the FL port — restored, gated to nycmaid only. Without this, nycmaid leads get the exact bug Jeff already killed once. | nycmaid-only (gated) | `platform/src/app/api/cron/comhub-email/route.ts` (+test) |
| A8 | `8810cedc` | p1-w2 | `refresh-job-postings` cron revalidates dead `/site/...` root paths, never nycmaid's actual live `available-nyc-maid-jobs` / `careers/commission-sales-partner` pages — reproduces the exact Google-for-Jobs staleness bug this cron exists to prevent. | nycmaid-only (live domain routing) | `.../refresh-job-postings/route.ts` (+test) |
| A9 | `fba8a903` | p1-w2 | `daily-summary` recurring-expiring-schedule reminder dedup was scoped tenant-wide instead of per-schedule — the first expiring schedule to fire in a tenant **suppressed every other schedule's warning for a full week**. | ALL-TENANT | `platform/src/app/api/cron/daily-summary/route.ts` (+test) |
| A10 | `92de7d8a` | p1-w1 | nycmaid's outbound comhub-email auto-reply had no guaranteed fallback to `hi@thenycmaid.com` — if nycmaid's `tenants.email_from` is ever unset while on the IMAP/Resend path, the generic `hello@fullloopcrm.com` sender would leak on customer-facing replies. Also completes a partial `escapeHtml` fix (`"`/`'` were unescaped in the same file). | nycmaid-only (gated) + escaping applies ALL-TENANT | `.../comhub-email/route.ts` (+test) |
| A11 | `404615a9` | p1-w2 | `anthropic-health` cron (runs every 15 min) had no alert cooldown — a sustained Anthropic outage pages the owner's Telegram **every 15 minutes** instead of nycmaid's proven 30-min-per-failure-kind cadence. | ALL-TENANT | `.../anthropic-health/route.ts` (+test) |
| A12 | `42b5d267` | p1-w2 | `health-monitor` "reminders" check watches `email_logs` for a subject the reminders cron never writes (it writes `notifications`) — **permanently false-alarms "reminders silent" every 6h** even when reminders are firing correctly. | ALL-TENANT | `.../health-monitor/route.ts` (+test) |
| A13 | `a236c9d1` | p1-w3 | Cleaner-facing SMS (job-assignment, daily-summary, late-check-in/out) for nycmaid was silently going out on generic multi-industry copy instead of nycmaid's PIN + supplies-note + bilingual templates — the checklist's claim that this was already wired was wrong (dead-code function). Ports `team-sms.ts` + resolver, rewires 6 real call sites. | nycmaid + the-florida-maid (cleaning-gated) | new `team-sms.ts`, `team-sms-resolver.ts`, 6 call-site route/cron edits |

**Not urgent enough for "NOW" but adjacent/low-risk, same-lane:**
- `b73c936a` (p1-w2) — Stripe idempotency keys added on instant-payout + refund + Connect account/customer create calls (prevents double-payout/double-refund on retry/double-click). No live incident reported, but this is money-moving code — recommend bundling into the same deploy wave as A1–A13.

---

## B. Security fixes

| # | Ref | Branch | Impact | Scope | Files |
|---|-----|--------|--------|-------|-------|
| B1 | `c21eb8f3` | p1-w4 | **Selena `assign_cleaner_to_booking` tool**: checked `cleaner_id` against caller's tenant but never checked `booking_id` — a foreign-tenant `booking_id` matched zero rows on the scoped update, Supabase returns no error on a zero-row update, so the handler returned `ok:true` while silently writing nothing (false success, not a data leak, but a trust/reliability hole an agent could hit). Added `idInTenant()` check on `booking_id`, BREAK test proving the update never fires cross-tenant. | ALL-TENANT | `platform/src/lib/selena/*` (+test) |
| B2 | `bd5be885` | p1-w2 | Test-only: proves `/api/webhooks/stripe-platform` (FullLoop's own revenue webhook — creates a paying tenant on checkout completion) actually fails closed on missing/invalid signature, and that replay of a valid event doesn't double-create a tenant. No code change — closes a coverage gap on FullLoop's own billing webhook. | Platform-level, not tenant-scoped | new test file only |
| B3 | `17331cbc` (p1-w3, dated 2026-07-12 19:39 — **not from today**) | p1-w3 | **Duplicate of PR #15.** Same bug: `GET /api/selena?convoId` read `sms_conversation_messages` with no tenant check — cross-tenant SMS transcript leak (names/phones/addresses/emails). PR #15 (head commit 2026-07-12 16:59, ~2.5h earlier, cherry-picked from p1-w4) already fixes this and is open for merge. **W3's later commit on the same bug is redundant — do not cherry-pick both; PR #15 is the one to merge.** | ALL-TENANT | (superseded by PR #15) |

Several `refactor(security): convert N routes to tenantDb()` commits landed today across W1/W3/W5 (RLS/ADR-0004 groundwork — e.g. `b4c2242e` W1, `70732ed9`/others W3, `f7e8eca1` W5). These are hardening, not live-bug fixes — none close an active exploit reported live; they move already-correctly-scoped queries onto the `tenantDb()` wrapper so a future edit can't drop the filter. Grouped under (C) below, not (A)/(B), since nothing is actively broken.

**One exception worth flagging to Jeff directly:** W5's `f7e8eca1` notes that `connect/messages` and `connect/unread` previously had **no tenant filter at all** on the message read/count (they trusted an upstream channel_id lookup was already scoped) — today's conversion adds a real second guard, not just a wrapper swap. Low live-exploit likelihood (requires already having a valid channel_id from another tenant) but worth a look before calling it pure hardening.

---

## C. Parity / tenant-scope closes (docs + code, lower urgency)

Bulk `tenantDb()` conversion commits (no live bug closed, wrapper-only moves) and PARITY-REPORT lane audits. Not customer-facing today; safe to batch into a normal PR review cycle rather than a NOW deploy.

- **W1**: `b4c2242e` (4 admin/dashboard routes → tenantDb)
- **W3**: `70732ed9` (5 booking/portal routes → tenantDb + BREAK suite)
- **W4**: `21149356`, `e3f62989`, `2a10e61f`, `48a27c98` (client/verify-code, client/collect, client/recurring, client/confirm/[token] → tenantDb, each with regression tests)
- **W5**: `f7e8eca1` (notifications/messages/connect routes → tenantDb — see B exception above)
- **W6**: `afe5990d` (RPC security-definer review extension, git-reflog runbook, untracked-orphans reconciliation — docs only)

Test-only commits with no code change (lock in existing-but-uncovered behavior, safe no-op deploys):
- `7d1b4183` (p1-w4) — payment-processor $35 floor + naive-date parsing, already-fixed code, adds missing coverage
- `6e1365d6` (p1-w4) — 15min-alert payment_link substitution + $10 self-booking discount, already-fixed code, adds missing coverage
- `f6657ff1` (p1-w5) — audit() logging added to legacy `/api/cleaners/[id]` shim (real gap: this one DOES change behavior — adds a missing audit-trail write, include with C not A since it's not user-facing)
- `90b919f9` (p1-w5) — new `/admin/errors` page, ports an already-built, already-authed backend that had no UI consumer. New feature, not a bug fix — Jeff's call whether this ships now or later.
- `ab069d91` (p1-w2) — inbound_emails tenant-scope prep, flag-gated off everywhere today, zero behavior change until someone flips `INBOUND_EMAILS_TENANT_SCOPE_ENABLED`. Prep only, nothing to deploy-decide on.

---

## D. Docs-only (no code shipped, informational for Jeff)

- `18f276bc`, `8fa01dc1`, `2b66119a` (p1-w1) — PARITY-REPORT.md lanes: EMAIL, TENANT-PROFILE/CONFIG, and the consolidated TOP SUMMARY + JEFF DECISIONS section merging all 6 lanes' flags (phone number x3 lanes, review-flow $25 video x3 lanes, arrival-window note, global-secret architecture risk x2 lanes, generate-recurring buffer model). **Read this one first** — it's the cross-lane index.
- `4c26c91d` (p1-w2) — PARITY-REPORT.md CRONS lane, 18 items (10 match, 7 fixed — see Section A, 1 flagged for Jeff: generate-recurring lookahead-window algorithm, too broad to auto-port)
- `579b4504` (p1-w4) — PARITY-REPORT.md FUNNEL+PORTAL+PAYMENT lane (6 match, 2 drift fixed this pass = A4/A5, 3 flagged as intentional drifts for Jeff's call)
- `3a6154c0`, `51d33d22` (p1-w5) — PARITY-REPORT.md ADMIN/COMHUB/AUDIT/FINANCE + MARKETING/SEO, and VOICE/COMHUB-VOICE lanes. Flags an unexplained second phone number baked into nycmaid pages/emails with no source in nycmaid's live code (needs Jeff), and nycmaid's flag-gated xAI/Yinez SIP-transfer voice feature as unported (inert both sides, Jeff's call).
- `7f535968` (p1-w6) — integrations/webhooks parity report; root-causes the 2026-07-07 Telnyx 401 as an architectural single-global-key-vs-per-tenant-key mismatch (see Section E), not a broken signature implementation.
- `9368cf89`, `724a741c` (p1-w1) — housekeeping (relocate a tracker doc, fix a stale count comment). Zero behavior change.

---

## E. LEADER-named items not found in today's session window

The LEADER order named two additional items that turned out to be **older** than today's ~10:18–10:57am session, from the shared branch history all 6 worktrees inherited before diverging (dated 2026-07-11/12, not on `main`):

- **Telegram signature verification** — `be8e1c1e` "fix(security): telegram webhooks — verify X-Telegram-Bot-Api-Secret-Token fail-closed" (2026-07-11 16:14). All three inbound Telegram webhook routes previously gated only on a body-supplied `message.chat.id`, which is not a secret (leaks via group invites/deep links/logs). This fix is already committed in the shared base all 6 branches carry, but **not on `main`** and not part of today's new work — it needs the same cherry-pick/merge treatment as everything else here, just from further back in history.
- **`assign_cleaner_to_booking` idInTenant check** — this one WAS in today's session: see **B1** (`c21eb8f3`, p1-w4) above.

## Already on open PRs (do not duplicate)

- **PR #14** (`hotfix/tcpa-sms-consent`, OPEN) — apology-batch TCPA opt-out guard now reads canonical `clients.sms_consent`. Cherry-picked from p1-w5 `a199a770` (2026-07-12, not today).
- **PR #15** (`hotfix/selena-idor`, OPEN) — `/api/selena?convoId` cross-tenant IDOR fix, cherry-picked from p1-w4 (2026-07-12, not today). **W3's `17331cbc` is the same bug fixed a second time independently — see B3, do not cherry-pick it too.**

---

## Bottom line for Jeff

One deploy of Section A (13 commits across p1-w2/w3/w4/w6) fixes 2 live 500ing crons, 1 fully-blocked public form, 1 booking mis-time bug, 1 broken referral-portal display, and 6 smaller cron/SMS-parity bugs — none overlap each other, none are on an open PR yet. Section B1 (selena assign_cleaner) is a same-day, no-overlap security add-on. Section B3 is a heads-up not to double-apply the selena IDOR fix — PR #15 already has it. Sections C/D are batch-into-next-normal-review, not urgent.
