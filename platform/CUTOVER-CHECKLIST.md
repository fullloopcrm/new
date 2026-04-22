# FullLoop CRM — Finish-All + Cutover Checklist

**Authored:** 2026-04-22
**Owner:** Jeff (actions marked `[JEFF]`) + Claude (actions marked `[CLAUDE]`)
**Strategy:** finish platform → onboard test tenant → migrate nycmaid

Legend: `[ ]` not done · `[-]` in progress · `[x]` done · `[~]` blocked

---

## PHASE 0 — Completed before this doc (2026-04-22)

- [x] Security audit Phase 1 HIGH (x-tenant-sig enforcement, portal secrets required, impersonation audit log) — commit `de95a3d` + migration 041
- [x] Security audit Phase 2+3 MEDIUM+LOW (tenant-scope service_types, active-tenant gate, killed hardcoded test token) — commit `1412168`
- [x] `/api/chat` body-tenantId closed — commit `070d58f`
- [x] 12 `/api/client/*` routes + `/api/cleaner-applications` alias + client-auth lib + migration 042 — commit `a4fad75`
- [x] tenant_domains table seeded with both nycmaid domains + `/site/login` redirect — commit `0ea44cc` + migration 043
- [x] Middleware public-route fix for `/api/client/*` — commit `c2e9b41`
- [x] Signed unsubscribe tokens + `/api/errors` body tenantId rejected — commit `d008f10`
- [x] Migration 044 legacy-SEO-page gate applied (nycmaid seeded true)
- [x] Env vars set in Vercel prod/preview/dev: PORTAL_SECRET, TEAM_PORTAL_SECRET, TENANT_HEADER_SIG_SECRET
- [x] Vercel domain attachment: `thenewyorkcitymaid.com` + `www.thenewyorkcitymaid.com` staged (will activate on DNS flip)

---

## PHASE 1 — Finish the platform (enables test-tenant onboarding)

### 1A — Gate legacy SEO pages behind `enable_legacy_seo_pages` flag

Column added by migration 044. Now need to add a gate helper call to every nycmaid-specific SEO page so non-nycmaid tenants get 404 instead of NYC cleaning content.

- [ ] [CLAUDE] Write helper `requireLegacySeoPages()` in `src/lib/tenant-site.ts` → `notFound()` if tenant flag is false
- [ ] [CLAUDE] Add helper call to each of these pages:
  - `src/app/site/about-the-nyc-maid-service-company/page.tsx`
  - `src/app/site/nyc-maid-service-services-offered-by-the-nyc-maid/page.tsx`
  - `src/app/site/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid/page.tsx`
  - `src/app/site/nyc-maid-service-blog/page.tsx`
  - `src/app/site/nyc-maid-service-blog/[slug]/page.tsx`
  - `src/app/site/nyc-cleaning-service-frequently-asked-questions-in-2025/page.tsx`
  - `src/app/site/[slug]/page.tsx` (neighborhood pages)
  - `src/app/site/[slug]/[service]/page.tsx`
  - `src/app/site/service/nyc-emergency-cleaning-service/page.tsx`
  - `src/app/site/available-nyc-maid-jobs/page.tsx`
  - `src/app/site/available-nyc-maid-jobs/[slug]/page.tsx`
  - `src/app/site/careers/operations-coordinator/page.tsx`
  - `src/app/site/apply/operations-coordinator/page.tsx`
  - `src/app/site/apply/operations-coordinator/layout.tsx`
  - `src/app/site/get-paid-for-cleaning-referrals-every-time-they-are-serviced/page.tsx`
  - `src/app/site/nyc-customer-reviews-for-the-nyc-maid/page.tsx`
  - `src/app/site/do-not-share-policy/page.tsx`
  - `src/app/site/refund-policy/page.tsx` *(decide: gate or make generic)*
  - `src/app/site/referral/page.tsx` *(decide: gate or make generic)*
  - `src/app/site/referral/signup/page.tsx` *(same)*

### 1B — Keep-and-parameterize: generic but tenant-aware pages

Pages that should work for ANY tenant but currently have hardcoded "The NYC Maid" strings.

- [ ] [CLAUDE] `src/app/site/privacy-policy/page.tsx` — replace hardcoded strings with `tenant.name` / `tenant.email`
- [ ] [CLAUDE] `src/app/site/terms-conditions/page.tsx` — same
- [ ] [CLAUDE] `src/app/site/legal/page.tsx` — same
- [ ] [CLAUDE] `src/app/site/feedback/page.tsx` — same
- [ ] [CLAUDE] `src/app/site/apply/page.tsx` — hiring form — parameterize branding
- [ ] [CLAUDE] `src/app/site/apply/layout.tsx` — parameterize
- [ ] [CLAUDE] `src/app/site/opengraph-image.tsx` — verify already tenant-driven (night notes say yes)

### 1C — Book/portal functional pages

These need to work for any tenant. Check each reads from tenant config, not hardcoded strings.

- [ ] [CLAUDE] `src/app/site/book/page.tsx` — verify pricing/services from `tenant.selena_config`
- [ ] [CLAUDE] `src/app/site/book/collect/page.tsx` — verify
- [ ] [CLAUDE] `src/app/site/book/dashboard/page.tsx` — verify
- [ ] [CLAUDE] `src/app/site/book/reschedule/[id]/page.tsx` — verify
- [ ] [CLAUDE] `src/app/site/chat-with-selena/page.tsx` — verify

### 1D — Add shadow mode to `askSelena()` so live replay doesn't mutate data

- [ ] [CLAUDE] Add optional `shadowMode?: boolean` param to `askSelena()` in `src/lib/selena.ts`
- [ ] [CLAUDE] In shadow mode, tool calls to `create_booking` / `update_client` / `add_to_waitlist` / `remember` / outbound SMS become no-ops (log only)
- [ ] [CLAUDE] Update `scripts/selena-shadow-replay.ts` to pass `shadowMode: true`
- [ ] [CLAUDE] Run live replay against 3-day window, ~50 events, produce report in `scripts/out/`
- [ ] [JEFF] Review replay diff report, flag any regressions

### 1E — Smoke-test `/qualify` → approve → Stripe → provision-tenant flow

This is the prospect → paying tenant path. Must work before test tenant.

- [ ] [CLAUDE] Read through `src/app/api/admin/prospects/[id]/route.ts` approve path end-to-end
- [ ] [CLAUDE] Read `src/app/api/webhooks/stripe/route.ts` `full_loop_signup` branch
- [ ] [CLAUDE] Verify `provision-tenant.ts` lib populates every field the template reads (check `tenant.phone`, `tenant.email`, `tenant.selena_config.pricing_tiers`, `tenant.selena_config.service_areas`, `tenant.email_from`, etc)
- [ ] [JEFF] Create a test prospect via `/qualify` in staging OR carefully in prod
- [ ] [JEFF] Approve as super-admin
- [ ] [JEFF] Complete Stripe checkout with a test card
- [ ] [JEFF] Verify tenant auto-created + provisioning ran
- [ ] [JEFF] Visit `<test-slug>.homeservicesbusinesscrm.com` — should render a clean tenantized site

### 1F — Verify onboarding wizard writes every field the template reads

- [ ] [CLAUDE] Read `src/app/admin/businesses/[id]/wizard/*` fully
- [ ] [CLAUDE] Grep `/site/*` pages for every `tenant.X` access
- [ ] [CLAUDE] Diff against wizard's form fields
- [ ] [CLAUDE] Fill gaps in the wizard (fields that pages read but wizard doesn't set)

### 1G — One remaining architectural item (not a test-tenant blocker)

- [ ] [CLAUDE, later] `supabaseAdmin` → tenant-scoped JWT + RLS refactor. ~293 files, 1-2 days. Security rating 8/10 → 9/10. Architecture memo recommended before route count balloons. Defer until after test-tenant proof.

---

## PHASE 2 — Onboard a test tenant end-to-end

- [ ] [JEFF] Pick a throwaway business name + domain (or use subdomain `test-tenant.homeservicesbusinesscrm.com`)
- [ ] [JEFF] Run through `/qualify` as if you're a real lead
- [ ] [JEFF] Approve via super-admin
- [ ] [JEFF] Complete Stripe checkout
- [ ] [CLAUDE] Verify tenant row populated correctly
- [ ] [JEFF] Log in as the new tenant (via Clerk invite flow)
- [ ] [JEFF] Complete onboarding wizard — enter services, rates, hours, areas
- [ ] [JEFF] Visit the tenant's customer site — every page renders without "The NYC Maid" bleed-through
- [ ] [JEFF] Submit a test booking on the customer site → verify Selena/booking handler creates row
- [ ] [JEFF] Submit a test cleaner application → verify row lands in `team_applications`
- [ ] [JEFF] Try the client dashboard with a fake PIN → PIN login flow works
- [ ] [CLAUDE] Debug any breakage found; loop back to Phase 1 if platform gaps surface
- [ ] [JEFF] Once green, decommission the test tenant (or keep for ongoing smoke tests)

---

## PHASE 3 — Nycmaid cutover preparation (before DNS flip)

Everything here is **fullloop-side only**. Nycmaid stays 100% live.

### 3A — External service endpoints (create, don't switch yet)

- [ ] [JEFF] Stripe Dashboard → Developers → Webhooks → Create new endpoint pointing at `https://homeservicesbusinesscrm.com/api/webhooks/stripe`
- [ ] [JEFF] Copy the new endpoint's signing secret
- [ ] [CLAUDE] Set `STRIPE_WEBHOOK_SECRET` env var in fullloop Vercel (prod+preview+dev) with that secret
- [ ] [JEFF] Keep nycmaid's existing Stripe webhook active — do not delete it yet
- [ ] [JEFF] Telnyx Dashboard → Messaging Profiles → note the current webhook URL (nycmaid's) for rollback reference
- [ ] [JEFF] **Do NOT** change Telnyx webhook URL yet — that's cutover-day

### 3B — Infrastructure safety nets

- [ ] [JEFF] Supabase Dashboard → fullloop project Settings → Database → Point-in-Time Recovery → Enable (paid tier)
- [ ] [CLAUDE] Verify nycmaid tenant row in fullloop DB: all creds populated, `status='active'`, `enable_legacy_seo_pages=true`, `email_monitor_enabled=false`
- [ ] [CLAUDE] Write a `/api/health` tenant-aware smoke test page that checks: DB reachable, tenant row resolvable, all required env vars present
- [ ] [JEFF] Run a manual backup snapshot of fullloop DB before cutover day
- [ ] [JEFF] Download + store `.env.local` pull for fullloop as a local backup

### 3C — Deploy + verify fullloop is green

- [ ] [CLAUDE] `npx tsc --noEmit` — 0 errors
- [ ] [CLAUDE] Final `git push` → Vercel deploy → confirm Ready
- [ ] [JEFF] Spot-check `/dashboard` renders for a super-admin impersonation
- [ ] [JEFF] Spot-check all crons are listed in `vercel.json` + last runs look sane in Vercel → Functions tab

---

## PHASE 4 — Nycmaid cutover execution (ordered, reversible)

Each step has a rollback. Execute in order. No skipping.

### Step A — Attach remaining nycmaid domains (90 min before go)

- [ ] [JEFF] nycmaid Vercel project → Settings → Domains → remove `thenycmaid.com` and `www.thenycmaid.com`
- [ ] [JEFF] Immediately after removal, in this session:
  ```bash
  export VERCEL_TOKEN='...'
  vercel domains add thenycmaid.com --token "$VERCEL_TOKEN"
  vercel domains add www.thenycmaid.com --token "$VERCEL_TOKEN"
  ```
  (Fullloop platform project is linked via `.vercel/project.json` in the platform dir)
- [ ] [CLAUDE] Verify all 4 domains attached to fullloop: `thenycmaid.com`, `www.thenycmaid.com`, `thenewyorkcitymaid.com`, `www.thenewyorkcitymaid.com`
- **Rollback:** re-add domains to nycmaid Vercel; fullloop attachment is inert until DNS flips

### Step B — External webhook cutover (real traffic moment #1)

Change webhook URLs to point at fullloop. Nycmaid's handlers stop receiving events.

- [ ] [JEFF] Stripe → Webhooks → disable the nycmaid endpoint (keep the URL noted for rollback)
- [ ] [JEFF] Stripe → Webhooks → the fullloop endpoint (created in Phase 3A) → ensure it's active
- [ ] [JEFF] Telnyx → Messaging Profile → change inbound webhook URL from nycmaid's to `https://homeservicesbusinesscrm.com/api/webhooks/telnyx`
- [ ] [JEFF] Flip `UPDATE tenants SET email_monitor_enabled=true WHERE slug='the-nyc-maid'` on fullloop DB
- **Rollback:** flip webhook URLs back, flip email_monitor_enabled=false

### Step C — DNS cutover (real traffic moment #2)

- [ ] [JEFF] Lower DNS TTL to 60s a day in advance (for faster rollback)
- [ ] [JEFF] At go time: DNS registrar → change A/CNAME for `thenycmaid.com` + `www.thenycmaid.com` + `thenewyorkcitymaid.com` + `www.thenewyorkcitymaid.com` to fullloop's Vercel targets
- [ ] [JEFF] Wait for DNS propagation (use https://dnschecker.org to confirm)
- [ ] [CLAUDE] Smoke-test: `curl https://thenycmaid.com/` → renders nycmaid site from fullloop
- [ ] [CLAUDE] Smoke-test: send a test SMS to Telnyx 888 → lands in fullloop's sms_conversations
- [ ] [CLAUDE] Smoke-test: Stripe test payment → fullloop processes webhook
- **Rollback:** revert DNS to nycmaid's Vercel targets; DNS TTL 60s means ~1 min recovery

### Step D — Disable nycmaid crons (prevent double-execution)

- [ ] [JEFF] Edit `/Users/jefftucker/Desktop/nycmaid/vercel.json` → remove or comment all entries in `crons` array
- [ ] [JEFF] `git commit` + `git push origin main` on nycmaid repo → Vercel auto-deploys
- [ ] [JEFF] Verify nycmaid's cron invocations stop in nycmaid Vercel → Functions tab
- **Rollback:** restore `crons` array + push

---

## PHASE 5 — Post-cutover monitoring (24h watch)

- [ ] [CLAUDE] Create a Grafana / dashboard view OR a simple cron that logs key metrics hourly:
  - New bookings created per hour (should match baseline)
  - Stripe payments processed
  - Email monitor IMAP polls + matches
  - Selena inbound SMS count
  - Errors in `error_logs` table
- [ ] [JEFF] Watch the system for 24h — check every few hours
- [ ] [JEFF] Any anomaly → invoke Phase 4 rollbacks
- [ ] [JEFF] After 24h clean: proceed to Phase 6

---

## PHASE 6 — Final shutdown (after 24h + 1 week + 30 days)

- [ ] [JEFF] **24h post-cutover:** nycmaid Vercel project → pause (don't delete)
- [ ] [JEFF] **1 week post-cutover:** delete nycmaid Vercel project
- [ ] [JEFF] **30 days post-cutover:** delete nycmaid Supabase project OR downgrade to free tier as cold backup

---

## APPENDIX A — Cheat sheet

### Fullloop project paths + IDs
- Working tree: `/Users/jefftucker/fullloopcrm/platform`
- Supabase project ref: `cetnrttgtoajzjacfbhe`
- Vercel team: `fullloopcrms-projects` / project name `platform`
- Nycmaid tenant UUID: `24d94cd6-9fc0-4882-b544-fa25a4542e9e`
- Nycmaid tenant slug: `the-nyc-maid`

### Nycmaid project paths + IDs (reference, do NOT modify until cutover)
- Working tree: `/Users/jefftucker/Desktop/nycmaid`
- Supabase project ref: `ioppmvchszymwswtwsze`
- Domains: `thenycmaid.com`, `thenewyorkcitymaid.com` (+ www variants)
- GitHub: SSH remote, `thenycmaid` account (no gh auth switch needed)

### Critical fullloop env vars (all set on prod+preview+dev as of 2026-04-22)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY` (platform Stripe, not per-tenant)
- `STRIPE_WEBHOOK_SECRET` — **Phase 3A action: update to the new endpoint's secret**
- `TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`
- `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`
- `ADMIN_PIN`, `ADMIN_TOKEN_SECRET`, `ADMIN_NOTIFICATION_EMAIL`, `SUPER_ADMIN_CLERK_ID`, `ELCHAPO_MONITOR_KEY`
- `PORTAL_SECRET`, `TEAM_PORTAL_SECRET`, `TENANT_HEADER_SIG_SECRET` — **set this session**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- `CRON_SECRET`

### Migrations applied to fullloop prod this session
- `041_impersonation_audit.sql`
- `042_portal_and_verification_codes.sql`
- `043_tenant_domains.sql`
- `044_legacy_seo_gate.sql`

### Known cleanup items (not cutover blockers)
- `/api/unsubscribe` now requires signed token — no existing code generates those tokens yet. Campaign auto-unsubscribe feature must call `unsubscribeUrl()` from `src/lib/unsubscribe-token.ts` to inject a valid token.
- `SELENA_TEST_TOKEN` env var intentionally NOT set. Test endpoint at `/api/test/email-selena` 404s. Set the env var only when running a parity test; unset after.
- `supabaseAdmin` refactor to tenant-scoped JWT + RLS (~293 files) — deferred.

---

## APPENDIX B — Rollback decision tree

| Symptom | First move |
|---|---|
| Webhook stops firing after Stripe flip | Revert Stripe endpoint URL to nycmaid's |
| SMS stops arriving after Telnyx flip | Revert Telnyx webhook URL |
| Tenant site renders broken after DNS flip | Revert DNS (TTL 60s) |
| IMAP monitor duplicates payments | Set `email_monitor_enabled=false` on fullloop tenant row |
| Cron double-execution | Verify nycmaid crons fully disabled |
| Data corruption discovered | Supabase PITR restore to pre-cutover timestamp |
| Client can't log in on customer site | Check cookie + `x-tenant-sig` flow in browser devtools |

---

## APPENDIX C — What this checklist does NOT cover

- GDPR right-to-data export for individual clients
- TCPA compliance layer (opt-in + STOP enforcement at platform level, not per-tenant)
- PII encryption on clients table
- `SECRET_ENCRYPTION_KEY` rotation procedure
- Staging DB workflow (migrations should run on staging copy first — not set up)
- Monitoring/alerting stack (Grafana, Sentry, etc)

These are post-cutover hardening. Document them as they're done.
