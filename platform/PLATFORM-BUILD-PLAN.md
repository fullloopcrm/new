# FullLoop CRM — Platform Build Plan

**Status:** DRAFT. Push back on anything. Every step is negotiable.
**Authored:** 2026-04-21
**Goal:** New tenant signs up → pays → within 30 seconds has a live website, working admin, active Selena. Every one of Jeff's 15+ existing sites becomes a tenant through the same flow. Future customers onboard themselves.

**Ground rules:**
- Nycmaid stays live and untouched the entire time.
- Every phase ships in <2 weeks or splits.
- Every step has a "done when" so we know when it's actually finished.
- No commits to migrate a real business until Phase 9 (synthetic tenant proof).

---

## PHASE 0 — Foundation (1 day)
Set the shape of everything downstream. Cheap now, expensive later.

### 0.1 Tenant config schema design doc
- **What:** Single markdown listing every field a tenant needs to drive the whole product. Fields → type → source (onboarding form / platform default / admin-edit) → consumers (which pages/features).
- **Why:** Every later phase references this. Without it we invent field names as we refactor.
- **Done when:** Doc reviewed + signed off by Jeff.

### 0.2 Platform defaults content
- **What:** Starter FAQ (10 Q&A templates), privacy policy / terms / refund / do-not-share templates with `{{tenant_name}}` placeholders, hero copy templates by trade, testimonial placeholders, default pricing disclaimer.
- **Why:** A tenant activated at 2am must have a usable site without human editing — defaults make that possible.
- **Done when:** Files exist at `src/lib/platform-defaults/`, covered by tests.

### 0.3 Migration: extend `tenants` with structured config
- **What:** Add `site_config JSONB` column (or individual columns — decide in 0.1) for services, faqs, testimonials, policies, brand, hero, seo_meta. Backfill nycmaid from its existing selena_config.
- **Done when:** Migration applied to prod. nycmaid's tenant row has populated fields.

### 0.4 TypeScript types + Zod schema for tenant config
- **What:** `src/lib/tenant-config.ts` exports `TenantConfig` type + Zod schema. All reads go through this.
- **Done when:** `tenant.site_config` has strict type everywhere in code.

---

## PHASE 1 — Provisioning (2 days)
Turn "Stripe webhook fires" into "tenant has a live site." No human in the loop.

### 1.1 Expand `provisionTenant()`
- **What:** On activation, populate every tenant config field from platform defaults. Don't leave any field null. Use trade-based defaults where helpful (cleaning → default cleaning FAQ, landscaping → landscaping FAQ).
- **Done when:** A new tenant row has populated `site_config.services`, `.faqs`, `.policies`, `.brand`, `.hero`, `.seo_meta`.

### 1.2 Clerk org + owner invite
- **What:** On webhook success: create Clerk org named `{tenant_name}`, invite `prospect.owner_email` as org owner. Insert `tenant_members` row. Send them a login email.
- **Done when:** Synthetic test: submit `/qualify`, approve, pay → owner receives Clerk invite within 30s.

### 1.3 Subdomain + site up immediately
- **What:** Each tenant gets `<slug>.fullloopcrm.com` resolved by middleware. Works day 1, no DNS steps needed. Custom domain is optional and added later.
- **Done when:** Fresh tenant can open `<slug>.fullloopcrm.com` and see their site (running on platform defaults).

### 1.4 Queue onboarding tasks
- **What:** Auto-create rows in `onboarding_tasks`: "upload logo", "upload hero photo", "customize FAQ", "connect Stripe", "connect Telnyx number", etc. Appear on their admin dashboard.
- **Done when:** New tenant's admin shows 10–12 starter tasks.

### 1.5 Welcome email
- **What:** Transactional email to owner on activation: Clerk login link, admin URL, 3 quick-start steps.
- **Done when:** Synthetic test proves email arrives with working links.

---

## PHASE 2 — Onboarding form (2 days)
The post-payment experience. Tenant fills out what makes their site theirs.

### 2.1 `/onboard` entry
- **What:** Route tenant hits after Stripe checkout success. Auth-gated by prospect → tenant link. Multi-step, progress saved between steps.

### 2.2 Step wizard sections
- Basics (name confirmation, tagline, phone, email, address, hours)
- Branding (primary + secondary color, logo upload, hero image upload)
- Services (pick from trade-default checkboxes + add custom + set pricing)
- Service areas (neighborhoods or zip list)
- FAQ (prefilled with defaults, editable inline, can skip)
- Policies (prefilled, editable, can skip)
- Selena persona (tone: warm / professional / casual)
- Integrations (Stripe Connect, Telnyx, Resend — all "skip for now" options)

### 2.3 Save + continue + resume later
- **Done when:** Tenant can close browser mid-wizard and return to the same step.

---

## PHASE 3 — Site template refactor (3–4 days)
The big one. Every `/site/**` page reads from tenant config. Verified against nycmaid tenant context.

### 3.1 Inventory the 22 hardcoded files
- Produce list with each file's hardcoded strings → tenant config field mapping
- **Done when:** Spreadsheet-style doc reviewed

### 3.2 Refactor one file at a time (each is a separate commit)
- 3.2.1 `/page.tsx` (homepage — verify)
- 3.2.2 `/about` (from `about-the-nyc-maid-...`)
- 3.2.3 `/services` index
- 3.2.4 `/services/[slug]` detail
- 3.2.5 `/areas` index
- 3.2.6 `/areas/[slug]` detail
- 3.2.7 `/[neighborhood]` SEO pages
- 3.2.8 `/[neighborhood]/[service]` SEO detail
- 3.2.9 `/faq`
- 3.2.10 `/reviews`
- 3.2.11 `/contact`
- 3.2.12 `/careers` + `/careers/[slug]`
- 3.2.13 `/privacy-policy`, `/terms`, `/refund-policy`, `/do-not-share-policy`
- 3.2.14 `/chat-with-selena`
- 3.2.15 `/blog` + `/blog/[slug]`
- 3.2.16 `opengraph-image.tsx`

### 3.3 Shared components in `src/components/site/*`
- Same refactor sweep.

### 3.4 SEO meta + structured data
- All from `tenant.site_config.seo_meta`. Rating / reviewCount from live `reviews` table count.

---

## PHASE 4 — Customer-facing flows (2 days)
The things nycmaid has that fullloop doesn't.

### 4.1 Booking
- Port `/book`, `/book/new`, `/book/collect`, `/book/dashboard` from nycmaid, tenantize during port.

### 4.2 Portal + team
- `/portal`, `/team`, `/team/[token]` — verify all exist, tenantize.

### 4.3 Doc / pay / quote
- `/sign/[token]` already exists. `/pay/[token]` maybe, confirm.

### 4.4 Client API aliases
- `/api/client/login`, `/api/client/book`, `/api/client/verify-code` → re-exports of `/api/portal/*`.

### 4.5 Webhook alias routes
- `/api/webhook/stripe` → re-export of `/api/webhooks/stripe`. Same for telnyx/resend. Removes the singular/plural URL hazard.

---

## PHASE 5 — Admin completeness (1–2 days)
Make the admin UI drive every tenant config field + every onboarding task.

### 5.1 Onboarding checklist widget (admin dashboard)
- Reads `onboarding_tasks`, renders progress.

### 5.2 Site editor
- Admin page where tenant edits their `site_config` without touching the wizard.

### 5.3 Account-creation task queue UI
- Table exists from migration 037. No UI yet.

### 5.4 Domain management
- "Add custom domain" form that calls Vercel API + shows DNS verification status.

### 5.5 Selena persona editor (exists, verify)

### 5.6 Services / FAQ / testimonials editors

### 5.7 SMS / email template editor per tenant

---

## PHASE 6 — Domain + DNS automation (1 day)

### 6.1 Vercel API integration
- Lib function `attachDomain(tenantId, domain)` calls Vercel API, records status on tenant row.

### 6.2 DNS polling
- Cron checks propagation, updates status, notifies tenant when green.

### 6.3 SSL verification
- Same cron.

### 6.4 Per-tenant URL alias middleware
- Tenant config lists URL aliases (e.g. nycmaid's old SEO URLs → new template URLs). Middleware rewrites on match.

---

## PHASE 7 — Integrations automation (1 day)

### 7.1 Stripe Connect onboarding link on welcome email
- Tenant finishes Stripe Connect, webhook writes `stripe_account_id`.

### 7.2 Telnyx number provisioning task
- Admin task: platform ops buys + assigns number manually (fine for now).

### 7.3 Resend domain verification task
- Same pattern — admin task queues the manual setup.

### 7.4 IMAP credentials input in onboarding form
- Tenant paste or skip.

---

## PHASE 8 — Testing harness (1 day)

### 8.1 Synthetic tenant provisioning test
- Playwright/Vitest script: submits `/qualify`, approves, pays (Stripe test key), asserts tenant activated + site renders + admin loads.

### 8.2 Site rendering smoke per tenant
- Given a tenant id, hit every public page, assert 200 + no "undefined" in rendered HTML.

### 8.3 Selena behavior suite
- Table-driven tests of `isBookingConfirmation`, `generateDisputeResponse`, intent patterns — ~30 inputs each.

### 8.4 Booking flow E2E
- Book a fake client from public `/book`, assert booking row created, cleaner assigned, confirmations sent.

---

## PHASE 9 — Second tenant proof (1 day)
Pick ONE of the 15 existing sites. Run it through the real onboarding flow. Don't cut its domain over yet — first, verify the site looks right on `<slug>.fullloopcrm.com`.

**Recommendation for which one:**
- nycmobilesalon or nycexterminator (both have real traffic, both simple enough)
- NOT nycmaid (most complex, most risk, save for last)

### 9.1 Populate tenant via onboarding form (as if it were a real customer)
### 9.2 Verify all 22 `/site/**` pages render correctly
### 9.3 Test booking flow, Selena, payment, admin
### 9.4 Fix any gap that surfaces — the fix benefits all future tenants

---

## PHASE 10 — Migrate nycmaid (1–2 days + monitoring)
Last. By now everything is proven on a smaller business.

### 10.1 Retroactively populate nycmaid's `site_config` to match current live content
### 10.2 Behavioral parity test — run Selena against same inputs on nycmaid and fullloop, compare outputs
### 10.3 Webhook preflight (update Stripe/Telnyx/Resend dashboards one at a time)
### 10.4 DNS TTL lowered 24h ahead
### 10.5 Attach `thenycmaid.com` to Vercel
### 10.6 Flip DNS, disable nycmaid crons
### 10.7 48h monitoring window

---

## PHASE 11+ — Scale (1 day per business)
After nycmaid, each remaining business is a recipe: onboard through the platform, populate tenant, attach domain, flip DNS. Shouldn't need engineering work per tenant.

---

## Decisions (locked 2026-04-21)

1. **Template = nycmaid's live `/src/app/**` frontend.** Not fullloop's partial `/site/**`. Phase 3 copies nycmaid's pages into fullloop and tenantizes content only. All structural/SEO/schema elements stay identical across tenants.
2. **Second-tenant proof = nycmobilesalon.**
3. **Trade depth: per-trade cached defaults for Jeff's top trades + generic fallback.** Baked into codebase, not Claude-generated on each activation. Trades to cover: cleaning, mobile salon, landscaping, pest, interior design, marketing, SEO, laundry, junk removal, HVAC/plumbing/handyman, general home services. Generic fallback for anything else.
4. **Single template.** Styling/layout identical for all tenants. Only content swaps.
5. **Admin URL:** each tenant hits `/admin` on their own host (`thenycmaid.com/admin`, `<slug>.fullloopcrm.com/admin`). One codebase, Clerk-session-scoped. Admin URL is surfaced in tenant profile/config for copy/paste, same pattern as portal links — "all links per page on top of relative page."
6. **Legal pages AI-generated** with onboarding form opt-in ("provide your own"). Tenant lists which pages they want (terms, privacy, refund, do-not-share, cancellation, custom). Schema: `site_config.legal_pages = [{slug, title, source: 'ai' | 'custom', content, generated_at}]`.
7. **Per-trade cached defaults** (not per-tenant Claude generation). Generate the default FAQ / hero copy / policies ONCE per trade, bake into codebase. Tenant edits after if they want. Selena persona stays per-tenant-generated (uses onboarding-form tone).

---

## Daily budget realism
- These estimates assume ~6 hours of focused execution per day.
- Estimated total: 12–16 days of focused work.
- Calendar realistic: 3–4 weeks.

---

## What this plan explicitly does NOT do
- Doesn't migrate nycmaid early (tempting, wrong).
- Doesn't build new features (Sprint 5 payroll, 1099 e-filing, fancy dashboards) until after Phase 10.
- Doesn't ship the `/qualify` form to the public until after Phase 9.
- Doesn't re-architect anything already working.

---

## Push back on anything

Every step above is a draft. If you read something and think "that's wrong" or "that's backwards" or "we should skip that," say so. I'll rewrite.
