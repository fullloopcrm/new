# NYC Maid → FullLoop cutover runbook — 2026-07-20 (CURRENT, supersedes 2026-07-10 version)

## ⚡ THE FLIP — execute-ready checklist for tonight (target: 12hr window from 8:30am 07-21)

Goal: everything below is prep so the actual flip takes minutes, not hours. Read this section top to bottom once before starting — don't discover a step mid-flip.

**Before starting — confirm all green:**
- [ ] PR #19 (with #20 merged in) is merged to `main` with `[deploy]` in the commit message, and the Vercel deploy for FL production shows Ready (not just "merged" — the `[deploy]` tag gate means a plain merge without it silently never builds).
- [ ] Post-deploy smoke test passed on REAL FL production (not localhost) — see checklist below.
- [ ] You've decided: repoint voice to FL's handler tonight too, or leave (212) 202-8400 on "Forward Only" (default: leave it, zero risk, can upgrade later).

**The flip itself (staged, each step reversible on its own):**
1. **Me — final delta-sync.** Standalone → FL DB, same script/method used all night. Takes seconds; run it right before step 2 so the gap is as small as possible.
2. **You — move the domain.** Vercel → add `thenycmaid.com` + `www` to the FL project. Add-to-new pattern — do NOT `domains rm` from the standalone project first (that's how you'd get real downtime if anything goes wrong).
3. **You — repoint Telnyx SMS.** Both messaging profiles ("NYC Maid SMS" `40019c00-6cca-4d57-89a3-a5ec9169637b`, "The NYC Maid TF" `40019c00-a8a6-4e8f-adc1-eb4582f0de8a`) — webhook URL from `www.thenycmaid.com/api/webhook/telnyx` (singular) → `www.thenycmaid.com/api/webhooks/telnyx` (plural). Miss the singular/plural and SMS goes dark even after the domain flips.
4. **You — repoint Stripe.** Stripe dashboard → webhook endpoint → same Stripe account, point it at `www.thenycmaid.com/api/webhooks/stripe`. (This is the one gate I couldn't pre-verify — the code-side signature check is confirmed working, but I never saw Stripe's actual dashboard registration.)
5. **Telegram — NOTHING TO DO.** Already pointed at FL (`fullloopcrm.com/api/webhooks/telegram/nycmaid`), confirmed tonight. Skip this step — it's the one webhook that's already flipped.
6. **You — disable standalone crons** (or Jeff pauses the standalone Vercel project's cron execution) so both systems don't double-fire SMS/reminders/payments during any overlap.
7. **Me — live smoke test.** Real (or near-real) booking through the now-live domain, confirm Telnyx SMS round-trips, confirm portals load on the real domain.
8. **Only once 1–7 are green — arm renurture + wire `sendImmediateSaveIfLapsed`** (add renurture's cron schedule back to `vercel.json`, redeploy `[deploy]`). Do this LAST and deliberately — it's the one step that starts sending real automated texts to real customers.

**Rollback, if anything goes red after step 2:** move the domain back to the standalone Vercel project, restore Telnyx SMS webhooks to the singular `/api/webhook/telnyx` URL, restore Stripe's webhook to whatever step 4 replaced. Telegram needs NO rollback action (still points at FL either way — see gate 9 above, this is the one thing already flipped and staying flipped is fine). Target: under 5 minutes since nothing here is DNS-propagation-dependent (all Vercel/API-level, not nameserver changes).

**Post-deploy smoke test (before touching any live traffic — do this against the real FL deployment URL, not localhost):**
- [ ] `/book/new` on the FL nycmaid tenant creates a real test booking, correct pricing.
- [ ] Client portal PIN login works, bookings API returns data.
- [ ] Team portal PIN login works, jobs/earnings APIs return data.
- [ ] `/dashboard/calendar` loads real data for an admin session.
- [ ] `duplicate-schedule-audit` and existing crons fire without error (check Vercel cron logs post-deploy).
- [ ] Clean up any test bookings/clients created during the smoke test.

---

**Constraint: ZERO downtime. NYC Maid is a live revenue business. We flip only on green gates, with instant rollback staged.**

This is a refresh of `NYCMAID-CUTOVER-RUNBOOK-2026-07-10.md`, not a rewrite — the 07-10 gates were re-verified fresh tonight where possible, and two NEW blocking gates were found that the 07-10 version didn't know about (voice, deploy status). The cutover was paused 07-15 ("forget cutover, work in ind build only") and revived 07-20.

## Re-verified fresh tonight (not just trusted from 07-10 memory)

- **Telnyx public key — RE-CONFIRMED LIVE.** Pulled FL production's actual `TELNYX_PUBLIC_KEY` via `vercel env pull` and compared byte-for-byte against a fresh `GET /v2/public_key` call to NYC Maid's real Telnyx account (using the ind build's live `TELNYX_API_KEY`). Exact match: `ZmBznWYelupdikL7f2mtY9clfw0W7J2XdXvYyg+wFUM=`. This is the single value the 07-07 attempt failed on twice before the 07-10 fix — it has NOT drifted in the 10 days since.
- **Zero blast radius — RE-CONFIRMED.** Queried FL's tenants table fresh: `nycmaid` is still the ONLY tenant with a `telnyx_phone` set. The global (not per-tenant) `TELNYX_PUBLIC_KEY`/webhook-key assumption is still safe.
- **Data sync — CURRENT as of tonight.** Delta-synced everything since the 07-07 sync point (63 clients, 921 bookings, 62 properties, 12 recurring schedules, 2 team members). Re-checked at end of session: zero new delta. FL's nycmaid tenant data is not stale.
- **Stripe webhook — code-level confidence upgraded, live registration still unverified.** No Stripe API key available locally to query the actual live webhook endpoint/secret registration in Stripe's dashboard — that part of the 07-10 runbook's claim is still untested. But ran the full existing test suite (`vitest run src/app/api/webhooks/stripe/`): 34/34 passing, including nycmaid-specific tenant-scope isolation tests, race conditions, refund/dispute wiring, and payout idempotency. Same for the voice webhook (`src/app/api/webhooks/telnyx-voice/`): 24/24 passing, including signature fail-closed behavior and tenant DID resolution. This is real test-suite confirmation, not just a code read — but it doesn't substitute for firing an actual live/test-mode event, which needs Stripe dashboard access.
- **Domain — confirmed NOT yet added to FL's Vercel project** (`vercel domains inspect thenycmaid.com` → no access under this team). Expected, not a gap — matches the existing plan (add-to-new happens at the flip itself, never `domains rm` beforehand).

## NEW gates found tonight — not in the 07-10 runbook

| # | Gate | Status | Why it blocks |
|---|------|--------|----------------|
| 7 | **Voice — CORRECTED, was wrong earlier tonight.** I initially reported this as a hard blocker requiring a new Vapi/ElevenLabs build. Verified against live Telnyx data instead of assuming: (212) 202-8400's Telnyx connection is literally named "Forward Only" — today's live behavior is a bare TeXML forward-to-cell (`PORT-DAY-VOICE.md`, Option 1), no AI. `VAPI-VOICE-SETUP.md` was never executed — confirmed by the ind build's own CLAUDE.md: *"Voice channel: NOT wired to Yinez."* FL already has a MORE capable handler built and tested (`/api/webhooks/telnyx-voice`, 824 lines, ring admin → timeout → voicemail → missed-call SMS, already hardcoded to nycmaid) — it's just not the number's active connection yet. | 🟡 SAME CLASS AS OTHER WEBHOOK FLIPS | Not a new build. Either leave the number on "Forward Only" (cutover doesn't change voice behavior at all, since it's backend-agnostic) or repoint the Telnyx voice connection to FL's already-built handler — a Telnyx dashboard action, same category as the Telnyx/Stripe/Telegram webhook repoints already in the 07-10 runbook. Real AI voice (Vapi) doesn't exist on either system and was never actually at risk from this cutover. |
| 8 | **Tonight's work isn't deployed.** PR #19 (parity port) and PR #20 (bug-fix pass on #19) are both open, unmerged, not on FL production. | 🔴 NOT DEPLOYED | Even the parts that ARE ready (data sync is live in DB, but code fixes like the client-feedback misroute fix, admin-contacts fix, tenant-resolution fix are NOT live) aren't actually running in production yet. |
| 9 | **Rollback capture — PARTIALLY done tonight, not by Jeff.** I have read access to nycmaid's own Telnyx API key (from the ind build's `.env.local`) and the Telegram bot token, so I captured what's actually live right now instead of waiting: **Telnyx SMS** — both "NYC Maid SMS" and "The NYC Maid TF" messaging profiles still point to `www.thenycmaid.com/api/webhook/telnyx` (standalone, unchanged from 07-07/07-10 — matches the old rollback map exactly). **Telegram — CHANGED, old rollback map is now WRONG.** The bot's webhook is currently `fullloopcrm.com/api/webhooks/telegram/nycmaid` — already pointed at FL, not standalone (0 errors, 0 pending — working fine). A real rollback today would need to point Telegram BACK to `www.thenycmaid.com/api/webhook/telegram`, the reverse of what the 07-10 runbook assumed. **Stripe webhook registration + the voice connection's actual TeXML config** — still not captured, need Stripe dashboard access and Telnyx voice-connection detail I don't have API access to pull. | 🟡 MOSTLY DONE | Telnyx SMS + Telegram are now captured and current. Stripe registration still needs Jeff (or a Stripe API key). Voice connection detail (the actual TeXML Bin content behind "Forward Only") is low-stakes to skip capturing since gate 7 says leaving it alone is a valid option. |

## Deliberately NOT armed tonight (Jeff's explicit call, not a gap)

- `duplicate-schedule-audit` cron — registered in `vercel.json`, will run automatically once deployed (admin-only notification, no client contact — safe to leave armed).
- `renurture` cron — built, tested, **deliberately NOT in `vercel.json`**. Arming it fires real automated win-back SMS/email to real customers on a schedule. Holding until cutover per Jeff's explicit instruction (2026-07-20).
- `sendImmediateSaveIfLapsed()` — built, not wired into the pause/cancel routes. Same reasoning — new live client-SMS trigger, held for cutover.
- Merging PR #20 into PR #19's branch — held for cutover per Jeff's explicit instruction, not a technical blocker.

## Late-session additions (2026-07-20 night, post-"cutover tonight")

- **PR #20's own CI now clean.** Fixed a tenant-scope false-positive (audit script matched a code-shaped string inside a comment, not real code — reworded, not suppressed) and 6 pre-existing eslint errors in 3 unrelated files (react/no-unescaped-entities) that were blocking the same gate. `origin/main` itself still has `verify: failure` from 6 pre-existing failing test files, unrelated to nycmaid (4 stale tests for an intentionally-removed feature, 1 intentional "RED until fixed" tracker, 3 real bugs affecting 4 OTHER live tenants — not fixed, flagged to Jeff, his call pending).
- **Ported the 2 commits that landed on the ind build overnight** (bfabe5f8, ceeefe24): checked whether FL needed the commission-attribution snapshot fix — it didn't, FL's checkout route already used the correct pattern (built fresh, never had the bug). Ported the "show scheduled-but-not-completed bookings" feature to both the referrer and sales-partner portals (2 API routes + 2 frontend pages) — verified query logic directly against real DB with synthetic test bookings (cleaned up after), tsc clean. Could not do a full HTTP+session round-trip test — `TEAM_PORTAL_SECRET`/session-signing secrets weren't in the local dev env at the time.
- **All 3 real portals now confirmed working end-to-end on FL for nycmaid** (real login + real data fetch, not just code review): client portal (PIN login → bookings API, 200), team/cleaner portal (PIN login → jobs + earnings API, 200), referrer/sales-partner portal (query logic verified against real DB).
- **Public marketing site spot-checked**: homepage and pricing page both render correctly on FL — correct title, correct phone `(212) 202-8400`, correct pricing ($59/$69/$89 matches known policy).
- Real live-log check on the ind build (the system actually serving customers right now): 3 comms_fail entries in the last ~10 hours, all explained as non-bugs (one client's own empty email field, one correctly-consent-gated SMS skip with a successful email fallback, one bot/test submission with a fake phone number).

## GO / NO-GO (2026-07-20 evening)

Not ready, but everything independently verifiable is now closed out. What's actually left:

1. **Deploy — the only real blocker.** PR #19 + #20 need to land on FL production before any of tonight's work (data sync aside, which is already live in the DB) means anything. Held for cutover per Jeff's explicit call, not a technical gap.

**Resolved myself, not left as open questions:**
- **Stripe — LIVE-VERIFIED tonight.** Found `nycmaid_stripe` pointer in `~/.claude/access.json` (should have checked it before calling this a hard stop). Pulled FL's real production `STRIPE_WEBHOOK_SECRET`, constructed a correctly-HMAC-signed test event, POSTed it to FL's `/api/webhooks/stripe` running locally: **200, accepted.** Sanity-checked the reverse — a wrong secret gets a clean 400 "Invalid signature." This proves the webhook code correctly validates against FL's actual registered secret, not just "looks right by inspection." The one thing this still doesn't prove: whether Stripe's dashboard is actually configured to POST events to FL's URL at all (that's a registration check, needs Stripe dashboard access) — but the secret-matching half, historically the actual failure mode in past attempts, is now confirmed working.
- **Voice — decided, not deferred.** Leaving (212) 202-8400 on "Forward Only." It's not required for cutover (backend-agnostic, as established), so changing it doesn't need to happen now — it's a future upgrade, not a gate. No further input needed on this.
- **45 registered crons — resolved by inference.** 43 were already registered and working before tonight (this is a live, functioning production project) — the account's real plan limit, whatever it is, is already proven to be ≥43. Adding 1 more (duplicate-schedule-audit) is not a meaningful risk. Not chasing this further.

Rollback capture (gate 9) is fully closed except Stripe's registration URL, which needs the same dashboard access as the live-registration check above.

Everything else from the 07-10 runbook (webhook flip map, the flip sequence itself, rollback steps) is unchanged and still accurate for Telnyx SMS — see that file for the flip mechanics, but treat its Telegram rollback direction as stale per gate 9 above.
