# Marketing Feature Diff — 2026-04-27

Goal: get the marketing site to honestly reflect what the tenant area actually does, so a price can sit next to it without overclaim.

Audit scope: tenant area = `src/app/dashboard/**`, `src/app/admin/**`, `src/app/api/**`, `src/lib/**`. Marketing site = `src/app/(marketing)/**` + `src/components/home/**`. Source-of-truth verification by file/line where called out.

Verdict: **the marketing site UNDERSELLS the platform on capability and OVERSELLS on a few specific named features.** Net: a careful copy + structure pass — no major engineering — gets the site honest enough to put a price next to.

---

## 1. The tenant area, as it actually exists

### Locked nav (`src/app/dashboard/dashboard-shell.tsx:32-103`)
- 00 The Loop · 01 Sales (Leads, Pipeline) · 02 Schedule (Bookings, Calendar, Recurring) · 03 Clients (All Clients, SMS Inbox) · 04 Team (Members) · 05 Finance (Overview, Transactions, Receipts) · 06 Books (Overview, Ledger) · 07 Marketing (Campaigns, Reviews, Referrals, Social, Google, Websites, Analytics, Map)
- Platform: Settings · Selena · Notifications · Activity · Docs · Loop Connect · Feedback

### What's actually wired (audit pass)

| Capability | Status | Evidence |
|---|---|---|
| Selena AI agent (SMS + web + email channels, 17 intents, 24-field per-tenant persona, scoring) | **WIRED** | `selena.ts` + `selena-core.ts` + `selena-handlers.ts` (~2,217 LOC); `api/selena`, `api/admin/selena/{monitor,score,sms-status}`, `api/ai/{assistant,chat}`, `api/chat`; per-tenant config in `selena_config` jsonb; `dashboard/selena/page.tsx` |
| State machine 10-field booking flow | **WIRED** | rebuilt 2026-04-16 (per `selena_v3_rebuild.md`); reversed flow + intent router |
| Bilingual SMS (EN/ES) for clients & team | **WIRED** | per-tenant `selena_config.language`; team SMS bilingual fan-out in `notify-team-member.ts` |
| Multi-tenant + custom-domain middleware + per-tenant `/site/*` | **WIRED** | `src/middleware.ts`; `src/app/site/**` data-driven from `tenant.site_config`; `tenant-sitemap`, `tenants/public` routes |
| Tenant provisioning (`provisionTenant()`) + auto verify-checklist (DNS/SSL/Resend/Telnyx/Stripe) | **WIRED** | `api/admin/businesses/[id]/{provision,verify-checklist,selena-preview}`; per-trade defaults in `lib/platform-defaults` |
| Bookings (CRUD, status machine, payment, batch, batch-update, broadcast, closeout, stats) | **WIRED** | `api/bookings/**` |
| Recurring schedules (7 patterns: daily / weekly / biweekly / triweekly / monthly-by-date / monthly-by-weekday / custom) | **WIRED** | `lib/recurring.ts:3-13`; `api/schedules/**`; `cron/generate-recurring` |
| Smart-schedule scoring (zones, travel, history) | **WIRED** | `lib/smart-schedule.ts`, `lib/service-zones.ts`; `api/admin/smart-schedule` |
| GPS check-in/out · 528ft validation · half-hour rounding w/ 10-min grace | **WIRED** | `siteData.ts:1093`; rounding rule documented in `api/finance/backfill/route.ts:9`; `team-portal/{checkin,checkout}` |
| 15-min heads-up SMS · video walkthroughs (auto-delete 30d) · running-late · PIN login | **WIRED** | `team-portal/{15min-alert,video-upload,running-late}`; `cron/cleanup-videos`; PIN auth in `api/team-portal/auth` |
| Stripe Checkout + Stripe Connect cleaner payouts (auto-pay on completed) | **WIRED** | `api/payments/{checkout,link}`; `api/team-members/[id]/{stripe-onboard,stripe-status}`; `webhooks/stripe`; `lib/payment-processor.ts` (per memory `nycmaid_payment_automation_v2.md`) |
| Email-monitor IMAP for Zelle / Apple Pay / Venmo / Cash App auto-match | **WIRED** | `lib/email-monitor.ts`, `lib/payment-email-parser.ts`; `cron/email-monitor` (every minute) |
| Invoices (CRUD, send, public checkout, record-payment) | **WIRED** | `api/invoices/**` |
| Quotes (CRUD, send, public accept/decline, convert to booking, templates) | **WIRED** | `api/quotes/**`, `api/quote-templates`, `dashboard/sales/quotes/**` |
| E-signature documents (fields, signers, send, sign, void, decline, public consent) | **WIRED** | `api/documents/**`, `dashboard/sales/documents/**` |
| Sales pipeline + deals (stages, activities, at-risk) | **WIRED** | `api/deals/**`, `api/pipeline`, `dashboard/sales/pipeline/**` |
| Route optimization (auto-build, optimize, publish) | **WIRED** | `api/routes/**`, `dashboard/sales/routes/**` |
| Finance: P&L · AR aging · cash flow · revenue · summary · audit log · periods/close | **WIRED** | `api/finance/{pnl,ar-aging,cash-flow,revenue,summary,audit-log,periods,close}` |
| Bank: accounts · import · transactions w/ ML match suggestions · reconcile · chart-of-accounts | **WIRED** | `api/finance/{bank-accounts,bank-import,bank-transactions/[id]/match,bank-transactions/{suggest,accept-suggestions},reconcile-candidates,chart-of-accounts}` |
| Payroll · payroll-prep · 1099 threshold tracking ($600/yr) · tax export · year-end ZIP | **WIRED** | `api/finance/{payroll,payroll-prep,tax-export,year-end-zip}`; `payroll-prep:107` flags `hits_1099_threshold` |
| CPA portal + CPA-token year-end ZIP | **WIRED** | `api/cpa/[token]/year-end-zip`, `api/finance/cpa-tokens`, `dashboard/finance/cpa-access` |
| Receipts (upload + attach to txn) | **WIRED** | `api/finance/{receipts,receipts/attach,upload}` |
| Recurring expenses | **WIRED** | `api/recurring-expenses/**`, `cron/recurring-expenses` |
| Finance AI Ask (natural language Q&A on books) | **WIRED** | `api/finance/ai-ask` |
| Lead capture · attribution · sources · domains · visits · block · verify · override · feed | **WIRED** | `api/leads/**`, `api/attribution/**`, `dashboard/leads/page.tsx` (mockup-driven) |
| Clients (CRUD, import CSV, enriched, analytics, transcript, activity) | **WIRED** | `api/clients/**`; `dashboard/clients/page.tsx` + drawer |
| Reviews (request, submit, public upload, auto-reply via cron, sync from Google) | **WIRED** | `api/reviews/**`; `cron/{auto-reply-reviews,sync-google-reviews,post-job-followup}` |
| Referrals (referrers, codes, commissions, analytics, tracking) | **WIRED** | `api/{referrals,referrers,referral-commissions}` |
| Campaigns (CRUD, send, generate, preview) | **WIRED** | `api/campaigns/**`, `dashboard/campaigns/**` |
| Google Business Profile (auth, posts, reviews read/reply, generate-reply) | **WIRED** | `api/google/**`, `api/admin/google/**` |
| Social — Facebook + Instagram OAuth, post, posts | **WIRED** | `api/social/**` |
| IndexNow integration | **WIRED** | `api/indexnow` |
| Connect (Slack-style channels: tenant team + per-client + per-team-member threads) | **WIRED** | `api/connect/**`, `api/portal/connect`, `api/team-portal/connect`; `dashboard/connect/page.tsx` |
| Hiring funnel (`team-applications`, `cleaner-applications`, careers pages with Google Jobs schema) | **WIRED** | `api/team-applications/**`, `api/cleaner-applications`; site careers pages |
| Audit log + security events | **WIRED** | `api/audit`, `api/security/events`, `api/finance/audit-log` |
| Health monitoring (cron health checks, system check, monitoring/status) | **WIRED** | `cron/{health-check,health-monitor,system-check,comms-monitor}`, `api/admin/monitoring/status` |
| Per-tenant impersonation (admin support tool) | **WIRED** | `api/admin/impersonate`, dashboard impersonation banner |
| Browser push notifications | **WIRED** | `api/push/subscribe` |
| Apology credits | **WIRED** | clients table columns; per migration 011 |
| 17 crons | **WIRED** | (full list: email-monitor, payment-reminder, late-check-in, schedule-monitor, post-job-followup, no-show-check, outreach, follow-up, daily-summary, lifecycle, backup, retention, confirmations, reminders, system-check, sync-google-reviews, auto-reply-reviews, sales-follow-ups, comms-monitor, cleanup-videos, generate-recurring, health-check, health-monitor, recurring-expenses) |

### What's NOT wired (still "Coming Soon" inside dashboard tabs)

Per `fullloop_mockup_pages_built_2026_04_25.md`, these tabs render a "Coming soon" placeholder:

- **Schedule** tabs C/D/E (Map / By Cleaner / Capacity), drag-drop reassignment, weather panel, real travel-time, recurring forecast overlay
- **Bookings** tab B: Lanes (kanban) + Timeline buttons disabled; bulk-action wiring incomplete (Mark Paid / Send Review Request / Clone Next Week / Sync to QB)
- **Leads** tabs C–G (Network / Sources / Geography / Hiring Funnel / Search Intel)
- **Finance** tabs B–D (Revenue / Margin / Forecast); hero chart still mock; cohort retention; tax set-aside
- **Books** tabs A/C/D/E/F/G/H/I (Overview/Payroll/Expenses/Reconcile/Tax/Statements/QuickBooks/Cleaners) — only **B Ledger** is wired; **QuickBooks OAuth not implemented**
- **Sales** tabs B–F (Leads / Quotes / Won-Lost / Forecast / Conversations); deal-detail drawer; kanban DnD
- **Team** tabs B–E (Applications / Ops Admin / Performance / Payroll); zone-coverage cards; per-day mini-grid

Cross-cutting: per-page Selena suggestion pills on dashboard hit a default endpoint, not page-specific intent. "Ask Selena" inline boxes are visual-only on most pages.

### What does NOT exist (and isn't claimed — keep it that way)
- QuickBooks Online OAuth + sync (the books tab placeholder is the only mention)
- Native mobile app
- Public REST API + Zapier
- Live chat widget on the marketing site
- Multi-format client importer beyond CSV

---

## 2. Marketing claims vs. reality (per page)

Read as: **CLAIM → REALITY → keep / fix / cut / add**.

### `/full-loop-crm-pricing` — pricing page

The 4 tiers, $999 setup, asset ownership ($5K website / $20K + 10%/mo buyout / $999 GMB / EMD $500+$99/yr) — these are business-model claims, out of scope unless you say otherwise.

The "every tier includes" list (10 bullets):

| Bullet | Reality | Action |
|---|---|---|
| Custom Next.js website with auto-generated pages (services + areas + hiring) | WIRED — `/site/*`, sitemap, careers | KEEP |
| Selena AI booking agent (SMS + web chat, bilingual EN/ES) | WIRED | KEEP |
| Full CRM (clients, bookings, calendar, finance) | WIRED — under-claims (no mention of quotes, invoices, e-sign, sales pipeline, books, routes, bank reconcile, CPA portal) | **EXPAND** |
| Team portal (GPS check-in/out, video walkthroughs, 15-min heads up, earnings) | WIRED | KEEP |
| Hiring pages with Google Jobs schema | WIRED | KEEP |
| Review automation and referral program | WIRED | KEEP |
| SMS + email campaigns | WIRED | KEEP |
| Client portal | WIRED | KEEP |
| Full SEO management | WIRED — per-tenant `/site/*` + IndexNow + Google Business Profile + sitemap | KEEP |
| White-glove onboarding ($999 setup) | WIRED — provisioning + verify-checklist | KEEP |

**Missing from list (built, undersold):** Quoting + e-signature documents, sales pipeline + deals, route optimization, full bookkeeping (bank import + reconcile + chart-of-accounts), payroll + 1099-ready data export, CPA portal w/ year-end ZIP, Stripe Connect auto-payouts to crew, Zelle/Venmo/Cash-App email auto-match, Slack-style team chat ("Connect"), per-tenant Google Business Profile + Facebook + Instagram posting.

### `/full-loop-crm-service-features` — features page

Top-level claims:

| Claim | Reality | Action |
|---|---|---|
| Stage 1 — **Multi-Domain SEO Network** ("Full Loop builds and manages multiple SEO-optimized domains") | PARTIAL — platform builds **one** main `/site/*` per tenant + optional EMD microsites as a paid add-on. Multi-site SEO is a **service Jeff provides**, not an automated platform feature. | **REFRAME**: "We build and manage your SEO site network — main domain + optional add-on microsites — and route every lead to your CRM." Don't imply the platform auto-spins multiple sites. |
| Stage 1 — Domain Performance Analytics | PARTIAL — `attribution`, `domain-notes`, `leads/visits` exist, but a per-domain rollup dashboard is not visibly shipped (claim says "single dashboard"). | **REFRAME** to "Lead attribution shows source domain, landing page, and search query for every inbound lead" — this is verifiably true. |
| Stage 1 — Traffic Source Intelligence | WIRED | KEEP |
| Stage 1 — Smart Lead Attribution | WIRED | KEEP |
| Stage 2 — Selenas AI SMS Chatbot · 24/7 Bilingual · State Machine · Returning Client Recognition · Web + SMS · Smart Escalation · AI Performance Dashboard · Conversation Reset | ALL WIRED | KEEP |
| Stage 3 — Smart Scheduling | WIRED | KEEP |
| Stage 3 — **7 Recurring Patterns** ("weekly, biweekly, every 3 weeks, monthly, every 6 weeks, every 2 months, quarterly") | NUMBER MATCHES (7) but **the named cadences don't match the code**. Code has: Daily, Weekly, Bi-weekly, Tri-weekly, Monthly-by-date, Monthly-by-weekday, Custom (`lib/recurring.ts:107-113`). | **FIX**: rewrite to "Daily, Weekly, Bi-weekly, Tri-weekly, Monthly (date or weekday), and Custom" — OR add named presets (every-6-weeks / quarterly) as wrappers around `custom`, then keep current copy. Cheapest = rewrite copy. |
| Stage 3 — Client Booking Portal · Automated Confirmations | WIRED | KEEP |
| Stage 4 — GPS Check-in/out · 528ft Validation · Video Walkthroughs · 15-Min Heads Up · Half-Hour Rounding · Bilingual Team Portal · PIN Login · Bilingual Notifications | ALL WIRED — every specific number (528ft, 30-day video purge, 10-min grace) verifies in code | KEEP |
| Stage 5 — Every Payment Method (Zelle/Apple/Venmo/cash/check/CC) | WIRED — Stripe + IMAP email parser | KEEP |
| Stage 5 — Auto-Generated Invoices | WIRED | KEEP |
| Stage 5 — 1-Click Payroll | WIRED | KEEP |
| Stage 5 — **1099 Reports** | WIRED — `api/finance/payroll-prep` flags `hits_1099_threshold` at $600 YTD; `tax-export` outputs a CONTRACTOR PAYOUTS (1099) section. The dashboard *Books* tab labels it Coming Soon (UI), but the underlying data and export ARE shipped. | **KEEP** copy. **TIGHTEN**: rephrase as "1099-ready contractor payout reports with $600 YTD threshold flagging" so it matches the actual export format. **Then**: ship the Books > 1099 tab UI to remove the Coming Soon label inside the product. |
| Stage 5 — Real-Time Financial Dashboard | WIRED — full P&L, AR aging, cash flow, audit log, periods, bank reconcile | KEEP, **EXPAND** to mention bank import + reconcile + CPA portal |
| Stage 6 — Automated Post-Service Follow-Up · 10% Rebooking Discount · Negative Sentiment Detection · AI Escalation to Phone | WIRED (post-job-followup cron + reviews/request + selena escalation) | KEEP |
| Stage 7 — Client Lifecycle Analytics · Win-Back Campaigns · Referral Program | WIRED | KEEP |
| **"12 Dashboard Pages. Zero Tab Switching."** | UNDER-CLAIM — actual dashboard top-level is the 6-section locked nav (Loop / Sales / Schedule / Clients / Team / Finance / Books / Marketing) with ~20 sub-pages; plus Platform section (Settings / Selena / Notifications / Activity / Docs / Loop Connect / Feedback). Listed 12 are: Executive, Client Mgmt, Bookings & Calendar, Team, Lead Tracking, Finance & P&L, Notifications, Selena AI, Referrals, Settings, Documentation, Connect. | **REPLACE** with the 6-section nav as the canonical layout (it matches the locked design system), then list everything underneath. Selling more = honest more. |
| **"9 Tools You're Replacing"** comparison table | WIRED — every replacement column verifies | KEEP. Optionally add: e-signature (DocuSign $25/mo), bookkeeping (QuickBooks $30/mo) — both real replacements once books/QB tab UI ships. |

### Homepage (`/`) and home components

24 sections. Spot-checks:

- Hero badges: "One Trade Per Metro · 50+ Service Industries · All-in-One Full-Cycle CRM · AI-Powered · 300+ US Metros". The "300+ US Metros" claim is forward-looking — there is no metro-availability map or claim-territory tool. **Either** ship a stub "see availability" page that returns "all metros currently open except NYC" **or** soften to "Available in every US metro" (true, no exclusivity is enforced platform-side yet).
- `Industries.tsx`, `Comparison.tsx`, `ServiceDeepDives.tsx`, `Process.tsx`, `ROICalculator.tsx`, `TechStack.tsx`, `Guarantees.tsx`, `Competitors.tsx` — **AUDIT NEEDED** in pass 2; not opened in this audit.

### `/full-loop-crm-frequently-asked-questions` — FAQ

Reuses `lib/marketing/faqs.ts`. Spot-checked entries (`faqs.ts:7,8,11`) — claims about 528ft, payment methods, 1099 reports all verify against code. **AUDIT-IN-FULL** as a copy pass: scan every Q/A for terms that don't match code names (e.g. "monthly_day", "every 6 weeks").

### `/why-you-should-choose-full-loop-crm-for-your-business`, `/about-full-loop-crm`, `/full-loop-crm-101-educational-tips`, `/case-study/*`, `/home-service-business-blog/*`

Out of scope this pass — review next session.

### `/full-loop-crm-service-business-industries` (50+ industries)

Out of scope this pass — review next session. Risk: per-industry pages reference specific features by name; needs the same diff treatment.

---

## 3. The plan to update the website

Sequenced cheap-to-expensive. Each step is a single atomic commit so they can be reviewed/rolled back independently.

### Step 0 — Decisions before edits (asks)

These are the only branches I shouldn't make on my own:

1. **Scope of audit**: software-features only, or also business-model claims (territory model / ownership / asset-pricing math)?
2. **Output cadence**: do steps 1–7 in this session, or split into next session?
3. **"7 Recurring Patterns" copy**: rewrite copy to match code (faster) — or add named presets to recurring picker (slower, but lets the named cadences ship)?
4. **"300+ US Metros" badge**: soften to "Available in every US metro", or build a simple territory-availability page first?
5. **Multi-Domain SEO Network** framing: keep as platform feature (overclaim) or reframe as service offering (honest)?

Defaults if I don't hear back: **software-features only**, **steps 1–4 this session, 5–7 next**, **rewrite the 7-recurring copy**, **soften the metros badge**, **reframe multi-domain**.

### Step 1 — Pricing page expansion (under-claim fix)

Edit `(marketing)/full-loop-crm-pricing/page.tsx`:

- Expand "What Every Tier Includes" from 10 to ~15 bullets. Add: Quoting + e-signature, Sales pipeline + deals, Route optimization, Full bookkeeping (bank import + reconcile + chart-of-accounts), Payroll + 1099-ready exports, Stripe Connect crew payouts, Zelle/Venmo/Apple/Cash auto-match, Slack-style team Connect, Google Business Profile + Facebook + Instagram posting.
- Update "9 Tools You're Replacing" table → consider 11 (add e-sign $25/mo + accounting $30/mo). Recompute the savings number.

Cost: 1 commit. No JS changes.

### Step 2 — Features page reality fixes (overclaim fix)

Edit `(marketing)/full-loop-crm-service-features/page.tsx`:

- **Stage 1**: rewrite "Multi-Domain SEO Network" + "Domain Performance Analytics" copy to match what's shipped (one main site + add-on microsites; lead attribution by source).
- **Stage 3**: rewrite the 7 recurring patterns to match `lib/recurring.ts:107-113` (or, alt, ship named presets first).
- **Stage 5**: tighten "1099 Reports" copy to match the actual export shape (`# CONTRACTOR PAYOUTS (1099)` section + $600 YTD threshold flag).
- **Command Center section**: replace "12 Dashboard Pages" list with the 6-section locked nav (Loop / Sales / Schedule / Clients / Team / Finance / Books / Marketing) and list each section's sub-pages. This both matches the locked design and increases the apparent surface area.

Cost: 1 commit. No JS changes.

### Step 3 — Add-the-built features (capability honest)

Either:
- (a) Add 3 NEW stages (Sales / Books / Connect) to the features page so it becomes 10-stage instead of 7-stage. OR
- (b) Add a "Beyond the Loop" section after Stage 7 that lists Sales, Books, Connect features in a denser grid.

(b) is faster and keeps the "7 stages = the loop" narrative intact.

Cost: 1 commit.

### Step 4 — Hero badge tightening

Edit `src/components/home/Hero.tsx`:

- "300+ US Metros" → "Available in every US metro" OR ship a /territory-availability stub.
- (optional) replace "All-in-One Full-Cycle CRM" badge with something more specific, e.g. "Quote → Book → Crew → Pay → Review — one platform"

Cost: 1 commit.

### Step 5 — FAQ pass

Edit `src/lib/marketing/faqs.ts` (and `siteData.ts:1093,1105`):

- Scan every Q/A. For any specific number/name claim, verify against code or reframe.
- Re-state the recurring pattern names if step 2 changed them.

Cost: 1 commit, ~30 minutes.

### Step 6 — Homepage component sweep

Open the 20+ home components not opened in this audit (`Industries`, `Comparison`, `ServiceDeepDives`, `Process`, `ROICalculator`, `TechStack`, `Guarantees`, `Competitors`, `BeforeAfter`, `Testimonials`, `WhatIsDigitalMarketing`, `CaseStudies`, `BlogPreview`, `ExpandedFAQ`, `FreeResources`, `AssetPricing`, `Welcome`, `WhyNYC`, `SocialProof`, `ResultsTicker`, `CostBreakdown`, `PricingSlider`, `TopServices`, `Industries`, `FinalCTA`, `ExitIntent`).

For each: same diff exercise, same 4-action options. Most will be KEEP. The ones that touch specific claims (ROI math, comparison table, tech stack list) deserve a careful pass.

Cost: 1 session.

### Step 7 — Industry pages sweep

`(marketing)/full-loop-crm-service-business-industries/page.tsx` + `lib/marketing/industryPageContent.ts`. 50+ industries × per-industry copy that name-checks features. Heavy.

Cost: 1 session.

### Step 8 — Push & deploy

Per memory `fullloop_marketing_rebrand_2026_04_25.md`: there are **7 unpushed local commits** from the editorial rebrand session, none deployed. Once steps 1–4 are stacked on top, push as one batch. Verify the live marketing site renders the editorial design + the corrected claims.

Per `feedback_just_deploy.md`: just deploy when ready — don't ask.

Per `feedback_typecheck_before_push.md`: `tsc --noEmit` before push.

---

## 4. Honest pricing readiness

After Steps 1–4, the marketing site claims map to verifiable code. At that point:

- **Starter $199/mo** is defensible: 1-team-member operator gets the locked-nav 6-section dashboard, Selena AI on SMS + web, GPS team portal, full bookings/clients/finance/reviews/referrals, per-tenant `/site/*`, hiring pages, Google Business Profile + social posting.
- **Growth $499/mo** at "up to 5 team members" is a soft cap — needs platform enforcement OR honest "soft cap, we'll talk". Today there's no per-tenant team-member limit in code. **Decision needed**: enforce in code, or remove the cap from copy.
- **Pro $999/mo** at "unlimited team members" is fine.
- **Enterprise** at "Get Pricing" is fine.

The biggest pre-pricing fix that's NOT copy: **enforce team-member counts per tier**, or change the tiers from team-size-gated to revenue-gated only (the way the page already frames them).

Everything else — once Steps 1–4 ship — is good enough to put a price next to honestly.

---

## 5. What I did NOT do this session

- Open and verify Homepage components (Step 6).
- Open and verify the 50+ industry pages (Step 7).
- Open and verify the 25-question ExpandedFAQ vs. code.
- Make any code changes.
- Push or deploy.
- Audit business-model claims (territory exclusivity, ownership math, buyout terms) — flagged as scope question 1 in Step 0.
