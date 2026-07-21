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
| 7 | **nycmaid's customer-facing voice AI doesn't exist on FL.** The ind build answers real calls via Vapi.ai + ElevenLabs (Yinez on the phone). FL only has generic call routing (ring/voicemail/missed-call SMS) — no AI agent wired for nycmaid at all. | 🔴 NOT STARTED | Cutting over today means nycmaid's phone line stops functioning as customers expect the moment it flips. This is a real new build, not a port — needs Jeff to create Vapi/ElevenLabs accounts before any code can be wired. |
| 8 | **Tonight's work isn't deployed.** PR #19 (parity port) and PR #20 (bug-fix pass on #19) are both open, unmerged, not on FL production. | 🔴 NOT DEPLOYED | Even the parts that ARE ready (data sync is live in DB, but code fixes like the client-feedback misroute fix, admin-contacts fix, tenant-resolution fix are NOT live) aren't actually running in production yet. |
| 9 | **Rollback webhook-URL capture — still not done.** Same ⬜ from the 07-10 runbook, unchanged. | ⬜ NOT DONE | Needs Jeff (Telnyx/Stripe/Telegram dashboard access) to read and record the current standalone webhook URLs before the flip, so rollback has something exact to restore to. |

## Deliberately NOT armed tonight (Jeff's explicit call, not a gap)

- `duplicate-schedule-audit` cron — registered in `vercel.json`, will run automatically once deployed (admin-only notification, no client contact — safe to leave armed).
- `renurture` cron — built, tested, **deliberately NOT in `vercel.json`**. Arming it fires real automated win-back SMS/email to real customers on a schedule. Holding until cutover per Jeff's explicit instruction (2026-07-20).
- `sendImmediateSaveIfLapsed()` — built, not wired into the pause/cancel routes. Same reasoning — new live client-SMS trigger, held for cutover.
- Merging PR #20 into PR #19's branch — held for cutover per Jeff's explicit instruction, not a technical blocker.

## GO / NO-GO (2026-07-20 evening)

Not ready. In priority order:
1. Voice — hard blocker, needs Jeff to create external accounts before any code work can start.
2. Deploy — PR #19 + #20 need to land on FL production before the data/bug-fix work tonight means anything live.
3. Stripe — needs a live re-test (a real or Stripe-CLI test event against FL's `/api/webhooks/stripe`), not just a code read.
4. Rollback capture — still needs Jeff's hands on the Telnyx/Stripe/Telegram dashboards.

Everything else from the 07-10 runbook (webhook flip map, the flip sequence itself, rollback steps) is unchanged and still accurate — see that file for the mechanics of the actual flip.
