# NYC Maid → FullLoop cutover runbook — 2026-07-20 (CURRENT, supersedes 2026-07-10 version)

**Constraint: ZERO downtime. NYC Maid is a live revenue business. We flip only on green gates, with instant rollback staged.**

This is a refresh of `NYCMAID-CUTOVER-RUNBOOK-2026-07-10.md`, not a rewrite — the 07-10 gates were re-verified fresh tonight where possible, and two NEW blocking gates were found that the 07-10 version didn't know about (voice, deploy status). The cutover was paused 07-15 ("forget cutover, work in ind build only") and revived 07-20.

## Re-verified fresh tonight (not just trusted from 07-10 memory)

- **Telnyx public key — RE-CONFIRMED LIVE.** Pulled FL production's actual `TELNYX_PUBLIC_KEY` via `vercel env pull` and compared byte-for-byte against a fresh `GET /v2/public_key` call to NYC Maid's real Telnyx account (using the ind build's live `TELNYX_API_KEY`). Exact match: `ZmBznWYelupdikL7f2mtY9clfw0W7J2XdXvYyg+wFUM=`. This is the single value the 07-07 attempt failed on twice before the 07-10 fix — it has NOT drifted in the 10 days since.
- **Zero blast radius — RE-CONFIRMED.** Queried FL's tenants table fresh: `nycmaid` is still the ONLY tenant with a `telnyx_phone` set. The global (not per-tenant) `TELNYX_PUBLIC_KEY`/webhook-key assumption is still safe.
- **Data sync — CURRENT as of tonight.** Delta-synced everything since the 07-07 sync point (63 clients, 921 bookings, 62 properties, 12 recurring schedules, 2 team members). Re-checked at end of session: zero new delta. FL's nycmaid tenant data is not stale.
- **Stripe webhook — NOT independently re-verified tonight.** No Stripe API key available locally to query live webhook endpoint registration. The 07-10 runbook's claim ("NOT broken — 0 per-tenant stripe keys, platform key used, `STRIPE_WEBHOOK_SECRET` readable") was not re-tested. Code path (`/api/webhooks/stripe`) was read tonight and looks structurally correct (`isNycMaid`/`NYCMAID_TENANT_ID` gating present, signature verification present) but this is a code read, not a live test.

## NEW gates found tonight — not in the 07-10 runbook

| # | Gate | Status | Why it blocks |
|---|------|--------|----------------|
| 7 | **Voice — CORRECTED, was wrong earlier tonight.** I initially reported this as a hard blocker requiring a new Vapi/ElevenLabs build. Verified against live Telnyx data instead of assuming: (212) 202-8400's Telnyx connection is literally named "Forward Only" — today's live behavior is a bare TeXML forward-to-cell (`PORT-DAY-VOICE.md`, Option 1), no AI. `VAPI-VOICE-SETUP.md` was never executed — confirmed by the ind build's own CLAUDE.md: *"Voice channel: NOT wired to Yinez."* FL already has a MORE capable handler built and tested (`/api/webhooks/telnyx-voice`, 824 lines, ring admin → timeout → voicemail → missed-call SMS, already hardcoded to nycmaid) — it's just not the number's active connection yet. | 🟡 SAME CLASS AS OTHER WEBHOOK FLIPS | Not a new build. Either leave the number on "Forward Only" (cutover doesn't change voice behavior at all, since it's backend-agnostic) or repoint the Telnyx voice connection to FL's already-built handler — a Telnyx dashboard action, same category as the Telnyx/Stripe/Telegram webhook repoints already in the 07-10 runbook. Real AI voice (Vapi) doesn't exist on either system and was never actually at risk from this cutover. |
| 8 | **Tonight's work isn't deployed.** PR #19 (parity port) and PR #20 (bug-fix pass on #19) are both open, unmerged, not on FL production. | 🔴 NOT DEPLOYED | Even the parts that ARE ready (data sync is live in DB, but code fixes like the client-feedback misroute fix, admin-contacts fix, tenant-resolution fix are NOT live) aren't actually running in production yet. |
| 9 | **Rollback webhook-URL capture — still not done.** Same ⬜ from the 07-10 runbook, unchanged. Now also needs to capture the voice connection ("Forward Only") alongside SMS/Stripe/Telegram, per gate 7. | ⬜ NOT DONE | Needs Jeff (Telnyx/Stripe/Telegram dashboard access) to read and record the current standalone webhook + voice-connection config before the flip, so rollback has something exact to restore to. |

## Deliberately NOT armed tonight (Jeff's explicit call, not a gap)

- `duplicate-schedule-audit` cron — registered in `vercel.json`, will run automatically once deployed (admin-only notification, no client contact — safe to leave armed).
- `renurture` cron — built, tested, **deliberately NOT in `vercel.json`**. Arming it fires real automated win-back SMS/email to real customers on a schedule. Holding until cutover per Jeff's explicit instruction (2026-07-20).
- `sendImmediateSaveIfLapsed()` — built, not wired into the pause/cancel routes. Same reasoning — new live client-SMS trigger, held for cutover.
- Merging PR #20 into PR #19's branch — held for cutover per Jeff's explicit instruction, not a technical blocker.

## GO / NO-GO (2026-07-20 evening)

Not ready, but closer than the earlier read tonight — voice turned out to be a non-issue, not a hard blocker. In priority order:
1. Deploy — PR #19 + #20 need to land on FL production before the data/bug-fix work tonight means anything live.
2. Stripe — needs a live re-test (a real or Stripe-CLI test event against FL's `/api/webhooks/stripe`), not just a code read.
3. Rollback capture — still needs Jeff's hands on the Telnyx/Stripe/Telegram/voice-connection dashboards.
4. Voice — decide whether to leave (212) 202-8400 on "Forward Only" (zero risk, zero change) or repoint to FL's already-built `/api/webhooks/telnyx-voice` handler at the same time as the other webhook flips. Either way this is a same-day dashboard action, not a project.

Everything else from the 07-10 runbook (webhook flip map, the flip sequence itself, rollback steps) is unchanged and still accurate — see that file for the mechanics of the actual flip.
