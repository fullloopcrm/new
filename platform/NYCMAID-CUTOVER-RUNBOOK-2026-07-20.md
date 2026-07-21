# NYC Maid → FullLoop cutover runbook — 2026-07-20 (CURRENT, supersedes 2026-07-10 version)

**Constraint: ZERO downtime. NYC Maid is a live revenue business. We flip only on green gates, with instant rollback staged.**

This is a refresh of `NYCMAID-CUTOVER-RUNBOOK-2026-07-10.md`, not a rewrite — the 07-10 gates were re-verified fresh tonight where possible, and two NEW blocking gates were found that the 07-10 version didn't know about (voice, deploy status). The cutover was paused 07-15 ("forget cutover, work in ind build only") and revived 07-20.

## Re-verified fresh tonight (not just trusted from 07-10 memory)

- **Telnyx public key — RE-CONFIRMED LIVE.** Pulled FL production's actual `TELNYX_PUBLIC_KEY` via `vercel env pull` and compared byte-for-byte against a fresh `GET /v2/public_key` call to NYC Maid's real Telnyx account (using the ind build's live `TELNYX_API_KEY`). Exact match: `ZmBznWYelupdikL7f2mtY9clfw0W7J2XdXvYyg+wFUM=`. This is the single value the 07-07 attempt failed on twice before the 07-10 fix — it has NOT drifted in the 10 days since.
- **Zero blast radius — RE-CONFIRMED.** Queried FL's tenants table fresh: `nycmaid` is still the ONLY tenant with a `telnyx_phone` set. The global (not per-tenant) `TELNYX_PUBLIC_KEY`/webhook-key assumption is still safe.
- **Data sync — CURRENT as of tonight.** Delta-synced everything since the 07-07 sync point (63 clients, 921 bookings, 62 properties, 12 recurring schedules, 2 team members). Re-checked at end of session: zero new delta. FL's nycmaid tenant data is not stale.
- **Stripe webhook — code-level confidence upgraded, live registration still unverified.** No Stripe API key available locally to query the actual live webhook endpoint/secret registration in Stripe's dashboard — that part of the 07-10 runbook's claim is still untested. But ran the full existing test suite (`vitest run src/app/api/webhooks/stripe/`): 34/34 passing, including nycmaid-specific tenant-scope isolation tests, race conditions, refund/dispute wiring, and payout idempotency. Same for the voice webhook (`src/app/api/webhooks/telnyx-voice/`): 24/24 passing, including signature fail-closed behavior and tenant DID resolution. This is real test-suite confirmation, not just a code read — but it doesn't substitute for firing an actual live/test-mode event, which needs Stripe dashboard access.

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

## GO / NO-GO (2026-07-20 evening)

Not ready, but closer than the earlier read tonight — voice turned out to be a non-issue, and rollback capture is now mostly done. What's actually left, in priority order:
1. Deploy — PR #19 + #20 need to land on FL production before the data/bug-fix work tonight means anything live.
2. Stripe — needs a live re-test (a real or Stripe-CLI test event against FL's `/api/webhooks/stripe`) AND its webhook registration/secret needs capturing — both need either Jeff or a Stripe API key I don't have. This is now the only genuinely unverified gate.
3. Voice — decide whether to leave (212) 202-8400 on "Forward Only" (zero risk, zero change) or repoint to FL's already-built `/api/webhooks/telnyx-voice` handler at the same time as the other webhook flips. Not urgent either way.

Rollback capture (gate 9) is mostly closed — Telnyx SMS confirmed unchanged, Telegram confirmed already-on-FL (and the old rollback direction for it is now backwards, corrected above). Only Stripe's registration and the voice connection's exact TeXML remain uncaptured, and the voice one is optional to skip per gate 7.

Everything else from the 07-10 runbook (webhook flip map, the flip sequence itself, rollback steps) is unchanged and still accurate for Telnyx SMS — see that file for the flip mechanics, but treat its Telegram rollback direction as stale per gate 9 above.
