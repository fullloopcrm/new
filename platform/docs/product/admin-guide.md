# FullLoop CRM — Platform Admin Guide

**What this is:** a day-to-day operations guide for whoever runs `/admin` — onboarding
new tenants, keeping existing ones healthy, and handling support. Traced against the
real `/admin` navigation, code, and `docs/runbooks/onboarding-runbook.md` (the
authoritative, deeper procedure for tenant onboarding specifically — this guide
summarizes it and points there for the full step-by-step).

**Honest note on what already exists:** `/admin/docs` (`src/app/admin/docs/page.tsx`,
~1,600 lines) already covers a lot of ground — but it's written for an **engineer**
joining the codebase (tech stack, auth layers, schema, directory structure), not for
someone doing the **operational** job of running the platform day to day (which
tenant needs attention right now, how to activate one, what a billing change actually
does). That operational gap is what this guide fills; it does not duplicate the
engineering reference.

---

## 1. Who you are and how you get in

Two admin auth paths, both landing on the same `/admin`:
- **Admin PIN** — a 6-digit PIN (`ADMIN_PIN` env var), validated via the
  `admin_token` cookie / `verifyAdminToken()`. The lightweight day-to-day path.
- **Clerk super-admin** — for anyone who also needs dashboard-side access.

**Impersonation**: from `/admin/businesses/[id]`, an admin can impersonate any
tenant's dashboard (`fl_impersonate` cookie) — the fastest way to see exactly what an
owner sees when troubleshooting "it's not working" reports.

## 2. The admin nav, by what it's actually for

| Section | Real job |
|---|---|
| **Overview** (`/admin`) | Platform-wide snapshot |
| **Portals** | Cross-tenant portal management |
| **Sales** | Platform's own sales pipeline (prospects becoming tenants) |
| **Tenants → All Businesses** (`/admin/businesses`) | Create, configure, and **activate** tenants — the core of this job, see § 3 |
| **Tenants → Territories** | Exclusive-territory enforcement (one operator per trade per city) |
| **Tenant Chats** (`/admin/tenant-chats`) | Two-way messaging with each tenant owner — see § 5 |
| **ComHub** | Cross-tenant view of communications |
| **SEO** | SEO property tracking/health across tenant sites |
| **Tenant Health** (`/admin/tenant-health`) | Live up/down + routing board for every tenant's public site — see § 6 |
| **Feedback** | Tenant/client feedback rollup |
| **System Status** (`/admin/status`) | Platform infra status |
| **Activity Log** | Cross-tenant audit trail |
| **Monitoring** (`/admin/monitoring`) | Cron health, comms failures, error log — see § 6 |
| **AI Usage** | Anthropic/AI spend and usage tracking |
| **Security** | Security-relevant admin surface |
| **Billing** (`/admin/billing`) | MRR, per-tenant plan/rate — see § 4 |
| **Docs** (`/admin/docs`) | Engineering reference (not this guide) |

## 3. Tenant lifecycle — creating and activating a business

**Full procedure:** `docs/runbooks/onboarding-runbook.md` — read that before running
a real onboarding; this section is the summary.

1. **Create the tenant row** — `/admin/businesses/new` (full intake: identity, owner,
   domain, contact, ops, services, platform billing) or the public 6-field
   `/onboarding` self-serve form. Every creation path should end up going through
   `activateTenant()`.
2. **Set `funnel_mode` for the trade** — service/booking trades (cleaning, HVAC,
   plumbing…) default correctly to `booking`, but **project/lead trades (roofing,
   remodeling, solar, landscaping…) do NOT auto-derive `pipeline`/`lead_only` — this
   must be set explicitly**, or the tenant launches trying to book hourly jobs for a
   business that should be quoting projects. This is the single most common
   onboarding mistake per the runbook.
3. **Hit Activate** (`/admin/businesses/[id]` → Launch tab) — idempotent, safe to
   re-run. It provisions settings/services, seeds the founding team member + owner
   PIN (shown once — capture it immediately, there's no re-reveal), registers the
   carrying domain (`<slug>.fullloopcrm.com`) and custom domain if set, and runs a
   smoke test over the lead→booking/quote→review spine.
4. **Read the result honestly** — `ready: true` only when the spine passed, an owner
   login exists, AND a domain actually serves. A `site_live: action_needed` step
   means the tenant is **not** live yet even if everything else looks done — don't
   tell the prospect otherwise.
5. **Domains** — the carrying domain (`<slug>.fullloopcrm.com`) is what makes day-one
   access work. A custom domain needs the prospect to set DNS (A record to
   `76.76.21.21`, CNAME `www` to `cname.vercel-dns.com`) before it verifies.

## 4. Billing (`/admin/billing`)

One pricing model, no tiers: **$2,500/mo per admin seat + $250/mo per field
team-member seat + $25,000 one-time white-glove setup.** Every feature is included —
there's no feature-gating by plan.

The `/admin/billing` page's "plan" field (free/starter/pro/enterprise) is a
**segmentation label only** — it does not change what a tenant can access or what
they're actually billed. Real revenue is seat-based, computed from each tenant's
`monthly_rate` (see `src/lib/billing-pricing.ts`). Don't confuse editing a tenant's
displayed "plan" with changing their bill — that's a separate, seat-driven
calculation.

## 5. Talking to a tenant owner (`/admin/tenant-chats`)

Every tenant is a thread; owner replies surface here, and threads needing a reply
sort to the top. This is **in-platform only** — it does not send SMS/email (that's
`notifyTenantOwner`/Jefe's `notify_tenant_owner`, a separate path for reaching an
owner outside the app). The owner sees the same thread as the pinned "Full Loop
Support" conversation inside their own Loop Connect. Every message is auto-translated
EN/ES at send time.

**Known limitation (verify before promising an owner a fast reply):** per the admin
page's own source comment, inbound capture into this view has historically lagged —
outbound sends reliably, but confirm replies are actually landing here before telling
an owner "we'll see your reply immediately."

## 6. Keeping tenants healthy — the monitoring surfaces

Three different boards, each answering a different question:

- **`/admin/tenant-health`** — "is each tenant's *public site* actually up?" Written
  by a cron every 15 minutes: reachable, serving its own site (not looping to another
  tenant), and its lead-capture form is wired. Read-only board, sorted failing-first.
- **`/admin/monitoring`** — "what's broken *inside* the platform right now?" Cron
  health/silence detection, comms failure counts (1h/24h), Selena error counts,
  pipeline volume, and the live error log (see below).
- **`/admin/errors` (feeds monitoring)** — the error log itself: severity, source,
  per-tenant breakdown, resolve/dismiss workflow. Backed by `error_logs`
  (`src/lib/error-tracking.ts`) — deduped so a repeating failure bumps one row's
  `occurrence_count` instead of flooding the list. High/critical severity errors
  already page out via Telegram/SMS with a cooldown, independent of anyone checking
  this page. See `docs/adr/0006-error-tracking-sentry-plan.md` for the plan to layer
  a dedicated error-tracking tool (Sentry) on top of this — not built yet, cost-gated.

**Rule of thumb:** a prospect/tenant complaint about "the site is down" → check
`/admin/tenant-health` first (fastest, purpose-built). A report of "something in the
app is erroring" → `/admin/monitoring` → the error log.

## 7. Support workflow, end to end

1. Owner reports an issue via Loop Connect (lands in `/admin/tenant-chats`) or a
   direct channel (email/Telegram, outside the app).
2. Reproduce with **impersonation** (`/admin/businesses/[id]` → impersonate) rather
   than guessing from a description.
3. Check `/admin/tenant-health` (site up?) and `/admin/monitoring` → error log
   (anything erroring for that `tenant_id`?) before assuming it's a one-off.
4. Reply in the same tenant-chats thread — the owner sees it in their pinned Support
   conversation, translated automatically if needed.

## 8. What this guide deliberately does not cover

Sales pipeline (`/admin/sales`), SEO (`/admin/seo`), AI usage/spend, Security, and
Territories each have enough surface area to warrant their own guide when someone is
actually working that surface day to day — out of scope for this pass. The
engineering-facing tech stack, auth internals, and schema live in `/admin/docs`
(`src/app/admin/docs/page.tsx`) and are intentionally not repeated here.

---

**Cross-references:** `docs/runbooks/onboarding-runbook.md` (full tenant activation
procedure), `docs/adr/0006-error-tracking-sentry-plan.md` (monitoring roadmap),
`docs/product/tenant-owner-guide.md` (the tenant-side view of the same platform),
root `CLAUDE.md` (architecture rules — global codebase, never per-tenant operator
clones).
