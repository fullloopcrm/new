# nycmaid → fullloop cutover plan

Written 2026-05-09 after 28-commit foundation session. Branch: `feat/multitenant-foundation`. All local. Read this fresh before doing anything.

## Reality check

There is **no zero-downtime cutover** for an SMS-driven business. Best case: ~5 min hot during a maintenance window. This plan minimizes that.

## Pre-cutover (zero live impact, all reversible)

- [ ] Push `feat/multitenant-foundation` to fullloop GitHub (`gh auth switch --user fullloopcrm` first)
- [ ] Vercel deploys preview URL automatically
- [ ] Set fullloop's Vercel env vars (currently `.env.local` is placeholder):
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`
  - `TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`, `TELNYX_VOICE_CONNECTION_ID`, `TELNYX_FROM_NUMBER`
  - `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `OWNER_PHONES`, `OWNER_EMAIL`, `ADMIN_PASSWORD`
  - `CRON_SECRET`, `ELCHAPO_MONITOR_KEY`
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`
  - `ADMIN_RING_LIST`, `VOICEMAIL_NOTIFY_PHONE`
  - `PORTAL_SECRET`, `TEAM_PORTAL_SECRET`, `TENANT_HEADER_SIG_SECRET`
  - `NEXT_PUBLIC_SITE_URL` (= https://www.thenycmaid.com)
  - Pull from nycmaid's Vercel; transcribe to fullloop's Vercel
- [ ] Add `thenycmaid.com` + `www.thenycmaid.com` to fullloop's Vercel project as configured domains (does NOT cut over until DNS points at fullloop)
- [ ] Smoke test on preview URL:
  - Open preview URL → root marketing page loads
  - Open `/admin` → admin login flow works
  - curl `/api/yinez` POST `{"message":"hi"}` — Yinez responds
  - curl `/api/cron/email-monitor` with CRON_SECRET — runs without error
  - Stripe test webhook event — fullloop receives + records

## Cutover window (3am ET, ~5 min hot)

- [ ] **24 hours ahead:** lower TTL on `thenycmaid.com` DNS to 60s
- [ ] **T-30 min:** post on Telegram owner channel "starting cutover" so you have a log
- [ ] **T-0:** flip Telnyx webhook URL — nycmaid's old Vercel → fullloop's URL
  - Telnyx accepts immediately; retries old URL for ~5 min if any inbound was in flight
- [ ] **T+1:** flip Stripe webhook URL same way
- [ ] **T+2:** flip DNS A/CNAME at registrar — `thenycmaid.com` → fullloop Vercel
- [ ] **T+3:** disable nycmaid's old Vercel project crons (so they don't double-fire with fullloop's)
- [ ] **T+5:** real SMS test — text +18883164019 from your phone, confirm Yinez responds
- [ ] **T+10:** real booking flow — book through `thenycmaid.com/book`, verify Supabase row exists with `tenant_id = '00000000-0000-0000-0000-000000000001'`
- [ ] **T+15 to T+60:** monitor Telegram + admin dashboard for errors

## Rollback (if anything fails T+0 to T+30)

- Flip Telnyx webhook URL back (one minute)
- Flip Stripe webhook URL back (one minute)
- Flip DNS back at registrar (5-60 min propagation depending on actual TTL)
- Re-enable nycmaid's old Vercel crons

## Post-cutover

- nycmaid is now tenant ID `00000000-0000-0000-0000-000000000001` on fullloop
- Old nycmaid Vercel project: keep idle for 30 days as warm rollback. After 30 days of clean operation, archive
- Other 20 tenants: add to fullloop Vercel one at a time, DNS flip per tenant per maintenance window
- The non-nycmaid Yinez guard at `src/lib/yinez/agent.ts` stays on until you explicitly remove it after a tenant is verified ready (data populated, brand_config set, etc.)

## Hard gates before T-0

- [ ] Preview URL handled a real test SMS end-to-end including Yinez tool calls + booking creation
- [ ] All 30+ env vars set on fullloop Vercel (verify each by name, no shortcuts)
- [ ] nycmaid's current `vercel.json` crons confirmed disabled before flipping DNS
- [ ] You're awake, watching, with rollback steps open in another tab, for ≥1 hour post-cutover

## What's NOT in this plan (future work)

- Per-tenant sitemap.ts + robots.ts — fullloop's `/api/tenant-sitemap` is generic; per-tenant rich sitemaps need each tenant's `_data/` files ported and import paths rewritten
- Yinez non-nycmaid guard removal — only after the legacy `core.ts` askYinez (line 2280, dead code) is either deleted or scoped, AND a non-nycmaid tenant has populated data
- Adding the 20 other tenant domains — per-tenant DNS flip, separate windows, separate verification

## Working state (2026-05-09)

- 28 commits on `feat/multitenant-foundation`, all local, tsc clean
- Dev smoke test: 21/21 tenants render 200
- Yinez: scoped, brand-overridden, guarded for non-nycmaid
- Comhub (email + voice): tenant-stamped to nycmaid
- Crons: 3 of 5 nycmaid crons tenant-loop wrapped; 2 (refresh-job-postings, comhub-email) nycmaid-only by infrastructure design
