# Full Loop CRM — Roadmap to Competitive

Captured 2026-04-20. Baseline: all features shipped and verified through commit 2afa84b.

## Current state (shipped)

- Multi-tenant architecture: shared code + `tenant_id` row filter + middleware for custom domains
- 240+ API routes, all tenant-scoped
- Selena AI agent: SMS + web + email channels, 17 intents, per-tenant persona with 24 config fields, quality scoring
- Per-tenant website: `/site/*` fully tenant-data-driven, 12 clean canonical URLs, sitemap.xml + robots.txt per tenant
- Onboarding form: `/admin/businesses/new` with service areas, hours, custom services, payment methods, auto-provision toggle
- Tenant provisioning: `provisionTenant()` library seeds service_types, selena_config, guidelines per industry
- Auto-verification: `/api/admin/businesses/[id]/verify-checklist` runs DNS/SSL/Resend/Telnyx/Stripe checks
- Integration inputs: admin + tenant self-serve for Stripe/Telnyx/Resend/IMAP/Google/Anthropic/IndexNow
- Encrypted secrets at rest (Google OAuth refresh token)
- 17 crons: email monitor, payment reminder, late check-in, schedule monitor, post-job follow-up (with review link), no-show detection, outreach, follow-up, daily summary, lifecycle, backup, etc.
- Per-tenant Selena config cache with invalidation on save

## Must-have to be competitive (blocks deals against Jobber)

### 1. White-glove onboarding wizard (~3-5 days)
Single multi-step admin wizard covering: business data → services → Selena persona → credentials → auto-verify → invite owner. Admin-operated, not tenant self-serve.
- Multi-step flow with progress indicator
- "Save draft / continue later" persistence
- Inline validation (email, phone, domain format)
- Each step can call existing endpoints (no new backend needed)

### 2. QuickBooks Online sync (~1.5-2 weeks)
Non-negotiable for accountants. Biggest deal-blocker.
- Intuit OAuth flow + app registration
- Customer sync (clients → QB customers)
- Invoice sync (completed bookings → QB invoices)
- Payment sync
- Expense sync (receipts already exist)
- Chart-of-accounts mapping per tenant
- Disconnect + reconnect flow
- Error retry + reconciliation

### 3. Quoting + e-signature (~5-7 days)
Critical for HVAC, plumbing, electrical, roofing, tree service (anything >$500 that quotes before work).
- Quote data model (separate from booking)
- Line items + descriptions + T&C
- Industry templates
- Send via email/SMS with public accept/decline link
- Native HTML signature capture (or DocuSign integration)
- Quote → booking conversion on accept
- Status tracking + follow-up cron

### 4. Route optimization (~5-8 days)
Must-have for 5+ jobs/day per crew. Saves real money.
- External routing API (Google Directions or OpenRouteService)
- Multi-stop optimization (TSP solver)
- Time windows + driver home + lunch breaks
- Daily route view with drag-drop reordering
- Export/share route with driver phones

### 5. Sales pipeline upgrade (~3-4 days)
Must-have for long-cycle trades.
- Deal stages with probability + expected close date
- Activity logging (calls/emails/notes)
- Pipeline forecast report
- Source attribution refinement
- Follow-up sequence automation

### 6. Finance page buildout (~3-5 days)
Owner's daily home base.
- Full P&L with expense categorization
- Accounts receivable aging dashboard
- Payroll calculation from hours (already have data)
- 1099 contractor prep
- Cash flow forecasting (4-week lookahead)
- Profit per client / service / team member
- Tax export (CSV for accountant)

## Nice-to-have (perception, scale)

### 7. Native mobile app (~4-6 weeks, or skip for React Native wrapper ~1 week)
Jobber's mobile is their sales hook. For fullloop, responsive web works but sticky PWA + React Native wrapper closes the perception gap at low cost.

### 8. Public API + Zapier (~1-2 weeks)
Unlocks custom tenant workflows. Low priority until 50+ tenants.

### 9. Live chat support + knowledge base (~1 week)
Intercom widget + Notion-based docs. Table stakes for B2B SaaS perception.

### 10. Multi-format client importer (~2-3 days)
Excel, JSON, vCard, Google Contacts, QuickBooks, Mailchimp. CSV already works.

### 11. Integration marketplace UI (~1 week after 3-5 integrations exist)
Visual directory of available integrations + install flow.

## Verification + polish (always-on)

- Automated test suite (start with 20-30 critical path tests)
- Error monitoring (Sentry or similar — free tier works)
- CI/CD checks (lint + tsc + build on every push)
- Load testing before first 10 tenants (k6 or Artillery)
- Security audit pre-cutover

## Realistic path

**Sequential:** 6-10 weeks of focused work for all must-haves.
**Parallel 2 tracks:** 3-5 weeks.
**Critical path:** Onboarding wizard → Finance → Quoting → QuickBooks → Route → Pipeline.

## What makes this a category (not a clone)

Full-loop-in-one: lead gen (SEO + AI) → AI sales (Selena) → scheduling (smart-schedule) → field ops (GPS check-in) → payments (Stripe + Zelle parsing) → reviews (automation) → retargeting (lifecycle cron). Nobody else has all 7 in one platform. Jobber is 4-7, HubSpot is 1-3, no integration between them.

Keep the AI differentiation as the lead narrative.

## Bootstrap math

- Infra: ~$100-500/mo at early scale (Vercel + Supabase + Telnyx + Resend usage)
- Break-even: 2-3 tenants at $299/mo
- Comfortable solo operation: 10-30 tenants
- Sustainable indefinitely: 30+ tenants = $100K+ ARR
- No outside money needed unless accelerating to market share grab

## Valuation markers (reminder)

- Pre-rev one tenant (you): $2-5M friendly seed, $500K-2M asset sale, $3-10M strategic
- 50 tenants: $1-3M valuation, seed-ready
- 500 tenants: $15-40M Series A range
- 2,000 tenants: $50-150M Series B
- 10,000 tenants: $300M-1B+ exit territory
- AI-native vertical SaaS trades at 10-15x ARR when the moat is proven
