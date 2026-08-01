'use client'

import { useState } from 'react'

interface DocSection {
  id: string
  title: string
  content: string
}

const sections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: `Welcome to FullLoop CRM — a multi-tenant SaaS platform for managing businesses, bookings, clients, teams, reviews, communications, and AI-powered scheduling.

**Quick Setup:**
1. Clone the repository and install dependencies with \`npm install\`
2. Copy \`.env.example\` to \`.env.local\` and fill in all required keys (see Environment Variables section)
3. Run \`npm run dev\` to start the development server on \`localhost:3000\`
4. Navigate to \`/admin\` to access the platform admin dashboard

**Key Concepts:**
- **Tenants** — Each business on the platform is a tenant with fully isolated data. All queries filter by \`tenant_id\`.
- **Dashboard** — Tenant-level view at \`/dashboard\` scoped to the logged-in business owner
- **Admin** — Platform-level view at \`/admin\` for cross-tenant management (requires admin PIN or Clerk super-admin)
- **Team Portal** — Separate mobile-first app at \`/team-portal\` for field workers (PIN auth, no Clerk)
- **Client Portal** — Public-facing portal at \`/portal\` for clients to book, message, and manage appointments
- **Selena AI** — AI booking concierge that handles SMS and web chat conversations end-to-end

**Authentication Layers:**
- **Clerk** — Primary auth for dashboard users (business owners). Provides userId linked to tenant.
- **Admin PIN** — Secondary auth for \`/admin\` routes. Validated via \`admin_token\` cookie and \`verifyAdminToken()\`.
- **Team Portal PIN** — Team members authenticate with phone number + 4-digit PIN. JWT issued by \`/api/team-portal/auth\`.
- **Client Portal** — Clients authenticate via phone or email verification codes.
- **Impersonation** — Admins can impersonate any tenant via \`fl_impersonate\` cookie. Supports both Clerk super-admin and PIN-based admin.

**Pricing (one model — no tiers):**
- **$2,500/mo per admin seat** + **$250/mo per field team-member seat**
- **$25,000 one-time setup** (white-glove onboarding)
- Every feature included — there are no Starter/Growth/Pro tiers and no feature gating
- One operator per trade per city (exclusive territory)`,
  },
  {
    id: 'platform-messaging',
    title: 'Platform Messaging',
    content: `Two-way messaging between the platform admin and each tenant's OWNER. Threaded per tenant, stored in \`tenant_owner_messages\`.

**Level 1 — human ↔ human:**
- **Correction against the platform CLAUDE.md's description (which calls this fully live): the admin page's own source comment says inbound capture is still phase 2** — \`admin/tenant-chats/page.tsx\`: "Outbound sends via the tenant's own channel (Jefe's \`notifyTenantOwner\`). Inbound capture is phase 2 — for now Jeff initiates and sees replies once wired." Treat the admin side as send-and-see-replies-once-wired, not yet a fully live two-way inbox, until that phase-2 work is confirmed shipped.
- Admin side: \`/admin/tenant-chats\` — every tenant as a thread, owner replies surface here. Threads needing a reply sort to the top.
- Owner side: \`/dashboard/connect\` (pinned "Full Loop Support" conversation) — the owner reads admin messages and replies. Folded in from the old \`/dashboard/messages\`, which now just redirects there.
- **In-platform only** — sending stores a row (\`channel: 'platform'\`); it does NOT send SMS or email. (For external SMS/email to an owner, Jefe uses \`notify_tenant_owner\`, a separate path.)
- Both views poll every 15s while visible. True push-realtime is pending RLS policies.

**Level 2 — bot ↔ bot (groundwork in place):**
- Every message carries \`sender_role\` (\`admin\` | \`owner\` | \`jefe\` | \`tenant_agent\`) and a \`meta\` jsonb for future intent/summary.
- Jefe has tools \`read_tenant_thread\` (read-only) and \`send_tenant_message\` (confirm-gated) — a Jefe post is just an insert with \`sender_role: 'jefe'\`, no new plumbing.

**Schema — \`tenant_owner_messages\`:** \`tenant_id, direction ('in'=from owner | 'out'=from platform), channel, body, sender, sender_role, meta jsonb, read_at, created_at\`. Indexed on \`(tenant_id, created_at)\` and a partial unread index.`,
  },
  {
    id: 'architecture',
    title: 'Architecture',
    content: `**Tech Stack (verified against package.json):**
- **Framework:** Next.js 16.1.6 (App Router, Server Components, Route Handlers), React 19.2.3
- **Database:** Supabase (\`@supabase/supabase-js\` ^2.98.0) — PostgreSQL + Storage + Realtime
- **Auth:** Clerk (dashboard users) + custom JWT (team portal) + verification codes (client/referrer portals) + admin PIN
- **AI:** Anthropic Claude API (\`@anthropic-ai/sdk\` ^0.78.0) — powers Selena (SMS/web), the Voice AI agent, Jefe (platform GM), and the dashboard AI assistant
- **SMS:** Telnyx (per-tenant key, inbound/outbound SMS + webhooks)
- **Voice:** xAI (Grok) + Deepgram — per-tenant \`xai_api_key\`, \`tenant_xai_sip_creds\`, \`deepgram_api_key\`, \`tenant_voice_did\` (see Voice AI section)
- **Email:** Resend (^6.9.2) — transactional emails, templates, delivery webhooks
- **Payments:** Stripe (^20.4.0) — checkout sessions, payment links, webhooks, Stripe Connect (referrer + sales-partner commission payouts)
- **Hosting:** Vercel (serverless functions, 51 cron job files / 45 wired schedules, edge)
- **Styling:** Tailwind CSS — brand tokens locked in \`docs/design/tokens.md\` (cream \`--bg\`, ink text, Fraunces display font, no red — saddle-brown \`--warn\` instead)

**Directory Structure:**
- \`src/app/admin/\` — Platform admin, GLOBAL, one copy for all tenants (39 top-level pages)
- \`src/app/dashboard/\` — Tenant operator dashboard, GLOBAL, one copy for all tenants (40 top-level pages)
- \`src/app/team-portal/\` — Team member mobile app (PIN auth, check-in, video, earnings)
- \`src/app/portal/\` — Client-facing portal (booking, messaging, verification-code auth)
- \`src/app/site/<tenant>/\` — Public marketing + customer/cleaner portals ONLY, per-tenant. **Never operator tooling** — see Global Rule below.
- \`src/app/api/\` — All 577 API route handlers (see API Reference)
- \`src/lib/\` — Shared libraries (supabase, selena, jefe/, voice-agent/, notify, sms, email, tenant-query, migrations/, etc.)
- \`src/components/\` — Reusable React components (page-settings drawer, ai-assistant, Navbar, etc.)

**THE GLOBAL RULE (non-negotiable — from platform CLAUDE.md):**
Every operator/admin feature is GLOBAL: one shared codebase, edited once, applies to all tenants. Tenants differ by DATA, never by code.
- Never create a per-tenant operator/admin dashboard under \`src/app/site/<tenant>/\`.
- If a change has to be repeated per tenant, the architecture is wrong — fix the shared component/config instead.
- **Known debt (do NOT extend, migrate to global instead):** \`src/app/site/wash-and-fold-nyc/(app)/admin+dashboard\` (~22 cloned pages) and \`src/app/site/the-florida-maid/clients/dashboard\` (1 page) predate this rule and violate it. \`wash-and-fold-hoboken\`'s clone was deleted outright (2026-07-25) — no \`tenants\` row, unswapped nycmaid boilerplate.

**Multi-Tenant Design:**
- Every database table includes a \`tenant_id\` column
- \`tenant-query.ts\` (\`getTenantForRequest()\` / \`getTenantFromHeaders()\`) is the central auth + tenant resolution function used by every non-admin API route
- Resolves tenant context via: (1) admin impersonation cookie, (2) Clerk auth + user metadata, (3) super-admin override
- Returns \`TenantContext\` with \`userId\`, \`tenantId\`, \`tenant\`, and \`role\`
- All Supabase queries MUST filter by \`tenant_id\` — never query without it

**Admin Auth Flow:**
- Admin routes use \`require-admin.ts\` which checks for admin PIN token (\`admin_token\` cookie)
- Super admin is identified by \`SUPER_ADMIN_CLERK_ID\` env var
- Admin can impersonate any tenant via the businesses page

**Row-Level Security (RLS) — partial rollout, verify before assuming coverage:**
Of 13 RLS migration files, **5 are applied** (\`046_rls_deny_on_new_tables\`, \`2026_07_11_enable_rls_gap_tables\`, \`2026_07_11_rls_tenant_tables\` (+\`_verify\`), \`2026_07_15_rls_tier1_enable\`) and **8 are still suffixed \`_PROPOSED\` and NOT applied** (\`rls_pass3\` through \`rls_pass8\`, \`rls_next10\`, \`rls_top10\`). Application-layer \`tenant_id\` filtering is the enforced boundary today — do not assume database-level RLS blocks a cross-tenant query until a specific table's policy is confirmed applied in Supabase.

**Platform GM Agent — Jefe:**
\`src/lib/jefe/\` is an Anthropic-powered agent (\`agent.ts\`) that watches the platform (not any one tenant) for Jeff: growth pipeline, security events, stability, and each tenant's ability to operate (comms/payments working, not their revenue). Read-only tools plus confirm-gated actions (\`notifyTenantOwner\`, \`rerunCron\`, \`ackIssue\`, \`createTask\`, \`sendTenantMessage\`). See the Jefe section below for the monitoring/heartbeat/integration-health system that feeds it.`,
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    content: `All API routes live under \`/api/\`. This is a **complete, mechanically-verified inventory of all 577 route files** in \`src/app/api/\` (grep of every route.ts for its exported HTTP method handlers), grouped into 19 domains. Per-route prose descriptions live in the dedicated sections elsewhere in this doc for the domains covered in depth (Bookings, Selena/Voice AI, Team Portal, Sales, Finance, Connect, Jefe/Monitoring, Referrals) — for CRUD-boilerplate domains the path segment is the description ([id] = single-resource GET/PUT/DELETE, plural = list/create).

**Auth pattern by surface:** \`/api/admin/*\` -> admin PIN (\`admin_token\` cookie); everything else tenant-scoped via \`getTenantForRequest()\`/\`getTenantFromHeaders()\`; \`/api/team-portal/*\` -> team-member JWT; \`/api/portal/*\` -> client verification-code session; \`/api/cron/*\` -> \`CRON_SECRET\` Bearer token; \`/api/webhooks/*\` -> provider signature verification (Telnyx/Stripe/Resend/Clerk).

### Platform Admin — Cross-Tenant (130 routes)

| Group | Routes |
|---|---|
| \`admin-auth\` | 3 routes: \`/api/admin-auth\` (POST), \`/api/admin-auth/logout\` (POST), \`/api/admin-auth/me\` (GET) |
| \`admin-chat\` | 1 route: \`/api/admin-chat\` (POST) |
| \`admin/activity\` | 1 route: \`/api/admin/activity\` (GET) |
| \`admin/ai\` | 1 route: \`/api/admin/ai\` (POST) |
| \`admin/ai-chat\` | 1 route: \`/api/admin/ai-chat\` (POST) |
| \`admin/analytics\` | 2 routes: \`/api/admin/analytics\` (GET), \`/api/admin/analytics/live-feed\` (GET) |
| \`admin/announcements\` | 2 routes: \`/api/admin/announcements\` (GET,POST), \`/api/admin/announcements/[id]\` (PUT,DELETE) |
| \`admin/billing\` | 1 route: \`/api/admin/billing\` (GET,PUT) |
| \`admin/bookings\` | 3 routes: \`/api/admin/bookings\` (GET), \`/api/admin/bookings/[id]/cleaner-payout\` (POST), \`/api/admin/bookings/[id]/closeout-summary\` (GET) |
| \`admin/broadcast-guidelines\` | 1 route: \`/api/admin/broadcast-guidelines\` (POST) |
| \`admin/businesses\` | 10 routes: \`/api/admin/businesses\` (GET,POST), \`/api/admin/businesses/[id]\` (GET,PUT,DELETE), \`/api/admin/businesses/[id]/activate\` (POST), \`/api/admin/businesses/[id]/profile\` (GET,PATCH), \`/api/admin/businesses/[id]/provision\` (POST), \`/api/admin/businesses/[id]/readiness\` (GET), \`/api/admin/businesses/[id]/selena-preview\` (GET), \`/api/admin/businesses/[id]/site-export\` (GET), \`/api/admin/businesses/[id]/users\` (GET,POST,DELETE), \`/api/admin/businesses/[id]/verify-checklist\` (POST) |
| \`admin/calendar\` | 1 route: \`/api/admin/calendar\` (GET) |
| \`admin/campaigns\` | 2 routes: \`/api/admin/campaigns/generate\` (POST), \`/api/admin/campaigns/preview\` (POST) |
| \`admin/changelog\` | 1 route: \`/api/admin/changelog\` (GET,POST,PATCH) |
| \`admin/cleaner-availability\` | 1 route: \`/api/admin/cleaner-availability\` (GET) |
| \`admin/cleanup-phones\` | 1 route: \`/api/admin/cleanup-phones\` (POST) |
| \`admin/cleanup-test-bookings\` | 1 route: \`/api/admin/cleanup-test-bookings\` (POST) |
| \`admin/client-feedback\` | 1 route: \`/api/admin/client-feedback\` (GET,PUT,POST,DELETE) |
| \`admin/clients\` | 1 route: \`/api/admin/clients\` (GET) |
| \`admin/comhub\` | 20 routes: \`/api/admin/comhub/channels\` (POST), \`/api/admin/comhub/contacts/[id]/context\` (GET), \`/api/admin/comhub/contacts/[id]/notes\` (PATCH), \`/api/admin/comhub/email/backfill\` (POST), \`/api/admin/comhub/messages/[id]/flag\` (POST,DELETE), \`/api/admin/comhub/search-recipients\` (GET), \`/api/admin/comhub/send\` (POST), \`/api/admin/comhub/templates\` (GET,POST), \`/api/admin/comhub/templates/[id]\` (DELETE), \`/api/admin/comhub/threads\` (GET), \`/api/admin/comhub/threads/[id]\` (GET,PATCH), \`/api/admin/comhub/voice/active\` (GET), \`/api/admin/comhub/voice/cleanup\` (POST), \`/api/admin/comhub/voice/control\` (POST), \`/api/admin/comhub/voice/dial\` (POST), \`/api/admin/comhub/voice/log-softphone-call\` (POST), \`/api/admin/comhub/voice/presence\` (POST,GET,DELETE), \`/api/admin/comhub/voice/settings\` (GET,PUT), \`/api/admin/comhub/voice/token\` (POST,DELETE), \`/api/admin/comhub/yinez/send\` (POST) |
| \`admin/email\` | 1 route: \`/api/admin/email\` (GET,PUT) |
| \`admin/errors\` | 1 route: \`/api/admin/errors\` (GET,PATCH) |
| \`admin/feedback\` | 1 route: \`/api/admin/feedback\` (GET,PATCH) |
| \`admin/finance\` | 4 routes: \`/api/admin/finance\` (GET), \`/api/admin/finance/jobs\` (GET), \`/api/admin/finance/margin\` (GET), \`/api/admin/finance/more\` (GET) |
| \`admin/find-cleaner\` | 4 routes: \`/api/admin/find-cleaner/broadcast-booking\` (GET,POST), \`/api/admin/find-cleaner/preview\` (POST), \`/api/admin/find-cleaner/recent\` (GET), \`/api/admin/find-cleaner/send\` (POST) |
| \`admin/geocode-backfill\` | 1 route: \`/api/admin/geocode-backfill\` (POST) |
| \`admin/google\` | 5 routes: \`/api/admin/google/auth\` (GET), \`/api/admin/google/callback\` (GET), \`/api/admin/google/generate-reply\` (POST), \`/api/admin/google/reply\` (POST), \`/api/admin/google/status\` (GET) |
| \`admin/impersonate\` | 1 route: \`/api/admin/impersonate\` (POST,DELETE) |
| \`admin/invites\` | 1 route: \`/api/admin/invites\` (POST) |
| \`admin/leads\` | 1 route: \`/api/admin/leads\` (GET) |
| \`admin/marketing\` | 1 route: \`/api/admin/marketing\` (GET) |
| \`admin/message-applicants\` | 2 routes: \`/api/admin/message-applicants/preview\` (POST), \`/api/admin/message-applicants/send\` (POST) |
| \`admin/monitoring\` | 3 routes: \`/api/admin/monitoring/audit\` (GET), \`/api/admin/monitoring/errors\` (GET,PATCH), \`/api/admin/monitoring/status\` (GET) |
| \`admin/notes\` | 2 routes: \`/api/admin/notes\` (GET,POST,PATCH,DELETE), \`/api/admin/notes/upload\` (POST) |
| \`admin/notifications\` | 1 route: \`/api/admin/notifications\` (GET) |
| \`admin/payments\` | 2 routes: \`/api/admin/payments/confirm-match\` (POST), \`/api/admin/payments/finalize-match\` (POST) |
| \`admin/prospects\` | 2 routes: \`/api/admin/prospects\` (GET), \`/api/admin/prospects/[id]\` (GET,PATCH) |
| \`admin/recurring-reconcile\` | 1 route: \`/api/admin/recurring-reconcile\` (GET) |
| \`admin/recurring-schedules\` | 5 routes: \`/api/admin/recurring-schedules\` (GET,POST), \`/api/admin/recurring-schedules/[id]\` (GET,PUT,DELETE), \`/api/admin/recurring-schedules/[id]/exception\` (POST), \`/api/admin/recurring-schedules/[id]/pause\` (POST,DELETE), \`/api/admin/recurring-schedules/[id]/regenerate\` (POST) |
| \`admin/referrals\` | 1 route: \`/api/admin/referrals\` (GET) |
| \`admin/requests\` | 6 routes: \`/api/admin/requests\` (GET,PATCH,POST,DELETE), \`/api/admin/requests/[id]/agreement\` (POST), \`/api/admin/requests/[id]/proposal-checkout\` (POST), \`/api/admin/requests/[id]/proposal-email\` (POST), \`/api/admin/requests/convert\` (POST), \`/api/admin/requests/proposal\` (POST) |
| \`admin/reviews\` | 1 route: \`/api/admin/reviews\` (GET,PUT,DELETE) |
| \`admin/sales\` | 1 route: \`/api/admin/sales\` (GET,PUT,POST) |
| \`admin/schedule-issues\` | 2 routes: \`/api/admin/schedule-issues\` (GET,PUT), \`/api/admin/schedule-issues/fix\` (POST) |
| \`admin/security\` | 1 route: \`/api/admin/security\` (GET) |
| \`admin/selena\` | 4 routes: \`/api/admin/selena\` (GET,POST), \`/api/admin/selena/monitor\` (GET,POST), \`/api/admin/selena/score\` (GET,POST), \`/api/admin/selena/sms-status\` (GET) |
| \`admin/send-apology-batch\` | 1 route: \`/api/admin/send-apology-batch\` (POST) |
| \`admin/seo\` | 2 routes: \`/api/admin/seo\` (GET), \`/api/admin/seo/apply\` (POST) |
| \`admin/settings\` | 1 route: \`/api/admin/settings\` (GET,PUT) |
| \`admin/smart-schedule\` | 1 route: \`/api/admin/smart-schedule\` (GET) |
| \`admin/sms\` | 1 route: \`/api/admin/sms\` (GET,PUT) |
| \`admin/system-check\` | 1 route: \`/api/admin/system-check\` (GET,POST) |
| \`admin/team\` | 1 route: \`/api/admin/team\` (GET) |
| \`admin/team-availability-batch\` | 1 route: \`/api/admin/team-availability-batch\` (GET) |
| \`admin/tenant-chats\` | 1 route: \`/api/admin/tenant-chats\` (GET,POST) |
| \`admin/tenants\` | 2 routes: \`/api/admin/tenants\` (GET,PATCH), \`/api/admin/tenants/[id]\` (GET,PUT) |
| \`admin/territories\` | 1 route: \`/api/admin/territories\` (GET,POST) |
| \`admin/translate\` | 1 route: \`/api/admin/translate\` (POST) |
| \`admin/travel-time\` | 1 route: \`/api/admin/travel-time\` (POST) |
| \`admin/travel-times\` | 1 route: \`/api/admin/travel-times\` (GET) |
| \`admin/users\` | 3 routes: \`/api/admin/users\` (GET,POST,DELETE,PUT), \`/api/admin/users/[id]\` (PUT,DELETE), \`/api/admin/users/[id]/pin\` (POST,DELETE) |
| \`admin/websites\` | 1 route: \`/api/admin/websites\` (GET,POST) |

**Notable route behavior (deep-verified subset — this bucket is the single largest gap in this doc; most of the 62 groups above have only the mechanical route list, not behavior notes):**
- **\`admin/businesses\` is the real 5-stage tenant lifecycle** — create → \`provision\` (seed industry defaults) → \`profile\` (the ONE canonical field-level PATCH form every admin UI sits on, with vendor secrets encrypted via \`encryptTenantSecrets\`) → \`verify-checklist\` (live DNS/SSL/Resend/Telnyx/Stripe checks, persisted to \`setup_progress\`) → \`activate\` (idempotent go-live, returns the owner PIN exactly ONCE). Supporting tools on the same tenant: \`readiness\` (report-only site audit), \`selena-preview\` (see the literal system prompt Selena will use), \`site-export\` (downloadable ZIP of the live site — an explicit ownership promise), \`users\` (that tenant's own members, distinct from \`/admin/users\` which is the caller's own tenant). See the Onboarding Guide section for the full walkthrough.
- **\`admin/billing\`'s \`plan\` field (free/starter/pro/enterprise) is NOT a pricing tier — it's retained only as a non-pricing label** (for filtering/announcement targeting), per the route's own comment. Real revenue is seat-based: \`monthly_rate\` ($2,500/admin + $250/team) lives on each tenant row directly. If a "plan" ever looks like it's gating features, that's a bug — this platform has no feature-gated tiers (see Getting Started).
- **\`admin/comhub\` is a full internal unified-inbox + live softphone system**, not just a messaging log: \`threads\` (filterable by contact/channel/voice, open/snoozed/closed, unread/unresponded), \`templates\` (SMS/email canned responses), \`@mention\` resolution in composed messages, and a deep IMAP historical-email backfill (\`email/backfill\`, idempotent by Message-ID). The \`voice/*\` subtree is a real WebRTC softphone: \`voice/token\` issues a short-lived per-session Telnyx credential for the browser SDK, \`voice/dial\` does click-to-call (rings the admin's own phone first, bridges to the customer on answer), \`voice/control\` supports hold/mute/transfer(blind+warm)/hangup/speak/DTMF, \`voice/presence\` is an available/busy/away/offline heartbeat, \`voice/settings\` configures ring strategy (browser-only/cell-only/browser-then-cell/simultaneous) and caller-ID mode (show customer number vs. business number). \`comhub/yinez/send\` is Jeff's own internal AI chat inside ComHub (branded "Yinez (admin)") — see the naming-trap note under Communications/AI.
- **\`admin/finance\` (cross-tenant platform rollups) has explicitly known, source-flagged gaps in ledger completeness — these are not hidden, the code comments say so directly:** \`admin/finance/jobs\` (job costing) and \`admin/finance/more\` (vendor spend, inventory value, equipment book value) compute real values, but those values do NOT currently post to the ledger automatically — inventory consumption and equipment depreciation are tracked as numbers, not auto-journaled entries yet ("plumbing phase," per the route's own comment, not yet built). This means the Jobs tab's actuals and the Revenue/Margin tabs' ledger-sourced COGS **can legitimately disagree** until that auto-posting is built. \`admin/finance\` (Revenue tab) itself was recently rewritten to fix a real bug: the old response shape didn't match what the frontend actually read, so the platform Revenue tab was silently wrong before this fix (same class of ledger-vs-raw-table bug fixed per-tenant on 2026-07-25, now fixed at the platform rollup too).
- **\`admin/requests\` is the actual lead-to-tenant SALES pipeline for FullLoop's own business** (not a tenant's own request system) — this is what happens after a prospect is captured by \`/api/prospects\` or the Voice AI prospect line: \`requests/proposal\` builds the pricing proposal on a lead ($25k setup auto-applied + admin/team seat counts + computed monthly, saved to the lead, pipeline advances to \`'proposed'\`), \`requests/[id]/agreement\` generates a real service-agreement PDF through the SAME in-house e-sign module \`documents\` uses (client signs first, FullLoop countersigns, sequential signers), \`requests/[id]/proposal-checkout\` generates the actual Stripe Checkout link (seats + $25k setup, ACH or card), and \`requests/[id]/proposal-email\` previews or sends that to the lead. \`requests/convert\` is the manual-comp override path — creates a tenant WITHOUT payment (idempotent: converting an already-converted lead just returns its existing tenant); the normal paid path creates the tenant automatically off the Stripe webhook. Both paths share one \`createTenantFromLead\` function so a tenant is always built the same way regardless of how it got there. **Full real-money lifecycle, start to finish: \`prospects\`/Voice AI intake → \`admin/requests\` (proposal → agreement → checkout) → \`admin/businesses\` (provision → verify-checklist → activate).**
- **The API routes above are still fully live, but there is no \`/admin/requests\` PAGE anymore** — it's a redirect to \`/admin/leads\`, which is ITSELF a redirect to \`/admin/sales\` (Leads/Accounts view). That's a double-redirect chain (an old route pointing at another old route that already moved on), not broken, just an unnecessary extra hop — the proposal/agreement/checkout actions live inside the \`/admin/sales\` UI now, driven by these same API endpoints.
- **\`admin/recurring-schedules\` deliberately suppresses ALL client-facing notifications — this is a standing product decision (Jeff's call), not an oversight.** Pausing a schedule, cancelling it, or applying a per-occurrence exception (skip/move/reassign one date) all cancel or touch real bookings but send NO client SMS/email/push — the admin is expected to communicate changes manually. \`recurring-schedules/[id]/regenerate\` replaced a fragile client-side loop (delete-each-future-booking, then create-each-new-one — N+N requests, partial-failure-prone) with one atomic server call that updates the pattern and set-based-deletes only future scheduled/pending bookings, never touching completed/paid/cancelled history.
- **\`admin/selena\` has three distinct monitoring layers, not one:** the admin dashboard (\`admin/selena\` — conversation list + aggregate stats + can reset a stuck conversation, kicking off a fresh recovery message for SMS), an external Bearer-keyed monitor endpoint (\`admin/selena/monitor\`, keyed by \`ELCHAPO_MONITOR_KEY\` so ops tooling can scrape stats without an admin session — multi-tenant, defaults to platform-wide summed numbers if no tenant specified), and a conversation quality-scoring API (\`admin/selena/score\`). \`admin/selena/sms-status\` notes a real current gap: **FullLoop has no dedicated \`sms_logs\` table yet** — outbound SMS status is sourced by joining \`sms_conversation_messages\` back to the conversation, which only works for conversational sends; a non-conversation send (e.g. a reminder cron) has no logging path today.
- \`admin/impersonate\` — impersonation sessions are capped at a 1-hour cookie (\`MAX_AGE = 3600\`), not indefinite; re-impersonating is required after expiry, by design.
- **\`admin/users\` creation deliberately goes through \`admin/invites\` (a Clerk invite flow) — direct password-based user creation is not supported, by design.** Owner-only list.
- \`admin/travel-time\` (singular) vs \`admin/travel-times\` (plural) — another singular/plural pair that is NOT a duplicate: singular estimates ONE from/to pair via Haversine straight-line-distance transit estimation; plural is the batch route-builder across a single date or a date range, returning per-date team routes.
- \`admin/recurring-reconcile\` — read-only drift check between the \`recurring_schedules\` config and the bookings actually generated from it. Never mutates; a pure audit.
- \`admin/tenant-chats\` — "lives in Jefe's family": Jeff (or Jefe, the agent, acting on his behalf) talking to tenant OWNERS, threaded per tenant — this is the admin side of Platform Messaging described earlier in this doc, confirmed from source.
- \`admin/prospects\` — super-admin review of FullLoop's own prospect pipeline (the same \`prospects\` table fed by the public \`/api/prospects\` intake and the Voice AI prospect-qualification line).
- Ops/cleanup utilities, not user-facing features: \`admin/geocode-backfill\` (fills missing lat/lng for clients + team members), \`admin/cleanup-phones\` (strips bidirectional/zero-width Unicode characters that can hide in phone columns), \`admin/cleanup-test-bookings\` (purges test-generated data by pattern matching, supports \`?dry=true\` preview). All tenant-scoped, all ported from nycmaid, all gated on \`settings.edit\`.
- \`admin/translate\` — quick ad-hoc Claude translation utility (defaults to Spanish), separate from Loop Connect's automatic EN/ES translation pipeline.
- **\`admin/broadcast-guidelines\` appears to be dead/orphaned code — grep of the dashboard and admin UI trees found no caller for it.** The real, wired "broadcast to the team" UI (\`AnnouncementsTab.tsx\`) calls \`settings/team-announcements\` instead (see the Tenants & Settings notes above for why that replacement happened). Confirm in the live frontend before building on \`broadcast-guidelines\` — it may simply be unreferenced leftover from before the Team Announcements rebuild.
- \`admin/monitoring/*\` is three separate read-only, cross-tenant-by-design surfaces: \`status\` (cron freshness + comms/Selena/pipeline counts), \`audit\` (surfaces \`audit_logs\` — the SAME sensitive actions that also trigger a real-time Telegram alert per \`SENSITIVE_AUDIT_ACTIONS\` in \`lib/audit.ts\`, plus optionally full history), and \`errors\` (the review surface for \`error-tracking.ts\`'s writes, including auth-failure logging added across every login surface — relevant to the unresolved \`/api/auth/login\`/\`admin_users\` contradiction noted under Security, since an actual failure there would show up here).
- \`admin/notes\` — timestamped, authored, image-capable CRM notes attachable to either a LEAD or a TENANT (\`subject_type\`), not booking/client notes (those live elsewhere, e.g. \`booking-notes\`, \`clients/[id]\` notes).
- \`admin/message-applicants\` — broadcast SMS to un-hired job applicants, with real safety gates re-applied server-side regardless of what the client sends: a \`TEST_MODE\` (restricts to the test applicant only), a hard \`BROADCAST_CAP\`, and phone-number dedup — "never trust the client's id list" per the route's own comment.
- \`admin/send-apology-batch\` — sends a discount-credit SMS to one or many clients in a single admin action; a distinct, smaller-scope tool from the full campaign system.
- \`admin/payments/confirm-match\` — manually reconciles an unmatched Zelle/Venmo payment to a booking. Tip detection is automatic (amount paid over the expected total becomes tip, credited to the team member) but there's NO Stripe Connect transfer in this path — that only applies to card payments; if a team member is owed from a Zelle/Venmo job, the admin pays them manually from the dashboard.
- \`admin/seo\` (GET) reads a \`seo_fleet_summary\` VIEW (28-day rollup per property) for a portfolio-wide SEO summary; \`seo/apply\` applies or reverts a Tier-1 title/meta override and triggers a revalidation — distinct from the tenant-level \`seo/verify-file/[file]\` route covered under SEO below, which is a per-tenant search-console ownership-verification file server.
- **\`admin/ai\` is NOT Jefe** — it's a Selena conversation-testing tool (pick a tenant, simulate a web-chat message via legacy \`askSelena\`). \`admin/ai-chat\` is a separate CRM copilot (Claude + tools to query/mutate a tenant's CRM data) whose only current frontend callers are the legacy per-tenant clone sites, not the global admin dashboard. Neither of these is Jefe — see the corrected Jefe section for where Jefe actually lives (Telegram + cron only, no dashboard chat page).
- \`admin-chat\` (top-level, not under \`/admin/\`) — has a nycmaid-only special case (\`OWNER_PHONES\`) baked in; treat as legacy/tenant-specific, not a generic pattern to copy for a new tenant.
- \`admin/analytics/live-feed\` — live visitor feed, bot-filtered, capped at 100 rows; ported from a single-tenant nycmaid version and now properly tenant-scoped.
- \`admin/changelog\` reads from the same \`platform_announcements\` table as \`admin/announcements\` — the changelog and the announcements feed are two views over one table, not two separate content stores.
- \`admin/settings\` (super-admin tenant field editor) — enforces an explicit allowlist of which tenant columns a super-admin may write through this route, excluding \`id\`/\`slug\`/\`created_at\` and system-managed fields like \`google_tokens\`, \`google_business\`, \`stripe_account_id\`. A new tenant-settable field must be deliberately added to that allowlist — it won't work by default just because the column exists.
- \`admin/territories\` — super-admin-only territory CLAIM system (claim/release a territory+category pair, county→territory mapping, live recolor of active claims by category). This is the operational backing for the exclusive trade × zip territory enforcement noted under Sales / CRM / Catalog's \`prospects\` entry.
- **The remaining un-annotated groups in this bucket** (\`admin/activity\`, \`admin/announcements\`, \`admin/bookings\`, \`admin/calendar\`, \`admin/campaigns\`, \`admin/cleaner-availability\`, \`admin/client-feedback\`, \`admin/clients\`, \`admin/email\`, \`admin/feedback\`, \`admin/google\`, \`admin/leads\`, \`admin/marketing\`, \`admin/notifications\`, \`admin/referrals\`, \`admin/reviews\`, \`admin/sms\`, \`admin/team\`, \`admin/team-availability-batch\`) were spot-checked and follow the SAME established pattern already documented above: \`requireAdmin()\` gate, then either an all-tenants read (like \`admin/activity\`, explicitly cross-tenant across every tenant — a tenant-scoped operator uses \`/api/audit\` + \`/dashboard/activity\` instead, never this route) or a single-tenant read scoped by a \`tenant_id\` query param. Two worth a specific mention: \`admin/campaigns/generate\` and \`admin/google/generate-reply\` are both AI-copy-generation helpers that use the target tenant's own name/industry/brand color to keep generated copy on-brand — genuinely tenant-aware, not generic boilerplate. \`admin/team-availability-batch\` is a direct nycmaid port of the same logic as \`admin/cleaner-availability\` — another same-underlying-logic, different-name pair like \`cleaners\`/\`team\`.

### Cron Jobs (51 routes)

| Route | Schedule | Wired in vercel.json? |
|---|---|---|
| \`/api/cron/anthropic-health\` | every 15 min | yes |
| \`/api/cron/auto-reply-reviews\` | every 6 hr (:30) | yes |
| \`/api/cron/backup\` | daily 5:00 UTC | yes |
| \`/api/cron/cleanup-videos\` | daily 4:00 UTC | yes |
| \`/api/cron/comhub-email\` | every 2 min | yes |
| \`/api/cron/comms-monitor\` | every 15 min | yes |
| \`/api/cron/confirmation-reminder\` | every 5 min | yes |
| \`/api/cron/confirmations\` | hourly | yes |
| \`/api/cron/daily-summary\` | hourly | yes |
| \`/api/cron/duplicate-schedule-audit\` | daily 5:30 UTC | yes |
| \`/api/cron/email-monitor\` | every minute | yes |
| \`/api/cron/finance-post\` | daily 4:00 UTC | yes |
| \`/api/cron/gdpr-purge\` | daily 9:00 UTC | yes |
| \`/api/cron/generate-recurring\` | daily 6:00 UTC | yes |
| \`/api/cron/health-check\` | daily 12:00 UTC | yes |
| \`/api/cron/health-monitor\` | hourly | yes |
| \`/api/cron/integration-health-sweep\` | every 6 hr | yes |
| \`/api/cron/jefe-heartbeat\` | every 30 min | yes |
| \`/api/cron/late-check-in\` | hourly | yes |
| \`/api/cron/lifecycle\` | — | **no — manual/dead trigger only** |
| \`/api/cron/no-show-check\` | — | **no — manual/dead trigger only** |
| \`/api/cron/outreach\` | weekly Sat 14:00 UTC | yes |
| \`/api/cron/payment-followup-daily\` | hourly | yes |
| \`/api/cron/payment-reminder\` | every 5 min | yes |
| \`/api/cron/phone-fixup\` | daily 13:00 UTC | yes |
| \`/api/cron/post-depreciation\` | monthly, 1st @ 5:00 UTC | yes |
| \`/api/cron/post-job-followup\` | every 30 min | yes |
| \`/api/cron/rating-prompt\` | every 5 min | yes |
| \`/api/cron/recurring-expenses\` | daily 6:00 UTC | yes |
| \`/api/cron/seo-freshness\` | daily 3:00 UTC (part of seomgr) | yes |
| \`/api/cron/refresh-social-tokens\` | daily 3:30 UTC | yes |
| \`/api/cron/release-due-payments\` | daily 7:00 UTC | yes |
| \`/api/cron/reminders\` | hourly | yes |
| \`/api/cron/renurture\` | weekly Tue 15:00 UTC | yes |
| \`/api/cron/sales-follow-ups\` | hourly | yes |
| \`/api/cron/schedule-monitor\` | hourly | yes |
| \`/api/cron/score-conversations\` | hourly | yes |
| \`/api/cron/seo-autopilot\` | — | **no — manual/dead trigger only** |
| \`/api/cron/seo-autoverify\` | daily 8:00 UTC | yes |
| \`/api/cron/seo-competitors\` | — | **no — manual/dead trigger only** |
| \`/api/cron/seo-detect\` | daily 6:30 UTC | yes |
| \`/api/cron/seo-enrich\` | — | **no — manual/dead trigger only** |
| \`/api/cron/seo-health\` | daily 9:00 UTC | yes |
| \`/api/cron/seo-improve\` | — | **no — manual/dead trigger only** |
| \`/api/cron/seo-ingest\` | daily 6:00 UTC | yes |
| \`/api/cron/seo-propose\` | — | **no — manual/dead trigger only** |
| \`/api/cron/seo-technical\` | weekly Tue 7:00 UTC | yes |
| \`/api/cron/seo-verify-revert\` | — | **no — manual/dead trigger only** |
| \`/api/cron/sync-google-reviews\` | daily 3:00 UTC | yes |
| \`/api/cron/system-check\` | hourly | yes |
| \`/api/cron/tenant-health\` | every 15 min | yes |

### Webhooks (10 routes)

| Group | Routes |
|---|---|
| \`webhooks\` | 9 routes: \`/api/webhooks/resend\` (POST), \`/api/webhooks/stripe\` (POST), \`/api/webhooks/stripe-platform\` (POST), \`/api/webhooks/telegram\` (GET,POST), \`/api/webhooks/telegram/[tenant]\` (POST), \`/api/webhooks/telegram/jefe\` (POST), \`/api/webhooks/telnyx\` (POST), \`/api/webhooks/telnyx-voice\` (POST), \`/api/webhooks/telnyx-voice-agent/[secret]\` (POST) — \`/api/webhooks/clerk\` removed 2026-07-31, Clerk fully replaced by the PIN/session system, route was dead reachable attack surface |

### Bookings & Scheduling (31 routes)

| Group | Routes |
|---|---|
| \`availability\` | 1 route: \`/api/availability\` (GET) |
| \`booking-notes\` | 5 routes: \`/api/booking-notes\` (GET,POST), \`/api/booking-notes/[id]\` (DELETE), \`/api/booking-notes/[id]/retry-process\` (POST), \`/api/booking-notes/upload\` (POST), \`/api/booking-notes/video\` (GET,POST) |
| \`bookings\` | 11 routes: \`/api/bookings\` (GET,POST), \`/api/bookings/[id]\` (GET,PUT,DELETE), \`/api/bookings/[id]/payment\` (PATCH), \`/api/bookings/[id]/reset\` (POST), \`/api/bookings/[id]/status\` (PATCH), \`/api/bookings/[id]/team\` (GET,PUT), \`/api/bookings/batch\` (POST), \`/api/bookings/batch-update\` (PUT), \`/api/bookings/broadcast\` (POST), \`/api/bookings/closeout\` (GET), \`/api/bookings/stats\` (GET) |
| \`recurring-expenses\` | 2 routes: \`/api/recurring-expenses\` (GET,POST), \`/api/recurring-expenses/[id]\` (PATCH,DELETE) |
| \`routes\` | 5 routes: \`/api/routes\` (GET,POST), \`/api/routes/[id]\` (GET,PATCH,DELETE), \`/api/routes/[id]/optimize\` (POST), \`/api/routes/[id]/publish\` (POST), \`/api/routes/auto-build\` (POST) |
| \`schedule\` | 1 route: \`/api/schedule/calendar\` (GET) |
| \`schedules\` | 3 routes: \`/api/schedules\` (GET,POST), \`/api/schedules/[id]\` (GET,PUT,DELETE), \`/api/schedules/[id]/pause\` (POST,DELETE) |
| \`service-area\` | 1 route: \`/api/service-area\` (GET,PUT) |
| \`team-availability\` | 1 route: \`/api/team-availability\` (GET) |
| \`waitlist\` | 1 route: \`/api/waitlist\` (GET,POST) |

**Notable route behavior (verified from source, not inferred from the path):**
- \`bookings/batch-update\` (PUT) — has a hard-earned field allowlist (\`UPDATABLE_FIELDS\`). \`discount_enabled\` was removed from it (not a real column — 400s the whole batch); \`discount_percent\` was added after a real bug where recurring "apply to all future" edits silently dropped discount changes because \`pick()\` stripped a field missing from this list.
- \`bookings/batch\` (POST) — bulk-create for recurring-schedule expansion; notifications fire ONLY for the first row in the batch, by design.
- \`bookings/closeout\` (GET) — "needs closeout" = status in (completed, in_progress, paid) AND (payment not yet \`paid\` OR team member not yet marked paid). Also returns the last 7 days of fully-closed jobs for reference.
- \`bookings/[id]/reset\` (POST) — admin undo for an accidental check-in/check-out tap. Blocked outright once \`payment_status === 'paid'\` — money and texts have already gone out, so a paid job's check-in/out can't be silently reverted; the office handles that manually.
- \`bookings/[id]/status\` (PATCH) — enforces a strict status state machine (\`VALID_TRANSITIONS\`): e.g. \`completed\` can only move to \`paid\`, terminal states (\`cancelled\`, \`no_show\`, \`paid\`) can't move anywhere.
- \`bookings/[id]/team\` (GET/PUT) — multi-tech support: a booking has one lead (\`bookings.team_member_id\`) plus optional extras in \`booking_team_members\`. PUT rewrites both; only newly-added extras get notified (the lead's notification path is the regular booking PUT).
- \`bookings/stats\` (GET) — deliberately uses naive Eastern-Time wall-clock string math instead of real UTC \`Date\` comparison, because \`bookings.start_time\` is stored as naive ET. This sidesteps the same bug class that once flipped a 10am ET booking to no-show at 6:45am ET (see \`cron/no-show-check\`).
- \`booking-notes\` (GET/POST) — one thread shared by three different caller types (admin cookie, client-portal cookie, team-portal Bearer token), resolved in a specific order: a Bearer token wins over a cookie even if both are present on the same request — otherwise an admin impersonating a tenant while also open in the team portal could have a cleaner's reply silently post as "Admin."
- \`availability\` (GET, public) — duration-aware slot search; longer services filter out slots too late in the day to fit. Accepts either a logged-in tenant context or a portal token.
- \`team-availability\` (GET, admin) — smart-ranks team members for a slot: preferred → prior history with this client → current workload, not just "who's free."
- \`waitlist\` (GET/POST) — GET unions two sources into one list: the dedicated \`waitlist\` table AND legacy \`sms_conversations\` rows with \`outcome='waitlisted'\` from the SMS agent flow. POST is public/rate-limited, tenant resolved from a signed middleware header (no admin auth needed for a client hitting the public "nothing fits" form).

### Clients & Feedback (35 routes)

| Group | Routes |
|---|---|
| \`client\` | 17 routes: \`/api/client/availability\` (GET), \`/api/client/book\` (POST), \`/api/client/booking/[id]\` (GET), \`/api/client/bookings\` (GET), \`/api/client/check\` (GET,POST), \`/api/client/collect\` (POST), \`/api/client/confirm/[token]\` (GET,POST), \`/api/client/login\` (POST), \`/api/client/notes\` (GET,PUT), \`/api/client/preferred-cleaner\` (GET,PUT), \`/api/client/properties\` (GET,POST,PATCH), \`/api/client/recurring\` (POST), \`/api/client/recurring/[id]\` (PUT), \`/api/client/reschedule/[id]\` (PUT), \`/api/client/send-code\` (POST), \`/api/client/smart-schedule\` (GET), \`/api/client/verify-code\` (POST) |
| \`client-analytics\` | 1 route: \`/api/client-analytics\` (GET) |
| \`client-feedback\` | 1 route: \`/api/client-feedback\` (POST) |
| \`clients\` | 13 routes: \`/api/clients\` (GET,POST), \`/api/clients/[id]\` (GET,PUT,DELETE), \`/api/clients/[id]/activity\` (GET), \`/api/clients/[id]/contacts\` (GET,POST), \`/api/clients/[id]/contacts/[contactId]\` (PUT,DELETE), \`/api/clients/[id]/export\` (GET), \`/api/clients/[id]/gdpr-delete\` (POST,DELETE), \`/api/clients/[id]/properties\` (GET,POST,PATCH), \`/api/clients/[id]/transcript\` (GET), \`/api/clients/analytics\` (GET), \`/api/clients/enriched\` (GET), \`/api/clients/import\` (POST), \`/api/clients/stats\` (GET) |
| \`feedback\` | 1 route: \`/api/feedback\` (GET,POST,PATCH) |
| \`gdpr\` | 1 route: \`/api/gdpr/export\` (GET) |
| \`import-clients\` | 1 route: \`/api/import-clients\` (POST) |

**Notable route behavior:**
- **Naming trap — two unrelated "feedback" systems:** \`client-feedback\` (public, unauthenticated — a CLIENT rating their service) is completely separate from \`feedback\` (\`platform_feedback\` table — a TENANT BUSINESS giving product feedback to FullLoop itself). \`client-feedback\` was renamed from nycmaid's original \`/api/feedback\` specifically to avoid colliding with this platform-level one. \`client-feedback\` tags every submission \`client\` (phone matched a known client — also feeds Yinez's per-client memory), \`anonymous\`, or \`unmatched\`.
- **Two client-import routes exist:** \`clients/import\` and the top-level \`import-clients\` — both do bulk client import. Confirm which one the current UI actually calls before assuming either is dead code; this doc doesn't resolve that duplication, it just flags it.
- \`clients/analytics\` (GET) — lifecycle (active/at_risk/churned) is computed against **tenant-configured** threshold days (\`active_client_threshold_days\`, \`at_risk_threshold_days\` in settings), not a hardcoded window — two tenants can have different definitions of "at risk."
- \`clients/enriched\` (GET) — a richer lifecycle model than the basic one: stages \`lead/first/active/vip/risk/lapsed/dns\` plus a numeric \`health\` score and \`health_band\` (\`vip/healthy/ok/risk/critical\`).
- \`clients/import\` (POST) — dedupes phones on a **last-10-digits** comparison key specifically so a pre-migration 10-digit row and a newly-imported 11-digit E.164 row (leading "1") still match instead of silently double-importing.
- \`client-analytics\` (GET) — the auth comment on this file notes it replaced a legacy \`admin_session\` check that looked like auth but wasn't (the domain-resolution step alone doesn't authenticate) — worth remembering if a similarly-named older pattern turns up elsewhere in the codebase.
- \`clients/[id]/gdpr-delete\` and \`gdpr/export\` — right-to-erasure and data-export are gated on \`settings.edit\` (owner/admin only, since export emits raw PII); \`gdpr/export\` supports scoping to one client (a real Data Subject Access Request) or the tenant's whole customer dataset, as ZIP (CSV-per-domain) or raw JSON.
- \`import-clients\` (POST) — PIN collisions on bulk import 409 by design (migration 014 enforces unique PIN per tenant); caller is expected to retry with a different seed, not treat a 409 as a hard failure.

### Sales / CRM / Catalog (46 routes)

| Group | Routes |
|---|---|
| \`attribution\` | 2 routes: \`/api/attribution\` (POST,GET), \`/api/attribution/manual\` (GET,POST) |
| \`budget-templates\` | 4 routes: \`/api/budget-templates\` (GET,POST), \`/api/budget-templates/[id]\` (GET,PUT,DELETE), \`/api/budget-templates/[id]/apply-to-quote/[quoteId]\` (POST), \`/api/budget-templates/[id]/apply-to-recurring/[scheduleId]\` (POST) |
| \`catalog\` | 2 routes: \`/api/catalog\` (GET,POST,PATCH,DELETE), \`/api/catalog/[id]/materials\` (GET,POST,DELETE) |
| \`categories\` | 1 route: \`/api/categories\` (GET,POST,PATCH,DELETE) |
| \`deals\` | 7 routes: \`/api/deals\` (GET,POST,PUT,DELETE), \`/api/deals/[id]\` (GET,PATCH,DELETE), \`/api/deals/[id]/activities\` (GET,POST), \`/api/deals/[id]/stage\` (POST), \`/api/deals/at-risk\` (GET,POST), \`/api/deals/manual\` (POST), \`/api/deals/team-mentions\` (GET) |
| \`domain-notes\` | 1 route: \`/api/domain-notes\` (GET,POST) |
| \`inquiry\` | 1 route: \`/api/inquiry\` (POST) |
| \`lead\` | 1 route: \`/api/lead\` (POST) |
| \`lead-media\` | 1 route: \`/api/lead-media/signed-url\` (POST) |
| \`leads\` | 8 routes: \`/api/leads\` (POST), \`/api/leads/attribution\` (GET), \`/api/leads/block\` (POST,DELETE), \`/api/leads/domains\` (GET), \`/api/leads/feed\` (GET), \`/api/leads/override\` (POST), \`/api/leads/verify\` (PATCH), \`/api/leads/visits\` (GET,POST) |
| \`pipeline\` | 1 route: \`/api/pipeline\` (GET) |
| \`prospects\` | 1 route: \`/api/prospects\` (POST) |
| \`quote-budgets\` | 4 routes: \`/api/quote-budgets\` (GET), \`/api/quote-budgets/[quoteId]\` (GET,PUT), \`/api/quote-budgets/recurring\` (GET), \`/api/quote-budgets/recurring/[scheduleId]\` (GET,PUT) |
| \`quote-templates\` | 1 route: \`/api/quote-templates\` (GET,POST) |
| \`quotes\` | 9 routes: \`/api/quotes\` (GET,POST), \`/api/quotes/[id]\` (GET,PATCH,DELETE), \`/api/quotes/[id]/convert\` (POST), \`/api/quotes/[id]/convert-to-job\` (POST), \`/api/quotes/[id]/send\` (POST), \`/api/quotes/public/[token]\` (GET), \`/api/quotes/public/[token]/accept\` (POST), \`/api/quotes/public/[token]/decline\` (POST), \`/api/quotes/public/[token]/deposit-checkout\` (POST) |
| \`sales-applications\` | 1 route: \`/api/sales-applications\` (GET,POST,PUT,DELETE) |
| \`service-types\` | 1 route: \`/api/service-types\` (GET) |

**Notable route behavior — this domain has more near-duplicate-sounding routes than any other; get the distinctions right before touching any of them:**
- **\`quote_budgets\` vs \`budget_templates\` are NOT the same thing.** \`quote-budgets\` is the per-quote actual/tracking record (has real actuals once a job is underway) backing the "Master Budget" page. \`budget-templates\` is a standalone, reusable, named costing pattern (e.g. "Basic Lawn Care Package") with NO actuals — a costing pattern, not a job in progress — applied to a specific quote later via \`budget-templates/[id]/apply-to-quote/[quoteId]\` (or to a recurring schedule via \`apply-to-recurring\`).
- **\`deals\` vs \`pipeline\`:** \`deals\` is the CRUD for individual sales-pipeline items; \`pipeline\` (GET only) is a snapshot query that groups ALL open + recently-closed deals by stage plus forecast/stage totals in one call — it's what feeds the Kanban board, not a separate data model.
- **\`catalog\` vs \`service-types\` vs \`categories\`:** \`catalog\` is the single per-tenant source of truth (\`service_types\` table) — every item has a type (service/project/product/equipment) and is priced hourly or per-job; \`equipment\` items are backed by real depreciable asset rows (not consumable stock). The public \`service-types\` route filters that same catalog down to \`item_type='service'\` only (a booking form must never offer equipment/products as a "service") and falls back to a legacy \`settings.service_types\` JSON blob only for a tenant that hasn't populated the catalog yet. \`categories\` is a shared tree used by Catalog AND Vendors AND Inventory together, and can carry default revenue/COGS chart-of-accounts links so tagging an item also tells the ledger which account it belongs in.
- **\`lead\` (singular) vs \`leads\` (plural) are different systems, not a versioning split:** \`lead\` is the tenant-aware capture endpoint several external marketing sites (nyc-tow, toll-trucks-near-me, the-home-services-company, we-pay-you-junk) already POST to — writes to \`clients\` + \`portal_leads\`. \`leads\` (plural) POST is FullLoop's own onboarding-page lead capture, writing to a separate \`leads\` table entirely. Don't assume they share a table.
- **Two separate attribution systems:** \`attribution\` (POST/GET) matches unattributed BOOKINGS back to the domain/CTA that sourced them (an explicit, re-runnable job — \`?reset=true\` clears and reruns); \`leads/attribution\` (GET) is a real-time source breakdown of website VISITS honoring the tenant's configured attribution window (\`attribution_window_hours\`). Different subjects (bookings vs. visits), different code paths.
- \`leads/feed\` (GET) — a scored lead-ranking feed (\`hot/warm/cold/dead\` bands with a numeric score) — a real prioritization layer on top of raw lead capture, not just a list.
- \`prospects\` (POST, public, no auth) — this is FullLoop's OWN prospect-qualification intake (people who want to become FullLoop tenants, not a tenant's own leads). Checks for a trade × zip slot collision before accepting — this is the exclusive-territory enforcement point (see Getting Started's "one operator per trade per city").
- \`sales-applications\` (POST, public) — despite living in this bucket, this is Sales PARTNER program applications (rate-limited 3 per 10 minutes per IP), not a tenant's own sales pipeline.
- \`inquiry\` (POST, public, no DB write) — the marketing teaser site's general contact form. Its own source comment notes a **2026-05-03 strategy pivot away from selling standalone "territory licenses"** as a product — worth reconciling against the "exclusive territory" pricing language elsewhere if territory licensing comes up again; this doc doesn't resolve that tension, it just surfaces it.

### Referrals & Sales Partners (19 routes)

| Group | Routes |
|---|---|
| \`referral-commissions\` | 1 route: \`/api/referral-commissions\` (GET,POST,PUT) |
| \`referrals\` | 2 routes: \`/api/referrals\` (GET,POST), \`/api/referrals/[id]\` (PUT). \`/api/referrals/track\` was removed 2026-07-31 -- it was dead code (never called from any UI, queried the unrelated \`referrals\` table which has 0 rows in prod, and its own comment admitted it recorded nothing). Real referral click tracking lives in \`/api/referrers/[code]\` via \`lead_clicks.ref_code\`, populated on real booking-page visits. |
| \`referrers\` | 8 routes: \`/api/referrers\` (GET,POST), \`/api/referrers/[code]\` (GET), \`/api/referrers/analytics\` (GET), \`/api/referrers/auth/request\` (POST), \`/api/referrers/auth/verify\` (POST), \`/api/referrers/connect/[id]\` (PATCH), \`/api/referrers/connect/[id]/stripe-onboard\` (POST,GET), \`/api/referrers/connect/[id]/stripe-status\` (POST,GET) |
| \`sales-partner-commissions\` | 1 route: \`/api/sales-partner-commissions\` (GET,PUT) |
| \`sales-partners\` | 6 routes: \`/api/sales-partners\` (GET,POST,PUT), \`/api/sales-partners/[id]/stripe-invite\` (POST), \`/api/sales-partners/[id]/stripe-onboard\` (POST,GET), \`/api/sales-partners/[id]/stripe-status\` (POST,GET), \`/api/sales-partners/login\` (POST), \`/api/sales-partners/me\` (GET,PUT) |

### Finance & Billing (52 routes)

| Group | Routes |
|---|---|
| \`equipment\` | 2 routes: \`/api/equipment\` (GET,POST,PATCH,DELETE), \`/api/equipment/[id]/bookings\` (GET,POST,PATCH) |
| \`finance\` | 39 routes: \`/api/finance/ai-ask\` (POST), \`/api/finance/ar-aging\` (GET), \`/api/finance/audit-log\` (GET), \`/api/finance/backfill\` (POST), \`/api/finance/balance-sheet\` (GET), \`/api/finance/bank-accounts\` (GET,POST), \`/api/finance/bank-accounts/[id]\` (PATCH,DELETE), \`/api/finance/bank-connect/session\` (POST), \`/api/finance/bank-import\` (POST), \`/api/finance/bank-transactions\` (GET), \`/api/finance/bank-transactions/[id]\` (PATCH), \`/api/finance/bank-transactions/[id]/match\` (POST), \`/api/finance/bank-transactions/accept-suggestions\` (POST), \`/api/finance/bank-transactions/suggest\` (POST), \`/api/finance/cash-flow\` (GET), \`/api/finance/chart-of-accounts\` (GET,POST), \`/api/finance/cleaner-income\` (GET), \`/api/finance/cpa-tokens\` (GET,POST,DELETE), \`/api/finance/entities\` (GET,POST), \`/api/finance/entities/[id]\` (PATCH,DELETE), \`/api/finance/expenses\` (GET,POST), \`/api/finance/expenses/[id]\` (PUT,DELETE), \`/api/finance/mark-paid\` (POST), \`/api/finance/payroll\` (GET,POST), \`/api/finance/payroll-prep\` (GET), \`/api/finance/pending\` (GET), \`/api/finance/periods\` (GET,POST), \`/api/finance/periods/[id]\` (PATCH), \`/api/finance/pnl\` (GET), \`/api/finance/receipts\` (POST), \`/api/finance/receipts/attach\` (POST), \`/api/finance/reconcile-candidates\` (GET), \`/api/finance/revenue\` (GET), \`/api/finance/statements\` (GET,POST,DELETE), \`/api/finance/summary\` (GET), \`/api/finance/tax-export\` (GET), \`/api/finance/trial-balance\` (GET), \`/api/finance/upload\` (POST), \`/api/finance/year-end-zip\` (GET) |
| \`inventory\` | 1 route: \`/api/inventory\` (GET,POST,PATCH,DELETE) |
| \`invoices\` | 6 routes: \`/api/invoices\` (GET,POST), \`/api/invoices/[id]\` (GET,PATCH,DELETE), \`/api/invoices/[id]/record-payment\` (POST), \`/api/invoices/[id]/send\` (POST), \`/api/invoices/public/[token]\` (GET), \`/api/invoices/public/[token]/checkout\` (POST) |
| \`payments\` | 2 routes: \`/api/payments/checkout\` (POST), \`/api/payments/link\` (POST) |
| \`vendors\` | 2 routes: \`/api/vendors\` (GET,POST,PATCH,DELETE), \`/api/vendors/[id]/items\` (GET,POST,DELETE) |

**Notable route behavior — this is a real double-entry accounting backend, not just a revenue/expense tracker as the older draft of this doc implied:**
- **Full ledger reporting:** \`balance-sheet\`, \`trial-balance\`, and \`pnl\` are all ledger-derived (require actual double-entry journal postings — "raw tables can't provide" a real balance sheet, per the route's own comment). \`chart-of-accounts\` backs all three.
- **Bank reconciliation pipeline:** \`bank-connect/session\` opens a Stripe Financial Connections link (using the TENANT's own Stripe key, so each business links its own bank) → \`bank-import\` (multipart statement upload, parsed/deduped) or the live Connections sync → \`bank-transactions\` list → \`bank-transactions/suggest\` (bulk AI-suggested categorization) → \`bank-transactions/accept-suggestions\` (accept everything above a confidence threshold in one action, posting journal entries) or \`bank-transactions/[id]\` (PATCH one manually, which posts a journal entry against both the bank's account and the chosen account).
- **Receipt OCR:** \`finance/receipts\` (POST) runs Claude vision OCR on an uploaded receipt image, tries to match it against a pending bank transaction by amount+date, and lets the UI either attach it to that match or create a standalone expense (\`receipts/attach\`).
- **Natural-language finance Q&A:** \`finance/ai-ask\` (POST) — Claude answers questions against a precomputed stats snapshot. Explicitly NOT a full agent loop, just one-shot Q&A on numbers already computed elsewhere.
- **Accounting periods:** \`finance/periods\` supports open/close/reopen — this is a real period-close workflow (matches the Finance hub's "Close" tab), not just a date filter.
- **Accountant access:** \`finance/cpa-tokens\` issues scoped access tokens tied to \`entities\` (legal entities) so an outside accountant can be given access without a full dashboard login — backs the Finance hub's "Accountant" tab.
- **Cash flow & AR aging:** \`cash-flow\` is a 4-week forecast (inflows = scheduled bookings + unpaid invoices with a due date; outflows = recurring expenses due in that window). \`ar-aging\` buckets unpaid invoices AND unpaid completed bookings together by days-past-due — shared logic lives in \`src/lib/finance/ar-aging.ts\` so the dashboard homepage and Finance Overview agree on the number.
- **Payroll/1099 prep:** \`payroll-prep\` computes gross pay + hours + payouts per team member and flags 1099 status once a team member crosses $600 year-to-date — a real tax-compliance trigger, not just a payout summary.
- **Year-end package:** \`year-end-zip\` bundles P&L, Trial Balance, General Ledger, Invoices, Expenses, and Payouts into one downloadable zip for the accountant; \`tax-export\` is the lighter single-CSV version.
- **Equipment vs. Inventory vs. Vendors — three distinct records, not overlapping features:** \`equipment\` is depreciable physical ASSETS that get checked out and returned (dumpsters, generators), carrying real depreciation fields (\`acquisition_cost_cents\`, \`useful_life_months\`, \`depreciation_method\`, \`accumulated_depreciation_cents\`) — optionally linked to a sellable catalog row when directly billed to customers, nullable when it's internal-use-only equipment that's never sold. \`inventory\` is CONSUMED stock (materials/supplies) — what a catalog item's bill-of-materials draws down and what a vendor supplies. \`vendors\` today is just the vendor directory record store (name/contact/category) — the route's own comment notes supply-linking and auto-ordering are a later feature, not yet built.
- \`finance/summary\` deliberately uses the exact same "what's booked" status set (\`pending, scheduled, confirmed, completed, in_progress\`) that the dashboard homepage uses, specifically so Finance's "Contracted YTD" and the homepage's "Jobs · YTD" never disagree — and paginates past Supabase's 1000-row default cap for a busy tenant's full year.
- \`invoices\` are a separate flow from \`quotes\` — invoices can be updated only pre-send and are voided (not deleted) afterward; both have their own public-token accept/checkout flow for the client-facing side.

### Team, HR & Team Portal (52 routes)

| Group | Routes |
|---|---|
| \`cleaner-applications\` | 1 route: \`/api/cleaner-applications\` (?) |
| \`cleaners\` | 5 routes: \`/api/cleaners\` (GET,POST), \`/api/cleaners/[id]\` (PUT,DELETE), \`/api/cleaners/[id]/role\` (POST), \`/api/cleaners/priority\` (PUT), \`/api/cleaners/upload\` (POST) |
| \`crews\` | 1 route: \`/api/crews\` (GET,POST,PATCH,DELETE) |
| \`management-applications\` | 4 routes: \`/api/management-applications\` (GET,POST,PUT), \`/api/management-applications/draft\` (GET,POST,DELETE), \`/api/management-applications/signed-url\` (POST), \`/api/management-applications/upload\` (POST) |
| \`permissions\` | 1 route: \`/api/permissions/me\` (GET) |
| \`team\` | 2 routes: \`/api/team\` (GET,POST), \`/api/team/[id]\` (GET,PUT,DELETE) |
| \`team-applications\` | 3 routes: \`/api/team-applications\` (GET,POST,PUT,DELETE), \`/api/team-applications/bulk-approve\` (POST), \`/api/team-applications/upload\` (POST) |
| \`team-members\` | 3 routes: \`/api/team-members/[id]/stripe-invite\` (POST), \`/api/team-members/[id]/stripe-onboard\` (POST,GET), \`/api/team-members/[id]/stripe-status\` (POST,GET) |
| \`team-portal\` | 31 routes: \`/api/team-portal/30min-alert\` (POST), \`/api/team-portal/announcements\` (GET), \`/api/team-portal/auth\` (POST), \`/api/team-portal/availability\` (GET,PUT), \`/api/team-portal/checkin\` (POST), \`/api/team-portal/checklist\` (GET,PATCH), \`/api/team-portal/checkout\` (POST), \`/api/team-portal/config\` (GET), \`/api/team-portal/connect\` (GET,POST), \`/api/team-portal/connect/channels\` (GET), \`/api/team-portal/connect/unread\` (GET), \`/api/team-portal/connect/upload\` (POST), \`/api/team-portal/crew/earnings\` (GET), \`/api/team-portal/crew/members\` (GET), \`/api/team-portal/crew/schedule\` (GET), \`/api/team-portal/earnings\` (GET), \`/api/team-portal/jobs\` (GET), \`/api/team-portal/jobs/claim\` (POST), \`/api/team-portal/jobs/reassign\` (POST), \`/api/team-portal/jobs/release\` (POST), \`/api/team-portal/media-note\` (GET,POST), \`/api/team-portal/media-note/[id]/process\` (POST), \`/api/team-portal/messages\` (GET,POST), \`/api/team-portal/notifications\` (GET,PUT), \`/api/team-portal/photos\` (POST), \`/api/team-portal/preferences\` (GET,PUT), \`/api/team-portal/rating\` (GET), \`/api/team-portal/running-late\` (POST), \`/api/team-portal/travel-times\` (GET), \`/api/team-portal/update-phone\` (GET,POST), \`/api/team-portal/video-upload\` (GET,POST) |
| \`user\` | 1 route: \`/api/user/preferences\` (GET,PUT) |

**Notable route behavior:**
- **\`cleaners\` and \`cleaner-applications\` are NOT a parallel system — they're legacy nycmaid-naming compatibility shims.** \`cleaners\` reads/writes the exact same \`team_members\` table as \`/api/team\`. \`cleaner-applications\` literally re-exports \`team-applications\`'s own GET/POST/PUT/DELETE handlers under the old path so a copied \`/site/apply\` frontend keeps working unmodified. For new work, use \`team\`/\`team-applications\` directly — \`cleaners\`/\`cleaner-applications\` exist only so old code and old frontends don't break.
- **Team members can be direct Stripe Connect payees**, same pattern as sales partners and referrers: \`team-members/[id]/stripe-onboard\` creates an Express account and hosted onboarding link, \`stripe-invite\` sends the onboarding link via SMS (falling back to email), and \`stripe-status\` refreshes real account state after the team member returns from onboarding. Every tenant's Connect accounts are created under THAT tenant's own Stripe account (\`tenants.stripe_api_key\`) — never a shared platform fallback, so one tenant's payouts can never route through another's Stripe.
- \`crews\` — a crew is a named, reusable group of team members assignable to a job so a whole team schedules at once. The \`crew_members\` join table has no \`tenant_id\` column (it's keyed by crew_id + team_member_id only), so it deliberately stays on \`supabaseAdmin\` rather than the tenant-scoped \`tenantDb\` wrapper — worth knowing before assuming every table in this system can be tenant-scoped the same way.
- \`permissions/me\` (GET) — returns the caller's effective role permissions for CLIENT-SIDE nav hiding only. Real enforcement still happens server-side per route via \`requirePermission()\` — this endpoint is UX convenience, not a security boundary.
- \`user/preferences\` (GET/PUT) — per-user, per-PAGE preferences (view defaults, page size, default filters), explicitly distinct from tenant-wide settings (booking buffer, payment methods) which live elsewhere.
- \`team-applications\` rate limiting is in-memory (resets on cold start) — an accepted tradeoff since it's a spam-defense layer, not a real security boundary; don't rely on it holding across serverless instances.

### Client Portal (18 routes)

| Group | Routes |
|---|---|
| \`portal\` | 18 routes: \`/api/portal/auth\` (POST), \`/api/portal/availability\` (GET), \`/api/portal/bookings\` (GET,POST), \`/api/portal/bookings/[id]\` (GET,PUT), \`/api/portal/collect\` (POST), \`/api/portal/config\` (GET), \`/api/portal/connect\` (GET,POST), \`/api/portal/connect/unread\` (GET), \`/api/portal/contacts\` (GET,POST), \`/api/portal/contacts/[contactId]\` (PUT,DELETE), \`/api/portal/contacts/verify\` (POST), \`/api/portal/feedback\` (POST), \`/api/portal/messages\` (GET,POST), \`/api/portal/notes\` (GET,PUT), \`/api/portal/photos\` (POST), \`/api/portal/properties\` (GET,POST,PATCH), \`/api/portal/request\` (POST), \`/api/portal/services\` (GET) |

**Notable route behavior:**
- **\`portal/config\` (GET) exposes the tenant's "funnel mode," which changes what the whole portal does:** \`booking\` mode = self-serve hourly/flat scheduling (a client picks a time and books it themselves — most tenants). \`pipeline\`/\`lead_only\` mode = the client can only "request a quote/appointment" (\`portal/request\`), which drops into the SAME sales \`deals\` pipeline the operator's own CRM uses instead of creating a scheduled booking outright. This is the same \`funnel_mode\` Selena and the core sale process key off of — it's a single tenant-level switch, not two separate portal codebases.
- **Contact verification is intentionally two-tier:** adding a new phone/email via \`portal/contacts\` inserts it UNVERIFIED (\`receives_sms\`/\`receives_email\` forced false, no consent timestamp) — it only starts receiving comms after the client completes OTP verification at \`portal/contacts/verify\`. This exists specifically because a client, unlike an operator, could otherwise add someone else's number and opt it into comms without that person's consent. Addresses (\`portal/properties\`) don't need this — they're not a comms channel, so there's no impersonation risk.
- \`portal/collect\` (POST, public) — the "finish your booking" abandoned-funnel capture: rate-limited by IP, matches-or-creates a client by phone, writes a \`portal_leads\` row for funnel analytics, notifies admins across email+SMS+in-app, and if a Selena conversation ID is attached, links it to the client and sends a recap SMS.
- \`portal/photos\` (POST) — client-submitted job photos land in the SAME \`job_photos\` gallery the crew uses (flagged \`source='client'\`), not a separate client-only gallery, and pushes a notification to admins so a client photo doesn't sit unseen.
- \`portal/auth\` — brute-force throttling is keyed by TENANT and by IP, deliberately never by the PIN/code being guessed itself — keying by the guessed value would give every distinct guess attempt its own fresh rate-limit bucket, defeating the throttle.

### Communications — Connect / SMS / Email (12 routes)

| Group | Routes |
|---|---|
| \`chat\` | 1 route: \`/api/chat\` (POST) |
| \`connect\` | 4 routes: \`/api/connect/channels\` (GET,POST), \`/api/connect/messages\` (GET,POST), \`/api/connect/messages/upload\` (POST), \`/api/connect/unread\` (GET) |
| \`email\` | 1 route: \`/api/email/monitor\` (POST,GET) |
| \`migrate-cleaner-notifications\` | 1 route: \`/api/migrate-cleaner-notifications\` (POST) |
| \`migrate-sms\` | 1 route: \`/api/migrate-sms\` (POST) |
| \`send-booking-emails\` | 1 route: \`/api/send-booking-emails\` (POST) |
| \`sms\` | 2 routes: \`/api/sms\` (GET,POST), \`/api/sms/send\` (POST) |
| \`unsubscribe\` | 1 route: \`/api/unsubscribe\` (GET,POST) |

### Notifications & Push (3 routes)

| Group | Routes |
|---|---|
| \`announcements\` | 1 route: \`/api/announcements/unread\` (GET,POST) |
| \`notifications\` | 1 route: \`/api/notifications\` (POST,GET) |
| \`push\` | 1 route: \`/api/push/subscribe\` (POST,DELETE) |

### AI — Selena / Voice / Yinez (6 routes)

| Group | Routes |
|---|---|
| \`ai\` | 2 routes: \`/api/ai/assistant\` (POST), \`/api/ai/chat\` (POST) |
| \`selena\` | 2 routes: \`/api/selena\` (GET,POST), \`/api/selena/metrics\` (GET) |
| \`voice\` | 1 route: \`/api/voice/mcp/[secret]/[transport]\` (POST,GET) |
| \`yinez\` | 1 route: \`/api/yinez\` (POST) |

**Notable route behavior:**
- **The "Selena" vs "Yinez" naming split is ONE underlying agent function, not two implementations.** \`/api/chat\` (the public web-chat widget on a tenant's own site) imports the exact same core function from \`lib/selena/agent\` twice — once as \`askSelena\`, once aliased as \`askYinez\` — and the admin's own internal ComHub AI chat (\`/api/admin/comhub/yinez/send\`, branded "Yinez (admin)") calls that identical function too. Whether a conversation is branded Selena or Yinez in the UI is a labeling choice per surface, not a fork in the underlying logic — see the Voice AI section for the same pattern on the voice side.
- **\`ai/chat\` vs \`ai/assistant\` are two different tiers of the dashboard's own AI bar** (the "Ask anything — bookings, clients, schedule, revenue…" sticky bar every dashboard page has): \`ai/chat\`'s system prompt literally opens "You are Selena, an AI assistant for {tenant}…" — a read-oriented Q&A layer. \`ai/assistant\` is the tool-USING version: its tools (\`update_bookings\`, \`cancel_bookings\`, etc.) are explicitly gated behind the SAME permission the equivalent REST endpoint requires (\`bookings.edit\`, \`clients.edit\`, \`finance.view\`) — the route's own comment is blunt about why: without that gate, a \`staff\`-role user chatting with the assistant could get it to perform actions the REST API would 403 them for directly. Never assume the chat surface is a permission-free side door.
- \`push/subscribe\` — identity (tenant_id/team_member_id/client_id) is always derived from a verified session/token server-side, never trusted from the request body; the caller only picks which ROLE it's subscribing as, and subscribing as \`admin\` requires an authenticated dashboard admin session, not just a resolved tenant from the host header.
- \`migrate-cleaner-notifications\` and \`migrate-sms\` — one-off data-migration endpoints, not part of normal runtime traffic. Treat as historical/maintenance tooling, not features to build against.
- \`sms\` (GET) — one endpoint serves two shapes depending on the query string: \`?conversation_id=X\` returns messages for that thread, omitted returns the conversation list — not two separate concerns split across routes.

### Marketing — Reviews / Social / Google / Campaigns (21 routes)

| Group | Routes |
|---|---|
| \`campaigns\` | 4 routes: \`/api/campaigns\` (GET,POST), \`/api/campaigns/[id]\` (GET,PUT,DELETE), \`/api/campaigns/[id]/send\` (POST), \`/api/campaigns/send\` (POST,PUT) |
| \`google\` | 5 routes: \`/api/google/auth\` (GET), \`/api/google/callback\` (GET), \`/api/google/posts\` (GET,POST), \`/api/google/reviews\` (GET,POST,PUT), \`/api/google/status\` (GET) |
| \`reviews\` | 5 routes: \`/api/reviews\` (GET,POST), \`/api/reviews/[id]\` (PUT), \`/api/reviews/request\` (POST), \`/api/reviews/submit\` (POST), \`/api/reviews/upload\` (POST) |
| \`social\` | 7 routes: \`/api/social/accounts\` (GET,DELETE), \`/api/social/connect/facebook\` (GET), \`/api/social/connect/facebook/callback\` (GET), \`/api/social/connect/instagram\` (GET), \`/api/social/connect/instagram/callback\` (GET), \`/api/social/post\` (POST), \`/api/social/posts\` (GET) |

**Notable route behavior:**
- \`google/callback\` is ONE shared OAuth callback for BOTH admin-level and dashboard-level Google connections — not two separate callback implementations. It verifies a signed OAuth \`state\` param specifically to prevent CSRF (CWE-352): only this app's own \`/google/auth\` init can mint a valid state binding a Google account to a tenant, so a forged or expired state is rejected outright.
- \`social/post\` (POST) — caps post text at 5,000 chars and URLs at 2,000 chars BEFORE forwarding to Meta's Graph API, because \`social_posts.content\` itself has no DB-side length limit — the cap exists specifically to protect the outbound Graph API call, not the database.
- \`social/accounts\` — the stored \`access_token\` is a live Facebook/Instagram Graph API credential; treat any route touching this table as secret-handling code, not a plain settings record.
- \`reviews\` vs \`google/reviews\` — \`reviews\` (GET/POST/PUT) is the tenant's own manual+aggregated review table (joined with \`clients\` so a review can be tied back to a real customer); \`google/reviews\` is specifically the Google Business Profile sync/reply surface. \`reviews/request\` triggers the review-request SMS/email flow described in Communications; \`reviews/submit\` is the public client-facing submission endpoint.

### SEO (1 routes)

| Group | Routes |
|---|---|
| \`seo\` | 1 route: \`/api/seo/verify-file/[file]\` (GET) |

**Notable route behavior:** this serves Google Search Console FILE-method verification tokens for a tenant's domain — a \`next.config\` rewrite maps the Google-generated \`google[hash].html\` filename pattern to this route so each tenant's search-console ownership check resolves without a real static file per tenant.

### Security, Auth & Compliance (6 routes)

| Group | Routes |
|---|---|
| \`audit\` | 1 route: \`/api/audit\` (GET) |
| \`auth\` | 3 routes: \`/api/auth/login\` (POST), \`/api/auth/logout\` (POST), \`/api/auth/me\` (GET) |
| \`pin-reset\` | 1 route: \`/api/pin-reset\` (POST) |
| \`security\` | 1 route: \`/api/security/events\` (GET) |

**Notable route behavior:**
- **Correction — a prior draft of this doc called \`/api/auth/*\` dead code. That was wrong, and the mistake is worth keeping visible: it is NOT dead.** \`auth/login\` authenticates against \`admin_users\` via legacy \`lib/nycmaid/auth\` (\`hashPassword\`/\`createSessionCookie\`), and is actively called by \`src/components/auth/SiteAdminLoginClient.tsx\`, which is wired into the login pages of the three known legacy per-tenant clones (\`nyc-mobile-salon\`, \`the-florida-maid\`, \`wash-and-fold-nyc\` — see the Global Rule "known debt" list). Those tenants' admin logins genuinely depend on this route working. It does NOT overlap with the global paths: **correction (2026-07-28) — the "dashboard users authenticate via Clerk" claim that used to be here was stale/wrong.** Clerk has been fully removed platform-wide (no \`@clerk/nextjs\` dependency, mounted nowhere — see \`src/app/layout.tsx\`). The global \`/dashboard\` is reached via admin-PIN impersonation or a tenant member's own PIN at \`<their-domain>/fullloop\`; the main \`/admin/*\` authenticates via \`admin-auth\`/admin PIN. This \`auth/login\` route is a third, separate, clone-only path, unrelated to either.
  **Resolved 2026-07-31 (readiness sec-10 live re-check, real Supabase check as this doc itself asked for — not a source read):** ran \`supabase gen types typescript --linked\` against prod (direct Postgres introspection, CLI already linked to \`cetnrttgtoajzjacfbhe\`) and independently hit PostgREST directly (\`GET .../rest/v1/admin_users\`) — both agree \`public.admin_users\` does not exist. The \`client-analytics/route.ts\` comment was right; this doc's "genuinely depend on this route working" claim above was stale. It's stale for a second, separate reason too: as of the same 2026-07-28 pass this doc's own "known debt" section describes, all three clone tenants' login pages (\`nyc-mobile-salon\`, \`the-florida-maid\`, \`wash-and-fold-nyc\`) were repointed to \`redirect('/fullloop')\` — none of them render \`SiteAdminLoginClient\` anymore (confirmed via \`grep -rl SiteAdminLoginClient src/\`: the component file still exists but is imported nowhere outside tests). So \`auth/login\` has no live caller at all now, on top of querying a table that no longer exists — it's genuinely orphaned, silently-broken-if-called dead code (the missing-table error from \`admin_users\` isn't checked/thrown, so a POST here always just falls through to the \`ADMIN_PASSWORD\` env-var PIN check or a clean 401, never a 500 — worth knowing if debugging this route, since the silent swallow hides the real cause). Not deleted here — flagging for whoever owns cleanup of orphaned auth code, same as the \`SiteAdminLoginClient.tsx\` file itself.
- \`auth/login\`'s rate limiting was upgraded from an in-memory Map (reset every cold start, effectively no real limit under concurrent serverless instances) to persistent DB-backed, fail-closed rate limiting — worth remembering as the pattern to prefer anywhere a new auth-adjacent endpoint needs throttling, rather than repeating the in-memory mistake (see \`team-applications\`' in-memory limiter, which is fine only because it's spam-defense, not auth).
- \`pin-reset\` — a distinct recovery path from the various PIN-based logins (team portal, client portal); confirm which PIN system a given \`pin-reset\` call is actually resetting before assuming it's global.


### Tenants & Settings (17 routes)

| Group | Routes |
|---|---|
| \`settings\` | 10 routes: \`/api/settings\` (GET,PUT), \`/api/settings/notifications\` (GET,PUT), \`/api/settings/page-config\` (GET,PUT), \`/api/settings/permissions\` (GET,PUT), \`/api/settings/portal-permissions\` (GET,PUT), \`/api/settings/request-automation\` (POST), \`/api/settings/services\` (GET,POST), \`/api/settings/services/[id]\` (PUT,DELETE), \`/api/settings/team\` (GET,PUT), \`/api/settings/team-announcements\` (GET,POST) |
| \`setup-checklist\` | 1 route: \`/api/setup-checklist\` (GET,POST) |
| \`sidebar-counts\` | 1 route: \`/api/sidebar-counts\` (GET) |
| \`tenant\` | 1 route: \`/api/tenant/public\` (GET) |
| \`tenant-sitemap\` | 1 route: \`/api/tenant-sitemap\` (GET) |
| \`tenants\` | 2 routes: \`/api/tenants\` (POST), \`/api/tenants/public\` (GET) |
| \`territories\` | 1 route: \`/api/territories/options\` (GET) |

**Notable route behavior:**
- **\`settings/team-announcements\` replaced the old \`tenants.guidelines_en/es\` single-blob field — and the old field was actually broken in production before being replaced**, per its own source comment: the team-facing read pointed at a nonexistent \`tenants.settings\` column, and the admin's Broadcast button called a route that didn't exist, so an admin's saved guidelines never actually reached a cleaner. The replacement is a running feed (admin keeps posting entries, cleaners see the full history) rather than one overwritable text box. If any doc, page, or memory still describes tenant Settings as having a "Guidelines (EN/ES)" text field, that's describing the broken predecessor — the current mechanism is Announcements.
- **Tenants cannot self-author new automated triggers.** \`settings/request-automation\` (POST) exists specifically because a new automation type needs actual code to fire its event — a tenant requests one here, it emails the platform team (\`ADMIN_NOTIFICATION_EMAIL\`), and the platform team adds it to a shared global registry (\`lib/comms-registry.ts\`) that then applies to every tenant. Automation is centrally curated, not tenant-authored.
- \`settings/permissions\` vs \`settings/portal-permissions\` — two separate permission systems: one for dashboard/team-portal ROLES (staff/lead/manager, etc. — see \`PERMISSION_CATALOG\`/\`CUSTOMIZABLE_ROLES\`), the other specifically for CLIENT PORTAL roles (\`PORTAL_PERMISSION_CATALOG\`/\`PORTAL_ROLES\`). Don't assume one system governs both surfaces.
- \`settings/page-config\` — backs the per-page settings drawer (the gear icon on every dashboard page) — its \`VALID_PAGES\` allowlist is the authoritative list of which pages actually have a settings drawer; a page missing from that list gets no drawer regardless of what the sidebar implies.
- \`territories/options\` (GET) — lookup data for the exclusive trade × zip territory system (see the Prospects intake note under Sales / CRM / Catalog) — this is the tenant-facing read side; the admin map/assignment UI lives under \`/admin/territories\`.
- \`tenants\` (POST) — creating a new tenant record requires a resolved OWNER user id (\`getOwnerUserId()\`), not just admin auth — a tenant can't be created floating without an owner attached from the start. **This is the self-serve creation path, and \`getOwnerUserId()\` has no live way to resolve for a genuine self-serve signup (see lib/owner-session.ts) — so in practice this endpoint is unreachable.** It is not how real tenants get created.
- **Real onboarding process (white-glove, updated 2026-08-01 — the actual live path, not this route):** a platform admin creates the tenant at \`/admin/businesses/new\`, which auto-mints and emails a signed, no-login onboarding link (\`/onboard/[token]\`, see \`lib/onboarding-link.ts\`) the tenant fills in themselves — same registry-driven form (\`PROFILE_FIELDS\` in \`lib/tenant-profile.ts\`) as the admin's own \`/admin/businesses/[id]/profile\`. (The old \`/admin/businesses/[id]/wizard\` hand-rolled page this note used to describe was removed 2026-08-01 — it predated the registry and had no unique functionality left except a live DNS/SSL/Resend/Telnyx/Stripe check, ported into the Onboarding tab.) Separately, \`POST /api/admin/businesses/[id]/provision\` and \`POST /api/admin/businesses/[id]/activate\` handle domain registration and the onboarding gate (idempotent, safe to re-run). Activation mints an owner PIN via \`POST /api/admin/businesses/[id]/users\`, returned ONCE to the admin, who hands it to the business owner out of band (call/email). The owner (and any team member created the same way) then logs in at their own tenant domain's \`/fullloop\` page with that PIN — a per-tenant token (\`verifyTenantAdminToken\`), not \`getOwnerUserId()\`/Clerk/admin impersonation. \`/sign-in\` and \`/sign-up\` on the shared marketing domain are intentionally NOT that login — see their own file comments.

### Jobs & Projects (29 routes)

| Group | Routes |
|---|---|
| \`documents\` | 12 routes: \`/api/documents\` (GET,POST), \`/api/documents/[id]\` (GET,PATCH,DELETE), \`/api/documents/[id]/duplicate\` (POST), \`/api/documents/[id]/fields\` (GET,POST,PUT), \`/api/documents/[id]/send\` (POST), \`/api/documents/[id]/signers\` (GET,POST), \`/api/documents/[id]/signers/[signerId]\` (PATCH,DELETE), \`/api/documents/[id]/void\` (POST), \`/api/documents/public/[token]\` (GET), \`/api/documents/public/[token]/consent\` (POST), \`/api/documents/public/[token]/decline\` (POST), \`/api/documents/public/[token]/sign\` (POST) |
| \`jobs\` | 16 routes: \`/api/jobs\` (GET), \`/api/jobs/[id]\` (GET,PATCH), \`/api/jobs/[id]/budget-variance\` (GET), \`/api/jobs/[id]/checklist\` (GET,POST), \`/api/jobs/[id]/checklist/[itemId]\` (PATCH,DELETE), \`/api/jobs/[id]/expenses\` (GET,POST), \`/api/jobs/[id]/expenses/[expenseId]\` (DELETE), \`/api/jobs/[id]/payments\` (PATCH), \`/api/jobs/[id]/photos\` (GET,POST), \`/api/jobs/[id]/photos/[photoId]\` (PATCH), \`/api/jobs/[id]/photos/[photoId]/comments\` (GET,POST), \`/api/jobs/[id]/report\` (POST), \`/api/jobs/[id]/sessions\` (POST), \`/api/jobs/[id]/sessions/[sessionId]\` (PATCH,DELETE), \`/api/jobs/[id]/share\` (POST), \`/api/jobs/public/[token]\` (GET) |
| \`projects\` | 1 route: \`/api/projects\` (GET,POST) |

**Notable route behavior — \`documents\` is a real e-signature system, not just file storage:**
- Upload a PDF (\`documents\` POST, multipart) → place signature/field placeholders (\`fields\`) → add signers (\`signers\`, draft-only — a document must be in an editable status to change signers) → \`send\` (this computes a SHA-256 hash of the document and LOCKS its status — no further edits after send) → signers get a public token URL (\`documents/public/[token]\`) to consent, sign, or decline without any dashboard login. \`void\` cancels an in-flight document; \`duplicate\` clones one to start a new signing round.
- \`documents/[id]/send\` — signer notification goes out via SMS (falling back to email), same channel-fallback pattern as \`notify()\` elsewhere.
- **Projects = long jobs (weeks-to-a-year), not a separate entity from bookings.** Creating a project creates a project row PLUS a single span booking in the same transaction (setting \`project_id\` makes \`duration_class\` derive to \`'project'\`), so it shows up in the Projects view immediately without a second data model to keep in sync.
- \`jobs/[id]/sessions\` — a job/project can have many sessions (its multi-day work schedule); each session POST creates a real booking carrying the \`job_id\`. \`booking_assignees\` (like \`crew_members\` and \`booking_team_members\` elsewhere) has no \`tenant_id\` column and deliberately stays on \`supabaseAdmin\` rather than the tenant-scoped wrapper.
- \`jobs/[id]/budget-variance\` (GET) — budget-vs-actuals for a single job, sourced through its quote's \`quote_budgets\` row. Explicitly designed as the ONE shared contract for this data: the job detail page is meant to call this endpoint rather than querying \`quote_budgets\` directly, to avoid duplicating the variance math in two places. A job's \`budget\` is null until a saved Budget Template has actually been applied to its quote — there's no catalog-derived auto-suggestion.
- \`jobs/[id]/share\` (POST) — idempotently generates a public share token for a job's photo timeline (returns \`{ token, path }\`, caller prefixes the host) — this is the mechanism behind sharing before/after photos with someone outside the dashboard (e.g. a client's insurance company) without giving portal access.
- \`jobs\` (GET, top-level) — read-only money rollup across every job for the tenant: per-job contracted/paid/due/overdue plus a tenant-wide total in one response, not just a list.

### Uploads & Media (3 routes)

| Group | Routes |
|---|---|
| \`public-upload\` | 1 route: \`/api/public-upload\` (POST) |
| \`upload\` | 1 route: \`/api/upload/signed-url\` (POST) |
| \`uploads\` | 1 route: \`/api/uploads\` (POST) |

**Notable route behavior:** \`uploads\` caps at 5MB and only accepts JPEG/PNG/WebP/PDF. \`public-upload\` is specifically for PUBLIC marketing-site forms (e.g. a photo attached to a roadside-assistance booking form) — tenant is resolved from the signed \`x-tenant-id\` middleware header, NOT admin auth, since the submitter is an anonymous site visitor.

### Misc / Internal / Test (35 routes)

| Group | Routes |
|---|---|
| \`apply\` | 2 routes: \`/api/apply\` (POST), \`/api/apply/signed-url\` (POST) |
| \`apply-ceo\` | 1 route: \`/api/apply-ceo\` (POST) |
| \`changelog\` | 2 routes: \`/api/changelog\` (GET), \`/api/changelog/[id]\` (GET) |
| \`contact\` | 1 route: \`/api/contact\` (POST) |
| \`cpa\` | 1 route: \`/api/cpa/[token]/year-end-zip\` (GET) |
| \`dashboard\` | 15 routes: \`/api/dashboard\` (GET), \`/api/dashboard/comms-preview\` (GET), \`/api/dashboard/hr\` (GET), \`/api/dashboard/hr/[id]\` (GET,PATCH), \`/api/dashboard/hr/[id]/documents\` (POST,PATCH), \`/api/dashboard/hr/[id]/notes\` (POST), \`/api/dashboard/import/analyze\` (POST), \`/api/dashboard/import/batch/[id]\` (GET,POST), \`/api/dashboard/import/stage\` (POST), \`/api/dashboard/messages\` (GET,POST), \`/api/dashboard/onboarding\` (GET,PATCH), \`/api/dashboard/onboarding/activate\` (POST), \`/api/dashboard/onboarding/progress\` (GET), \`/api/dashboard/schedules/import\` (POST), \`/api/dashboard/team-messages\` (GET) |
| \`docs\` | 1 route: \`/api/docs\` (GET) |
| \`errors\` | 1 route: \`/api/errors\` (POST) |
| \`health\` | 1 route: \`/api/health\` (GET) |
| \`indexnow\` | 1 route: \`/api/indexnow\` (GET,POST) |
| \`ingest\` | 2 routes: \`/api/ingest/application\` (POST), \`/api/ingest/lead\` (POST) |
| \`internal\` | 1 route: \`/api/internal/deploy-hook\` (POST) |
| \`requests\` | 1 route: \`/api/requests\` (GET,POST) |
| \`test\` | 2 routes: \`/api/test/email-selena\` (POST), \`/api/test/email-selena/cleanup\` (POST) |
| \`test-emails\` | 1 route: \`/api/test-emails\` (POST) |
| \`track\` | 1 route: \`/api/track\` (POST,PATCH,GET) |

**Notable route behavior:**
- **\`/api/docs\` is itself a STALE, apparently-abandoned prior attempt at this exact "master doc" idea — do not treat it as authoritative.** It returns a static JSON blob (dated \`2026-04-20\` in its own payload) describing the platform: a stack summary, only 8 of the platform's actual 51 cron jobs, and an env-var list that doesn't match this doc's verified Environment Variables section (e.g. it lists \`ADMIN_TOKEN_SECRET\`/\`INTERNAL_API_KEY\`/\`PORTAL_SECRET\`/\`TEAM_PORTAL_SECRET\`, none of which matched what this audit found in actual use). Grepping every \`.tsx\` file in the app for a caller of \`/api/docs\` found none — it's orphaned, superseded by the page you're reading now.
- \`internal/deploy-hook\` (POST) — real production infrastructure: fires on EVERY production deployment (however triggered, including a raw \`vercel --prod\` outside CI), and re-points the \`*.fullloopcrm.com\` wildcard plus every individual \`<slug>.fullloopcrm.com\` tenant alias at the new deployment. Exists specifically so a manual deploy can never silently orphan a tenant's domain (\`DEPLOYMENT_NOT_FOUND\`). \`scripts/post-deploy-alias.sh\` is the manual equivalent if this hook itself is ever unavailable.
- **\`ingest/application\` and \`ingest/lead\` reveal that several tenants run their OWN standalone Next.js apps outside this monorepo** (we-pay-you-junk; nyc-tow and its sister sites — nycroadsideemergencyassistance, theroadsidehelper, toll-trucks-near-me) that historically wrote applications/leads only to their own separate database. These two routes are the shared public sink that funnels those external apps' submissions into this platform's real \`team_applications\`/\`clients\`+\`portal_leads\` tables, scoped by \`tenant_slug\` — a real cross-repo integration point, not something obvious from this codebase alone.
- \`indexnow\` — per-tenant instant-indexing bridge to Bing/Yahoo/DuckDuckGo/Yandex, keyed by a key stored in \`selena_config.indexnow_key\`; POST accepts either the platform's \`CRON_SECRET\` or tenant-scoped admin auth.
- \`cpa/[token]/year-end-zip\` — the actual token-gated download endpoint behind \`finance/cpa-tokens\` (see Finance & Billing) — this is how an outside accountant retrieves the year-end package without a dashboard login.
- \`dashboard\` (15 routes) — despite landing in this catch-all bucket, these are real TENANT dashboard-side APIs: HR document/notes management (\`dashboard/hr/[id]/documents\`, \`/notes\`), the go-live task checklist (\`dashboard/onboarding\`, \`/activate\`, \`/progress\` — profile DATA entry is \`/api/tenant-profile\`, shared with the public onboarding link, not this bucket), and CSV import staging (\`dashboard/import/analyze\`, \`/stage\`, \`schedules/import\`) — not admin or internal tooling despite the bucket name.
- \`apply\`/\`apply-ceo\` — FullLoop's OWN careers/hiring intake forms (applying to work AT FullLoop), unrelated to a tenant's \`team-applications\` (applying to work for a tenant business).
- **\`/api/requests\` (top-level, public) is a tenant's OWN \`partner_requests\` intake — do not confuse with \`admin/requests\`**, which is FullLoop's internal lead-to-tenant sales pipeline (proposal/agreement/checkout) covered under Platform Admin. Same word, two unrelated systems at two different scopes.
- \`contact\` (public, tenant resolved from host) — one endpoint serves THREE different form shapes depending on payload, built specifically so several standalone per-tenant clone sites (e.g. thenycexterminator) could point their existing contact forms here unmodified: a service-quote form (pest/property/urgency/location fields, no explicit \`formType\`), a general inquiry (\`formType: "general-inquiry"\`), and a job application (\`formType: "job-application"\`).
- \`errors\` (POST, client-side error logging) — filters out a known-harmless allowlist (\`Script error\`, \`ChunkLoadError\`, \`Loading chunk\`, etc.) before it reaches admin alerting, specifically to avoid alert fatigue from transient browser noise that isn't a real bug.
- \`cpa/[token]/year-end-zip\` — read-only, token-scoped, genuinely no session/cookie required; the token alone is the full auth for this one route (see \`finance/cpa-tokens\` for how the token is issued).
- \`changelog\`/\`changelog/[id]\` (tenant-facing) — backs the "what's coming" banner and its detail page; distinct from \`admin/changelog\`, which reads the same underlying \`platform_announcements\` table but for the admin-side feed (see the Platform Admin notes).`,
  },
  {
    id: 'selena-ai',
    title: 'Selena AI System',
    content: `Selena is the AI booking concierge powered by Anthropic Claude. She handles SMS and web chat conversations to book appointments end-to-end.

**State Machine Architecture:**
The booking flow is driven by a state machine in \`src/lib/selena.ts\`. States:
- \`greeting\` — Initial state, Selena introduces herself
- \`collecting\` — Gathering booking details one question at a time
- \`recap\` — All info collected, presenting summary for confirmation
- \`confirmed\` — Booking created, asking for rating
- \`rating\` — Client gave a rating, closing
- \`closed\` — Conversation complete

**Booking Checklist:**
The \`BookingChecklist\` JSONB object tracks all collected info:
- \`service_type\` — What service they need
- \`bedrooms\` / \`bathrooms\` — Size details
- \`rate\` — Selected hourly rate
- \`day\` / \`date\` / \`time\` — Scheduling
- \`name\` / \`phone\` / \`address\` / \`email\` — Client contact info
- \`notes\` — Special requests
- \`rating\` — Post-booking chat rating (1-5)
- \`channel\` — \`sms\` or \`web\`
- \`status\` — Current state machine state

**Collection Order:**
\`getNextStep()\` determines what to ask next in strict order:
1. service_type -> 2. bedrooms/bathrooms -> 3. rate -> 4. day -> 5. time -> 6. name -> 7. phone -> 8. address -> 9. email -> 10. notes -> recap

**Tool Definitions:**
Selena uses Claude tool_use to take actions:
- \`save_info\` — Save one or more checklist fields (partial update)
- \`create_client\` — Create a client record in the database
- \`check_availability\` — Check if a time slot is available
- \`create_booking\` — Create the booking and client, transition to confirmed
- \`add_to_waitlist\` — Add client to waitlist if preferred time unavailable

**System Prompt Structure:**
- Dynamic per-tenant: uses business name, active services, rates, hours, and payment methods from \`getSettings()\`
- Personality: warm, welcoming, one question per message, match client energy
- Includes the checklist prompt showing collected vs missing fields
- \`NEXT:\` instruction tells Selena exactly what to ask next

**Key Behaviors:**
- **Empty response fallback:** If Claude returns empty text, Selena generates a contextual fallback based on the next step
- **Recap loop fix:** After recap, if client says "yes", Selena calls \`create_booking\` immediately without re-recapping
- **Conversation reset:** If a conversation has been idle for 24+ hours, the checklist resets to \`greeting\`
- **Web chat returning client:** On web, if phone matches an existing client, Selena greets them by name and pre-fills known info
- **Quick replies:** Context-aware suggested responses shown as buttons (days, times, service types, etc.)

**Error Monitoring:**
- All Selena errors are logged via \`selenaError()\` which creates a notification of type \`selena_error\`
- Includes tenant ID, error context, stack trace snippet, and conversation ID
- Errors are visible in \`/admin/errors\``,
  },
  {
    id: 'database',
    title: 'Database',
    content: `All data lives in Supabase (PostgreSQL). Every table includes \`tenant_id\` for multi-tenant isolation. There is no single generated schema-types file in this repo — this section plus the migration index below is the closest thing to one; when in doubt, grep \`src/lib/migrations/\` for the table name.

**Core Tables:**

| Table | Purpose |
|-------|---------|
| \`tenants\` | Business accounts — name, domain, plan, status, settings, Telnyx/Resend/Stripe/xAI/Deepgram keys, voice DID |
| \`bookings\` | Appointments — client, team member, service, times, status, video URLs, pay, source, discount/credit |
| \`clients\` | Customer records — name, phone, email, address, lifecycle stage, tags |
| \`team_members\` | Staff — name, phone, email, PIN, pay_rate, role, availability, max_travel_minutes |
| \`sms_conversations\` | SMS threads — phone, messages array, booking_checklist JSONB, status |
| \`notifications\` | In-app notifications — type, title, message, channel, read status |
| \`campaigns\` | Marketing campaigns — name, type (email/sms), content, recipients, status |
| \`referrals\` / \`referrers\` / \`referral_commissions\` | Referral program — referrer identity, Stripe Connect eligibility, per-booking commission |
| \`reviews\` | Google/manual reviews — rating, text, source, reply, auto_replied |
| \`expenses\` | Business expenses — amount, category, date, notes, vendor FK |
| \`services\` / \`service_types\` | Service type definitions — name, duration, rate, active, budget defaults |
| \`schedules\` | Recurring booking schedules — client, day, time, frequency, paused |
| \`leads\` / \`prospects\` | Lead tracking — source, status, contact info, attribution, qualification |
| \`audit_logs\` | Action audit trail — who, what, when, details |
| \`security_events\` | Auth events — login attempts, suspicious activity |
| \`error_logs\` | Runtime errors — message, stack, context |
| \`push_subscriptions\` | Web push endpoints — subscription JSON, user |
| \`google_tokens\` | Google OAuth tokens — access, refresh, expiry per tenant |

**Sales / CRM / Finance v2 Tables (added since the original doc, verified against migration filenames):**

| Table | Purpose |
|-------|---------|
| \`quotes\` / \`quote_templates\` / \`quote_budgets\` | Sales proposals — line items, deposit terms, recurring-quote support |
| \`deals\` / \`pipeline\` | Sales pipeline stage tracking (Lead → Qualify → Quote → Sold → Schedule) |
| \`budget_templates\` / \`budget_line_items\` | Reusable estimate templates — labor/supplies split, catalog-linked pricing, qty, margin |
| \`catalog\` / \`categories\` / \`preset_categories\` / \`shared_categories\` | Master service/product catalog used when building quotes |
| \`equipment\` / \`vendors\` / \`inventory\` | Equipment tracking, vendor records, vendor-catalog costing for inventory |
| \`invoices\` / \`routes\` / \`documents\` / \`receipts\` / \`entities\` | Finance-hub support tables (invoicing, delivery routes, doc storage, receipts, legal entities) |
| \`chart_of_accounts\` / \`journal_entries\` | Double-entry ledger — atomic posting + uniqueness constraints on journal entries |
| \`sales_partners\` / \`sales_partner_commissions\` / \`sales_partner_agreement\` | Sales-partner program — Stripe Connect transfers, agreement acceptance, ineligibility flags |
| \`partner_requests\` | Partner conversion-claim tracking |

**HR, Team & Communications Tables:**

| Table | Purpose |
|-------|---------|
| \`team_announcements\` | Broadcast announcements to the team roster |
| \`hr\` employee fields | People-record layer (employment type, comp of record, documents/compliance) — see HR section |
| \`tenant_owner_messages\` | Admin ↔ tenant-owner platform messaging (see Platform Messaging section) |
| \`connect_channels\` / \`connect_channel_members\` / \`connect_message_attachments\` | Loop Connect unified messaging — channel types, mass/group membership, attachments |
| \`management_applications\` / \`sales_applications\` / \`cleaner_applications\` | Job/partner application intake, resume upload |

**Voice AI / Compliance:**

| Table | Purpose |
|-------|---------|
| \`prospects\` (voice_agent fields) | Voice-agent call context per prospect |
| \`tenant_xai_sip_creds\` / \`tenant_voice_did\` / \`voice_agent_mcp_secret\` | Per-tenant SIP + phone number + MCP auth for the Voice AI agent |
| GDPR deletion tables (\`2026_07_14_gdpr_deletion.sql\`) | Right-to-erasure support, purged by \`/api/cron/gdpr-purge\` |

**Key Columns on bookings:**
- \`walkthrough_video_url\` — Pre-service video URL (Supabase Storage)
- \`final_video_url\` — Post-service video URL
- \`walkthrough_video_url_uploaded_at\` / \`final_video_url_uploaded_at\` — Upload timestamps (used by cleanup cron)
- \`check_in_time\` / \`check_out_time\` — GPS-verified timestamps
- \`check_in_lat\` / \`check_in_lng\` / \`check_out_lat\` / \`check_out_lng\` — GPS coordinates
- \`actual_hours\` — Computed hours worked
- \`cleaner_pay\` — Calculated earnings for the team member
- \`hourly_rate\` — Client billing rate
- \`pay_rate\` — Team member pay rate
- \`status\` — pending, confirmed, in_progress, completed, cancelled, no_show

**booking_checklist JSONB Structure:**
Stored on \`sms_conversations.booking_checklist\`. Contains all Selena-collected booking data:
\`{ service_type, bedrooms, bathrooms, rate, day, date, time, name, phone, address, email, notes, rating, channel, status }\`

**Full migration index — 156 files in \`src/lib/migrations/\`, applied via Supabase SQL editor in filename order:**

Legacy numbered era (004–066, pre-dated-filename convention):

\`004_portal_auth_codes.sql\`, \`005_audit_logs.sql\`, \`006_error_resilience.sql\`, \`007_missing_tables.sql\`, \`008_cleaner_broadcasts.sql\`, \`008_missing_tables_and_columns.sql\`, \`009_closeout_fields.sql\`, \`009_nycmaid_parity_columns.sql\`, \`010_nycmaid_parity_columns_2.sql\`, \`010_selena_checklist.sql\`, \`011_parity_with_nycmaid.sql\`, \`012_imap_credentials.sql\`, \`013_full_parity.sql\`, \`014_security_hardening.sql\`, \`015_booking_overlap_trigger.sql\`, \`016_outreach_log.sql\`, \`017_review_submission_fields.sql\`, \`018_management_applications.sql\`, \`019_referral_commissions.sql\`, \`020_payment_processor_parity.sql\`, \`021_team_member_stripe_ready.sql\`, \`022_domain_notes_unique.sql\`, \`023_missing_per_tenant_api_keys.sql\`, \`024_tenant_members_clerk_optional.sql\`, \`025_tenant_ai_seo_keys.sql\`, \`026_quotes.sql\`, \`027_invoices.sql\`, \`028_routes.sql\`, \`029_pipeline.sql\`, \`030_finance.sql\`, \`031_documents.sql\`, \`032_ledger.sql\`, \`033_receipts.sql\`, \`034_entities.sql\`, \`035_close_audit.sql\`, \`036_cpa_retry.sql\`, \`037_leads_qualification.sql\`, \`038_audit_trigger_fix.sql\`, \`039_atomic_ledger_and_hardening.sql\`, \`040_email_logs_type_column.sql\`, \`041_impersonation_audit.sql\`, \`042_portal_and_verification_codes.sql\`, \`043_tenant_domains.sql\`, \`044_legacy_seo_gate.sql\`, \`045_billing_lifecycle_columns.sql\`, \`046_rls_deny_on_new_tables.sql\`, \`047_user_preferences.sql\`, \`048_leads_settings_columns.sql\`, \`049_smart_schedule_parity.sql\`, \`050_nycmaid_parity_2026_04_29.sql\`, \`050_tenant_stripe_pay_link.sql\`, \`051_waitlist.sql\`, \`052_client_properties.sql\`, \`053_hr_foundation.sql\`, \`054_bank_fc.sql\`, \`055_tenant_domains_routing.backfill.sql\`, \`055_tenant_domains_routing.sql\`, \`055_tenant_domains_routing.verify.sql\`, \`056_tenant_domains_routing_enforce.sql\`, \`057_freeze_tenants_domain.sql\`, \`057_unfreeze_tenants_domain.sql\`, \`058_fix_nycmaid_routing.sql\`, \`059_backfill_vercel_project.sql\`, \`060_lockdown_secdef_rpcs.sql\`, \`061_unique_journal_entries.sql\`, \`062_add_tenant_id_inbound_emails.sql\`, \`062_unique_payroll_payments.sql\`, \`063_nycmaid_routing_reconcile.sql\`, \`063_nycmaid_routing_reconcile.verify.sql\`, \`064_unique_journal_entries.sql\`, \`065_unique_payments_reference.sql\`, \`066_unique_referral_commissions_booking.sql\`

Dated era (2026_MM_DD_..., one file per schema change — filenames are self-describing; 11 of these are \`_PROPOSED\` and NOT yet applied, see Architecture > RLS):

\`2026_07_02_jobs_projects.sql\`, \`2026_07_02_job_payment_triggers.sql\`, \`2026_07_02_sales_applications.sql\`, \`2026_07_04_quote_recurring.sql\`, \`2026_07_04_seo_changes.sql\`, \`2026_07_04_seo_detection_fn.sql\`, \`2026_07_04_seo_overrides.sql\`, \`2026_07_04_seo_signal.sql\`, \`2026_07_05_calendar_projects.sql\`, \`2026_07_05_import_staging.sql\`, \`2026_07_05_jobs_unscheduled_status.sql\`, \`2026_07_05_referrer_portal_otp.sql\`, \`2026_07_05_seo_autopilot.sql\`, \`2026_07_05_seo_competitors.sql\`, \`2026_07_05_seo_scoring.sql\`, \`2026_07_05_service_area_geo.sql\`, \`2026_07_05_tenant_onboarding_profile.sql\`, \`2026_07_05_tenant_stripe_subscription.sql\`, \`2026_07_11_enable_rls_gap_tables.sql\`, \`2026_07_11_rls_tenant_tables.sql\`, \`2026_07_11_rls_tenant_tables_verify.sql\`, \`2026_07_11_team_member_payouts_unique.sql\`, \`2026_07_13_bookings_same_date_dedup_PROPOSED.sql\`, \`2026_07_13_clients_tenant_email_unique.sql\`, \`2026_07_13_journal_entries_dedup_constraint_PROPOSED.sql\`, \`2026_07_13_journal_entries_source_unique.sql\`, \`2026_07_13_partner_requests_conversion_claim.sql\`, \`2026_07_13_payments_reference_dedup_PROPOSED.sql\`, \`2026_07_13_rls_next10_tenant_policies_PROPOSED.sql\`, \`2026_07_13_rls_pass3_tenant_policies_PROPOSED.sql\`, \`2026_07_13_rls_pass4_tenant_policies_PROPOSED.sql\`, \`2026_07_13_rls_pass5_tenant_policies_PROPOSED.sql\`, \`2026_07_13_rls_pass6_tenant_policies_PROPOSED.sql\`, \`2026_07_13_rls_pass7_tenant_policies_PROPOSED.sql\`, \`2026_07_13_rls_pass8_tenant_policies_PROPOSED.sql\`, \`2026_07_13_rls_top10_tenant_policies_PROPOSED.sql\`, \`2026_07_13_tenants_telegram_webhook_secret.sql\`, \`2026_07_14_gdpr_deletion.sql\`, \`2026_07_14_tenant_terms_addenda.sql\`, \`2026_07_15_prospects_voice_agent_fields.sql\`, \`2026_07_15_rls_tier1_enable.sql\`, \`2026_07_15_tenants_xai_api_key.sql\`, \`2026_07_18_job_photos.sql\`, \`2026_07_18_platform_feedback_tenant_id.sql\`, \`2026_07_18_quote_budgets.sql\`, \`2026_07_18_sales_partners.sql\`, \`2026_07_18_service_types_budget_defaults.sql\`, \`2026_07_18_vendors.sql\`, \`2026_07_19_bookings_discount_credit.sql\`, \`2026_07_19_booking_notes_video_and_project_anchor.sql\`, \`2026_07_19_sales_partner_agreement.sql\`, \`2026_07_19_tenants_deepgram_api_key.sql\`, \`2026_07_21_budget_line_items.sql\`, \`2026_07_21_budget_line_items_catalog_link.sql\`, \`2026_07_21_budget_line_items_description_price_margin.sql\`, \`2026_07_21_budget_line_items_labor_supplies.sql\`, \`2026_07_21_budget_line_items_qty.sql\`, \`2026_07_21_budget_templates.sql\`, \`2026_07_21_chart_of_accounts_equipment_backfill.sql\`, \`2026_07_21_equipment.sql\`, \`2026_07_21_expenses_fk_wiring.sql\`, \`2026_07_21_inventory_vendor_catalog_costing.sql\`, \`2026_07_21_preset_categories.sql\`, \`2026_07_21_shared_categories.sql\`, \`2026_07_22_management_applications_resume_optional.sql\`, \`2026_07_22_referrer_stripe_connect.sql\`, \`2026_07_22_referrer_stripe_ineligible.sql\`, \`2026_07_22_sales_partner_commission_stripe_transfer.sql\`, \`2026_07_22_sales_partner_stripe_ineligible.sql\`, \`2026_07_22_team_member_max_travel_minutes.sql\`, \`2026_07_22_tenant_xai_sip_creds.sql\`, \`2026_07_22_voice_agent_mcp_secret.sql\`, \`2026_07_23_customer_job_numbers.sql\`, \`2026_07_23_job_project_numbers.sql\`, \`2026_07_23_tenant_sms_from_number.sql\`, \`2026_07_23_tenant_voice_did.sql\`, \`2026_07_24_connect_team_channels_translation.sql\`, \`2026_07_24_portal_contact_verify_codes.sql\`, \`2026_07_24_team_announcements.sql\`, \`2026_07_25_bookings_source.sql\`, \`2026_07_25_booking_atomic_source_param.sql\`, \`2026_07_25_messages_translation_and_group_channels.sql\`, \`2026_07_27_connect_message_attachments.sql\`, \`2026_07_27_recurring_schedule_budgets.sql\``,
  },
  {
    id: 'loop-connect',
    title: 'Loop Connect (Unified Messaging)',
    content: `Loop Connect (\`/dashboard/connect\`) is the tenant owner's unified inbox — one place for every conversation thread, replacing the retired standalone Messages nav item (2026-07-25). \`/dashboard/messages\` is now just a redirect here.

**What lives inside Connect:**
- **"Full Loop Support" (pinned)** — the owner's side of Platform Messaging with the FullLoop admin team (see that section). Level 1 only (in-platform, no SMS/email).
- **Team channels (\`type='team'\`)** — translated 1:1 operator↔worker threads. This replaced the old \`team_direct_messages\` DM feature outright (retired 2026-07-25) since it covered the identical relationship.
- **Custom/group channels (\`type='custom'\`)** — admin-created channels carrying explicit \`team_member_id\` recipients via \`connect_channel_members\`. Members see these in their team-portal channel switcher (\`/api/team-portal/connect/channels\`) alongside their own private team thread.

**Auto-translation:** every Connect message (Support thread + all \`connect_channels\` types) is translated EN/ES at send time via \`translateToEnEs\` (fail-open — if translation fails, the raw body still sends) and stored as \`body_en\`/\`body_es\` alongside the raw \`body\`.

**Attachments:** \`connect_message_attachments\` (added 2026-07-27) lets any Connect message carry file/photo attachments.

**Refresh model:** 15s polling while a thread is open. True push-realtime is pending RLS policies on the underlying tables (see Architecture > RLS — this is one of the still-\`_PROPOSED\` gaps).

**Key modules:** \`src/lib/connect-team-channel.ts\`, \`src/lib/connect-translate.ts\`. API surface: \`/api/connect/*\` (channels, messages, unread) and \`/api/team-portal/connect/*\` for the worker side.`,
  },
  {
    id: 'sales-pipeline',
    title: 'Sales Pipeline & Catalog',
    content: `The tenant-facing Sales hub (\`/dashboard/sales\`) is a single page with six in-page tabs — no route changes, back button stays meaningful. Verified from the page's own lettered tab definitions:

| Letter | Tab | Purpose |
|---|---|---|
| A | Pipeline | The whole pipeline at a glance — every deal flows left→right |
| B | Leads | Step 1. Every lead (web form or "+ New Lead") becomes a client automatically |
| C | Qualify | Step 2. Confirm scope & fit in notes; mark Qualified (send proposal) or Not Qualified (close with reason) |
| D | Quotes | Step 3. Build a real quote — line items + optional deposit — send by email + text |
| E | Sales | Step 4. Signed proposals land here: Pending (awaiting deposit) or Sold. Instant bookings auto-land here too |
| F | Schedule | Step 5. A sold job opens the schedule window — pick a date, it lands on the calendar |

The process **is** the tabs, left to right: Lead → Qualify → Quote → Sold → Schedule. The Schedule tab embeds the same \`CalendarShell\` component used elsewhere (no separate calendar implementation).

**Catalog** is deliberately its own top-level nav item under Sales (not a Sales tab) because it's shared infrastructure for proposal-building, not a pipeline stage: \`/dashboard/catalog\` — the master service/product catalog (\`catalog\`, \`categories\`, \`preset_categories\`, \`shared_categories\` tables) used when building quotes. Verified from the page's own header comment: it CONSOLIDATES what used to be 6 scattered menu items (Services Catalog + Budgets + Categories under Sales, Vendors + Inventory + Equipment under Production — one interconnected system: what you sell, what it costs, who you buy it from, how it rolls into a proposal's budget) into 6 tabs on one page: **Services, Budgets, Vendors, Categories, Inventory, Equipment.**

**Budget Templates** (\`BudgetTemplatesTab.tsx\`, tables \`budget_templates\`/\`budget_line_items\`) — reusable estimate templates with labor/supplies split, catalog-linked line-item pricing, quantity, and margin. Used to speed up quote creation for repeat job types.

**Sales Forecast** (\`sales-forecast-tab.tsx\`) and **Sales Conversations** (\`sales-conversations-tab.tsx\`) are supporting tabs/components feeding the pipeline view.

Nav sub-items under Sales (from \`dashboard-shell.tsx\`): Catalog, Sales Partners, Referrals.`,
  },
  {
    id: 'finance-v2',
    title: 'Finance Hub (v2)',
    content: `The Finance hub (\`/dashboard/finance\`) is one page with eight true in-page tabs — content for the 7 non-Overview tabs is each surface's existing real page component rendered inline (not rebuilt/stubbed), just moved from separate routes into one shared shell:

| Letter | Tab | Purpose |
|---|---|---|
| A | Overview | Top-level financial snapshot |
| B | Transactions | Transaction feed |
| C | Expenses | Expense tracking by category, vendor-linked |
| D | Ledger & Payroll | Also reachable directly at \`/dashboard/books\` — the HR hub's "C" sub-nav item points here too (see HR section) |
| E | Reconcile | Bank/account reconciliation |
| F | Reports | Financial reporting |
| G | Close | Period close workflow |
| H | Accountant | Accountant-facing view/export |

**Double-entry backing:** \`chart_of_accounts\` + \`journal_entries\`, with atomic posting and uniqueness constraints added across three migration passes (\`039_atomic_ledger_and_hardening\`, \`061\`/\`064_unique_journal_entries\`, \`2026_07_13_journal_entries_source_unique\` + a still-\`_PROPOSED\` dedup constraint).

**This is a real accounting backend, not a simple ledger — see the "Notable route behavior" list under API Reference > Finance & Billing for the full picture:** Stripe Financial Connections bank linking, AI-suggested transaction categorization, Claude-vision receipt OCR with auto-matching, natural-language finance Q&A, formal period open/close/reopen, scoped CPA access tokens for outside accountants, 4-week cash-flow forecasting, AR aging, $600-threshold 1099 flagging, and a one-click year-end zip package (P&L + Trial Balance + General Ledger + Invoices + Expenses + Payouts).

**Costing infrastructure (added 2026-07-21):** \`equipment\`, \`vendors\`, and \`inventory\` with vendor-catalog costing (\`2026_07_21_inventory_vendor_catalog_costing.sql\`) — lets a job's true cost include equipment depreciation and vendor-sourced supply pricing, not just labor. \`chart_of_accounts_equipment_backfill\` wires equipment purchases into the ledger.

**Depreciation & payments:** \`/api/cron/post-depreciation\` runs monthly (1st, 5am UTC); \`/api/cron/finance-post\` posts daily (4am UTC); \`/api/cron/release-due-payments\` runs daily (7am UTC).

This supersedes the older flat Finance description (Revenue/Payroll/Expenses/P&L) in the Time & Billing section below — that section's content is now folded into the Ledger & Payroll and Reports tabs here.`,
  },
  {
    id: 'hr-people',
    title: 'HR — People, Roster & Payroll',
    content: `HR is a three-surface "PROCESS" nav (mirrors the Finance hub's lettered sub-nav pattern), verified from \`src/app/dashboard/hr/page.tsx\`'s own header comment:

| Letter | Label | Route | Owns |
|---|---|---|---|
| A | People | \`/dashboard/hr\` | The employee record: employment type, comp of record, documents/compliance, onboarding |
| B | Roster & Schedule | \`/dashboard/team\` | Team member roster + availability/scheduling (pre-existing Team Portal backing) — itself a 6-tab page: **Team, Applications, Sales Apps, Ops Admin, Performance, Payroll** |
| C | Ledger & Payroll | \`/dashboard/books\` | Payroll ledger — same surface the Finance hub's "Ledger & Payroll" tab points to |

People (A) is the new connective layer added on top of the roster — it does NOT duplicate roster/payroll scheduling, which still lives on Team (B).

**Books (\`/dashboard/books\`) is itself an 8-tab page, not a single view** — verified from its own tab definitions: **A Overview, B Ledger, C Payroll, D Expenses, E Reconcile, F Tax, G Statements, H Cleaners.** This mirrors the Finance hub's lettered-tab pattern exactly (Overview/Transactions/Expenses/Ledger & Payroll/Reconcile/Reports/Close/Accountant) — Books and the Finance hub's "Ledger & Payroll" tab point at the same underlying surface, just entered from two different nav paths (HR's People/Roster/Ledger sub-nav vs. the Finance hub directly).

**Team Announcements** (\`team_announcements\` table, added 2026-07-24) — broadcast messages to the roster, surfaced in \`/dashboard/announcements\` and the team-portal announcements feed.

**Applications intake:** \`management_applications\`, \`sales_applications\`, \`cleaner_applications\`/\`team-applications\` — job/partner application intake with resume upload, feeding the HR hiring pipeline.`,
  },
  {
    id: 'referrals-sales-partners',
    title: 'Referrals & Sales Partners',
    content: `Two distinct revenue-share programs, both reachable as Sales sub-nav items:

**Referrals** (\`/dashboard/referrals\`, admin: \`/admin/referrals\`) — client/word-of-mouth referral tracking. Tables: \`referrals\`, \`referrers\`, \`referral_commissions\`. Referrers get a portal with OTP auth (\`2026_07_05_referrer_portal_otp.sql\`) and can be Stripe-Connect-eligible for commission payout (\`2026_07_22_referrer_stripe_connect.sql\`) — ineligible referrers are explicitly flagged (\`referrer_stripe_ineligible\`) rather than silently failing payout.

**Sales Partners** (\`/dashboard/sales-partners\`, admin cross-tenant view: \`/admin/sales\`) — a formal partner program with a signed agreement step (\`sales_partner_agreement\`, 2026-07-19) and commission paid via Stripe Connect transfer (\`sales_partner_commission_stripe_transfer\`, verified with its own test file \`route.stripe-transfer.test.ts\`). Same ineligibility-flag pattern as referrers.

**Partner Requests:** \`partner_requests\` table tracks conversion claims — a partner asserting credit for a specific deal, with a claim/dispute flow (\`2026_07_13_partner_requests_conversion_claim.sql\`).

Both programs are GLOBAL (one implementation, all tenants) per the platform's architecture rule — a tenant's referral/partner data is scoped by \`tenant_id\`, not by a forked codepath.`,
  },
  {
    id: 'voice-ai',
    title: 'Voice AI — Three Distinct Systems, Do Not Conflate Them',
    content: `There are three separate voice-related systems in this codebase. Confusing them is the single most likely documentation/support error, so each is called out explicitly with its actual source file:

**1. FullLoop's own prospect-qualification voice line** (\`src/lib/voice-agent/tools.ts\`) — xAI Grok, connected via an MCP server at \`src/app/api/voice/mcp/[secret]/[transport]/route.ts\`. This is FullLoop's OWN sales line: when a prospective tenant calls to ask about becoming a FullLoop customer, this agent answers, quotes pricing (reuses \`computeMonthly()\` from \`billing-pricing.ts\` — same numbers as the Getting Started section), and calls \`createProspect()\` — the identical function the public \`/qualify\` form calls, so voice-originated leads land in the same Leads/Prospects review flow as every other channel.

**2. A tenant's CUSTOMER-facing voice agent** (\`src/lib/voice-agent/customer-tools.ts\`) — branded "Yinez" on the phone (as opposed to whatever \`agent_name\` a tenant configured for SMS/web — default "Selena"). Ported from the standalone NYC Maid build. Every tool reuses the EXACT logic text-Selena runs: finds-or-creates an \`sms_conversations\` row keyed by the caller's phone (now tenant-scoped), then dispatches through the same \`handleTool()\` in \`lib/selena/core.ts\`. Voice bookings, payments, lookups, and escalations flow through the identical pipeline as SMS/web — this is global code, not a per-tenant fork.

**3. ComHub softphone / Telnyx voice** (\`src/lib/comhub-voice-config.ts\`) — NOT an AI agent. Plain VoIP telephony so a tenant's staff can place/receive live human voice calls from inside ComHub. Per-tenant Telnyx voice config first, falling back to the platform's shared Telnyx account if a tenant hasn't configured their own — so ComHub calling works out of the box but upgrades transparently once a tenant brings their own Telnyx voice account.

**Per-tenant credentials (all three systems draw from \`tenants\` columns, encrypted at rest via \`secret-crypto.ts\`):** \`xai_api_key\`, \`tenant_xai_sip_creds\`, \`tenant_voice_did\` (the phone number), \`deepgram_api_key\` (speech-to-text), \`voice_agent_mcp_secret\` (MCP auth).

**Naming note:** "Yinez" is also the name of the ADMIN-side AI persona inside ComHub (\`/api/admin/comhub/yinez/send\` — Jeff chatting with an AI inside ComHub, backed by \`askSelena()\`). That is a FOURTH, unrelated use of the name — an internal admin chat assistant, not voice, not customer-facing. A legacy standalone \`src/lib/yinez/\` module was removed; do not reintroduce it — the current, correct implementation is \`voice-agent/customer-tools.ts\` above.`,
  },
  {
    id: 'jefe-monitoring',
    title: 'Jefe & Platform Monitoring',
    content: `**Jefe** (\`src/lib/jefe/\`) is FullLoop's platform GM agent — talks to Jeff, not to tenants. Per its own system prompt (\`agent.ts\`): watches platform growth (FullLoop's own sales pipeline), security, stability, and every tenant's ABILITY to operate. Explicitly does NOT care about any individual tenant's revenue or day-to-day numbers — that's each tenant's own dashboard's job.

**Integration-health sweep** (\`src/lib/jefe/integration-health.ts\`, cron: \`/api/cron/integration-health-sweep\` every 6hr) — periodically validates every tenant's vendor keys (Telnyx/Resend/Stripe + a tenant's own Anthropic key if set) so a dead key surfaces to Jeff BEFORE a tenant's client hits it. Reuses the exact same live checks as \`/api/admin/businesses/[id]/verify-checklist\` (\`src/lib/onboarding-verify.ts\`) — same verification, run for every tenant on a schedule instead of one tenant on demand. Only checks that represent an ONGOING regression risk are included (\`resend_domain_verified\`, \`telnyx_number_active\`, \`stripe_account\`, \`stripe_webhook_configured\`) — DNS/SSL/MX checks are onboarding-readiness, not something that regresses on its own, and are excluded to avoid false alarms.

**Jefe heartbeat** (\`src/lib/jefe/heartbeat.ts\`, cron: \`/api/cron/jefe-heartbeat\` every 30 min) and **getPlatformHealth()** (\`health.ts\`) — Jefe reads the LATEST PERSISTED result from \`jefe_integration_health\` (cheap) rather than running live vendor checks itself on every chat turn (too slow/costly).

**Admin surfaces:** \`/admin/monitoring\` (platform-wide health dashboard), \`/admin/tenant-health\` (per-tenant health, cron: \`/api/cron/tenant-health\` every 15 min), \`/admin/status\` (system status), \`/admin/activity\` (activity log), \`/admin/ai-usage\` (Anthropic spend tracking, cron: \`/api/cron/anthropic-health\` every 15 min).

**Other always-on monitors:** \`/api/cron/health-monitor\` and \`/api/cron/comms-monitor\` (hourly / every 15 min) watch for silent failures in notification delivery; \`/api/cron/schedule-monitor\` and \`/api/cron/duplicate-schedule-audit\` watch the recurring-booking generator for drift/duplicates.

**Jefe has no dashboard chat page — this doc previously mislabeled one and that's now corrected.** Grepping every API route for an actual import of \`lib/jefe/*\` turns up exactly three callers: \`/api/webhooks/telegram/jefe\` (Jeff talks to Jefe through Telegram), \`/api/cron/jefe-heartbeat\`, and \`/api/cron/integration-health-sweep\`. There is no \`/admin/*\` page that renders a Jefe conversation. \`/admin/ai\` (previously mislabeled "Jefe (AI Chat)" in this doc's Quick Links) is actually a Selena conversation-TESTING tool — an admin picks a tenant and simulates a Selena web-chat exchange (\`askSelena\`) to debug the booking flow without a real customer; it has nothing to do with Jefe. Separately, \`/api/admin/ai-chat\` is a genuine CRM copilot (Claude with tools to query/mutate a tenant's data) — but grepping its actual frontend callers shows it's currently wired only into the legacy PER-TENANT CLONE frontends (\`nyc-mobile-salon\`, \`wash-and-fold-nyc\` — see the Global Rule "known debt" list in Architecture), not the global admin dashboard.`,
  },
  {
    id: 'social-seo',
    title: 'Social Autopost & SEO Automation',
    content: `**Social** (\`/dashboard/social\`) — connected accounts (\`social_accounts\`) and posts (\`social_posts\`) per platform (Facebook/Instagram via OAuth connect flows). Autopost is cron-driven: \`/api/cron/refresh-social-tokens\` (daily 3:30am UTC) keeps OAuth tokens alive so scheduled posts don't silently fail.

**SEO automation** is a pipeline of cron jobs under \`/api/cron/seo-*\`:
- \`seo-ingest\` (daily 6am), \`seo-detect\` (daily 6:30am), \`seo-technical\` (weekly Tue 7am), \`seo-autoverify\` (daily 8am), \`seo-health\` (daily 9am) — real, wired, running (confirmed live 2026-07-31: 1576 rows in \`seo_issues\` across 20 properties, freshest row same-day).
- \`seo-index-cliff\` (weekly Tue 8am) and \`seo-alerts\` (weekly Tue 8:15am) were scheduled in \`vercel.json\` with no matching route file for months (confirmed 404ing live 2026-07-31 — a real \`site_down\` issue for fladumpsterrentals.com sat in \`seo_issues\` unalerted as a direct result). Built 2026-07-31: \`seo-index-cliff\` compares each property's trailing 7-day GSC impressions against the prior 7-day baseline (\`src/lib/seo/index-cliff.ts\`) and writes a critical/high \`index_cliff\` seo_issue on a >=60% drop; \`seo-alerts\` (\`src/lib/seo/alerts.ts\`) pages the owner via the existing \`trackError\`->\`alertOwner\`/\`alertOwnerCritical\` pipeline (same one system-check/tenant-health/comms-monitor already use — Telegram always, SMS to the owner's own phone for critical) for every open critical/high \`seo_issues\` row. Both are unit-tested; live-verified read-only against real prod data (not yet live-fired against prod — no owner alert has been sent, no seo_issues write has happened — pending merge/deploy).
- \`seo-autopilot\`, \`seo-competitors\`, \`seo-enrich\`, \`seo-improve\`, \`seo-propose\`, \`seo-verify-revert\` — route files exist but are **NOT wired into \`vercel.json\`** (manual-trigger only, or dead code left from an earlier phase — verify intent before assuming any of these run on a schedule). This matches the known state of "autopilot OFF" for the competitor-review pipeline.

**Do not assume a \`/api/cron/seo-*\` route runs automatically just because it exists** — check \`vercel.json\` first, per the Cron Jobs table in the API Reference section.`,
  },
  {
    id: 'security-compliance',
    title: 'Security & Compliance',
    content: `**Secret storage:** \`src/lib/secret-crypto.ts\` — per-tenant vendor keys (Telnyx, Resend, Stripe, xAI, Deepgram, etc.) are stored as encrypted TEXT columns on \`tenants\`, encrypted/decrypted in application code via \`encryptSecret()\`/\`decryptSecret()\` — NOT database-layer encryption. Has dedicated isolation tests (\`secret-crypto.isolation.test.ts\`) verifying one tenant's decrypted key never leaks into another's request context.

**Input sanitization:** \`src/lib/sanitize.ts\` — shared sanitizer for user-supplied text (e.g. booking client names) to prevent stored-XSS in any surface that renders client-entered strings without escaping.

**RLS status:** see Architecture section — 5 of 13 RLS migrations applied, 8 still \`_PROPOSED\`. \`rls-tenant-tables-vs-audit-scope-spec.test.ts\` exists to keep the applied policy set honest against the audit-logging scope.

**GDPR / right-to-erasure:** \`2026_07_14_gdpr_deletion.sql\` + \`/api/gdpr/*\` + \`/api/cron/gdpr-purge\` (daily 9am UTC) — handles deletion requests on a schedule rather than requiring manual admin action per request.

**Admin action audit:** \`041_impersonation_audit.sql\` — every admin impersonation session is logged, not just permitted silently. \`audit_logs\` and \`security_events\` tables back \`/admin/security\` and \`/api/audit\`, \`/api/security/events\`.

**Locked-down RPCs:** \`060_lockdown_secdef_rpcs.sql\` — SECURITY DEFINER database functions were audited and locked down in a dedicated pass; treat any new \`SECURITY DEFINER\` function as requiring the same review, not a routine addition.`,
  },
  {
    id: 'feature-map',
    title: 'Full Page Map — Dashboard & Admin',
    content: `Every top-level page directory in the operator surfaces, so nothing is invisible to this doc. Verified by listing \`src/app/dashboard/*\` (39 dirs) and \`src/app/admin/*\` (38 dirs) directly, then reading the actual head of every \`page.tsx\` that wasn't already covered by a dedicated section — this is source-verified, not guessed from directory/nav names.

**Dashboard (\`/dashboard/*\`) — 6-section IA locked in \`docs/design/tokens.md\`:**

| # | Section | Top route | Sub-items |
|---|---|---|---|
| 00 | The Loop | \`/dashboard\` | Home/KPI overview. Server component — every query wrapped in \`unstable_cache\` with a 30s revalidate window. Used to re-run every query from scratch on EVERY load (including a full-year booking pagination and an unbounded 50k-row \`lead_clicks\` scan) — 30s staleness is a deliberate tradeoff for a fast KPI dashboard, not an oversight. |
| 01 | Clients | \`/dashboard/clients\` | A: Feedback. Has its own map view (\`ClientsMap\`, lazy/SSR-disabled) and row-level Call/Text/Directions actions matching the bookings list pattern. |
| 02 | ComHub | \`/dashboard/comhub\` | A: Loop Connect *(see dedicated section)*. ComHub itself reuses the EXACT SAME UI component as \`/admin/comhub\` — "one UI, edited once" per its own comment — just tenant-scoped via \`getCurrentTenantId()\` instead of cross-tenant. Includes a real Telnyx WebRTC browser softphone (lazy-loaded, SSR-disabled since the SDK touches \`window\`). |
| 03 | Sales | \`/dashboard/sales\` *(see dedicated section)* | A: Catalog *(6 tabs: Services/Budgets/Vendors/Categories/Inventory/Equipment — consolidates what used to be 6 scattered menu items)*, B: Sales Partners, C: Referrals *(both see dedicated section)* |
| 04 | Production | \`/dashboard/jobs\` | A: Bookings *(its own page now — the old Calendar/Map/By-Team/Capacity tab switcher here had genuinely DEAD tabs: Map/By-Team/Capacity had no render branch at all, clicking showed nothing; fixed by splitting Bookings out and moving Schedule to Calendar)*, B: Projects, C: Schedule (\`/calendar\` — a Month/Timeline/Kanban shell; the Month view component is reused directly inside Sales' own Schedule tab), D: Crews, E: Find a Team Member, F: Announcements |
| 05 | Finance | \`/dashboard/finance\` *(see dedicated section)* | — |
| 06 | HR | \`/dashboard/team\` *(see HR section — itself a 6-tab page: Team/Applications/Sales Apps/Ops Admin/Performance/Payroll)* | — |
| 07 | Marketing | \`/dashboard/campaigns\` | A: Campaigns, B: Reviews, C: Social *(see dedicated section)*, D: Google (Business Profile reviews + posts), E: Websites (per-tenant visit analytics), F: Analytics (bookings/revenue/clients overview — near-identical stats shape to Websites, worth confirming they aren't meant to be merged) |

**Platform utility links (dashboard):** Onboarding *(14-section registry-driven profile wizard — same \`ProfileWizard\`/\`PROFILE_FIELDS\` the public \`/onboard/[token]\` link and admin's Profile Form use, autosaves 1.5s after every change via \`/api/tenant-profile\`)*, Settings, Users, "AI (Voice \\| SMS \\| Web)" → \`/dashboard/selena\` *(Selena's own conversation-stats dashboard — NOT the same as \`/dashboard/ai\` below)*, Platform Docs → \`/dashboard/docs\` *(see Tenant Knowledge Panel — separate from this doc)*.

**Dashboard pages not in the primary nav tree** — all individually verified, not assumed:
- \`/dashboard/ai\` — **a marketing copy-generation assistant with quick-action prompt templates** (promo email, SMS reminder template, review request, no-show follow-up, win-back campaign, new-service announcement). **Do not confuse with \`/dashboard/selena\`** (conversation stats) or the sticky bottom AI bar (\`ai/chat\`+\`ai/assistant\` — see Communications/AI notes) — three genuinely different dashboard AI surfaces sharing the same "AI" branding.
- \`/dashboard/activity\` — audit-log viewer (created/updated/deleted action feed with color coding).
- \`/dashboard/announcements\` — the UI for Team Announcements (see HR section); explicitly says every team member "sees the full history and gets a notification," confirming the running-feed (not overwritable-blob) model.
- \`/dashboard/books\` — see HR section (8-tab: Overview/Ledger/Payroll/Expenses/Reconcile/Tax/Statements/Cleaners).
- \`/dashboard/changelog\` — the "what's coming" detail feed.
- \`/dashboard/feedback\` — in-app bug/feature feedback (distinct from client-facing feedback under Clients).
- \`/dashboard/go-live\` — real pre-launch readiness gate: tracks task completion AND has explicit \`gatePassed\`/\`gateBlockers\` fields, i.e. launch can be structurally blocked, not just checklist-tracked.
- \`/dashboard/hr\` — People (see HR section).
- \`/dashboard/import\` — CSV client import staging.
- \`/dashboard/leads\` — **redirects to \`/dashboard/sales\`** (its own source comment: "the live-visitor feed now lives in the Sales page's Leads tab"). Confirmed dead as a standalone page, not a duplicate to maintain.
- \`/dashboard/map\` — service-area/booking map view.
- \`/dashboard/messages\` — **redirects to \`/dashboard/connect\`**, kept alive only "for bookmarks and any lingering links" per its own comment.
- \`/dashboard/notifications\`, \`/dashboard/schedules\` (folds under Sales), \`/dashboard/sms\` (folds under Clients), \`/dashboard/websites\` (visit analytics).

**Admin (\`/admin/*\`) — 6-section IA (\`src/app/admin/layout.tsx\`):**

| # | Section | Route |
|---|---|---|
| 00 | Overview | \`/admin\` — explicitly, per its own comment: "This is what Jefe watches: tenant health, provisioning gaps, comms/cron/error signals... NOT a build checklist and NOT tenant ops." This is the closest thing to a Jefe-facing dashboard, even though Jefe itself has no chat UI (see the corrected Jefe section). |
| 01 | Sales | \`/admin/sales\` — cross-tenant Contacts/Leads/Accounts views. Both \`/admin/leads\` and \`/admin/requests\` now redirect here (\`admin/requests\` → \`admin/leads\` → \`admin/sales\`, a double-redirect chain — harmless but worth collapsing to a direct redirect if anyone's touching that code). The \`admin/requests\` API endpoints (proposal/agreement/checkout) are still fully live — see Platform Admin notes — only the standalone page moved. |
| 02 | Tenants | \`/admin/businesses\` — sub: Territories (\`/admin/territories\`, the interactive USA map of the one-tenant-per-category-per-territory exclusivity grid). Each tenant's own profile page (\`/admin/businesses/[id]\`) has one-click Dashboard / Team Portal / Client Portal links — the standalone \`/admin/portals\` picker this replaced (2026-08-01) was a redundant duplicate of this same tenant list. |
| 03 | Tenant Chats | \`/admin/tenant-chats\` — admin side of Platform Messaging. **Its own comment says inbound capture is still phase 2** — see the correction in the Platform Messaging section; don't assume this is fully bidirectional-live yet. |
| 04 | ComHub | \`/admin/comhub\` — the Telnyx WebRTC softphone lives here (lazy/SSR-disabled). |
| 05 | SEO | \`/admin/seo\` |

**Admin platform-utility links:** Tenant Health (the "Fortress board" — every tenant site's live health, written by the tenant-health cron every 15 min, read-only), Feedback, System Status, Activity Log, Monitoring *(see Jefe section)*, AI Usage (30-day cost window, capped at a 100,000-row app-side aggregation — "revisit if volume grows" per its own comment, a known future scaling limit), Security *(color-coded event types: suspicious_login, api_key_change, status_change, plan_change, login, impersonation)*, Announcements, Settings.

**Admin pages not in the primary nav tree — corrected from an earlier draft of this section, which wrongly called \`/admin/ai\` a "Jefe chat interface":**
- \`/admin/ai\` — a Selena conversation-TESTING tool (pick a tenant, simulate a message). \`/admin/ai-chat\` — a CRM copilot with data-mutating tools, currently wired only into legacy per-tenant clone frontends. **Neither is Jefe** — see the corrected Jefe section.
- \`/admin/analytics\` — a genuine React Server Component (not client-rendered like almost everything else here): platform-wide distribution stats (industry/plan/team-size) queried directly at render time.
- \`/admin/billing\`, \`/admin/bookings\` / \`/admin/clients\` / \`/admin/team\` (cross-tenant list views), \`/admin/calendar\`, \`/admin/changelog\`, \`/admin/email\`, \`/admin/google-profile\`, \`/admin/prospects\` (FullLoop's own sales funnel — see Voice AI system #1), \`/admin/marketing\`, \`/admin/notifications\`, \`/admin/referrals\` *(see Referrals section)*, \`/admin/sms\`, \`/admin/social\`, \`/admin/websites\`, \`/admin/docs\` (this page).`,
  },
  {
    id: 'core-lib-modules',
    title: 'Core Library Modules (src/lib/)',
    content: `\`src/lib/\` has 328 non-test files. Most are either already described through the API routes that use them (e.g. \`jefe/*\`, \`voice-agent/*\`, \`selena/*\`, \`secret-crypto.ts\`, \`connect-translate.ts\`, \`billing-pricing.ts\`, \`onboarding-verify.ts\`) or are small, self-explanatory utilities (date formatting, string helpers) that don't warrant individual prose — the code and its own naming already document those adequately, and restating them here would be padding, not documentation. The handful below are large, architecturally load-bearing, and were referenced repeatedly throughout this doc without ever being opened directly — read now to close that specific gap:

**\`comms-registry.ts\`** — the canonical, GLOBAL list of every automated communication the platform can send. This is the actual mechanism behind "tenants cannot self-author new automated triggers" (see Tenants & Settings): adding a new automated comm means adding an entry HERE plus wiring the send path to check \`isCommEnabled(tenantId, key, channel)\` — a tenant literally cannot add a new automation without a code change, by design. Entries marked \`locked: true\` are transactional (verification codes, onboarding) — always on, shown in the UI but not toggleable by the tenant.

**\`recurring.ts\`** — the date-generation engine behind every recurring schedule. Notably fans a single cadence out across MULTIPLE weekday anchors in one pass (e.g. "every Mon+Thu," or "every other Tue+Fri") rather than requiring one schedule row per day — total occurrences is \`cycles × daysOfWeek.length\`, not just \`cycles\`. Anchored on the start date's own calendar week specifically so a mid-week start with earlier weekdays in the pattern doesn't retroactively generate a booking in the past.

**\`smart-schedule.ts\`** — the real team-assignment scoring algorithm behind \`team-availability\`'s "smart ranking" (see Bookings & Scheduling notes). Explicitly industry-neutral (cleaning/HVAC/landscaping/pest all use the same scorer) and multi-tech-aware — a team member counts as "on" a booking whether they're the lead OR listed as an extra in \`booking_team_members\`, and both count identically as a scheduling conflict. Industry-specific rules (e.g. cleaning's labor-only-vs-supplies-included distinction) are deliberately NOT baked into this file — those live in tenant-config/per-industry hooks, keeping the core scorer generic.

**\`create-tenant-from-lead.ts\`** — the single function referenced repeatedly in this doc as the shared path between the manual-comp override and the paid-proposal webhook (see Platform Admin > \`admin/requests\`). Confirmed idempotent (a lead already converted returns its existing tenant, not an error or a duplicate) and confirmed to carry over prefill data, provisioning, seat/billing setup, and notes — not just create a bare tenant row.

**What's still genuinely unread:** the other ~320 \`src/lib/\` files, most of \`src/components/\`, and the handful of large content files (\`siteData.ts\` at 1,300 lines, \`industry-presets.ts\`, \`crm-presets.ts\`) that are almost certainly marketing-site copy/config data rather than application logic — lower-value to read line-by-line than to grep on demand when a specific tenant's site content is actually in question.`,
  },
  {
    id: 'team-portal',
    title: 'Team Portal',
    content: `The Team Portal is a mobile-first app at \`/team-portal\` for field workers (cleaners, technicians, etc.). It uses its own auth system separate from Clerk.

**PIN Authentication:**
- Team members log in with their phone number + 4-digit PIN
- \`/api/team-portal/auth\` verifies credentials against \`team_members\` table
- Returns a JWT token containing \`{ id, tid (tenant_id), name }\`
- All team-portal API routes verify this JWT via \`verifyToken()\`
- No Clerk dependency — works on any device without app install

**Check-In / Check-Out with GPS:**
- **Check-in:** Team member taps check-in on their assigned booking. Captures GPS coordinates (\`lat\`, \`lng\`) and timestamp. Sets booking status to \`in_progress\`.
- **Check-out:** Captures GPS + timestamp. Calculates hours worked and earnings. Sets booking status to \`completed\`.
- GPS coordinates stored as \`check_in_lat/lng\` and \`check_out_lat/lng\` on the booking record
- Admin can verify location against the client's address

**Video Walkthroughs:**
- Team members record walkthrough videos before starting work (condition documentation)
- Final videos recorded after completion (proof of quality)
- Uploaded via \`/api/team-portal/video-upload\` to Supabase Storage \`uploads\` bucket
- URLs stored as \`walkthrough_video_url\` and \`final_video_url\` on the booking
- Upload timestamps tracked for auto-cleanup

**30-Minute Alert — this is the core payment trigger, not a courtesy heads-up:**
- Tapped when the team member is confirmed ~30 minutes from FINISHING the job (not arrival) — timing matters, this fires the real client-facing payment ask
- Triggered via \`/api/team-portal/30min-alert\` (verified from source: \`smsType: 'pre_payment_rating'\`)
- One client SMS carries everything at once: the balance owed, the tenant's Stripe payment link (with \`client_reference_id\` so the webhook ties payment back to this booking), and a "reply 1-5" rating ask riding along in the same text
- Admins are notified first via \`smsAdmins()\`, then the client SMS goes out
- If \`booking.payment_status === 'paid'\` already, the payment-ask portion is skipped — see the guard early in \`route.ts\`
- Because this is what actually collects payment and the review-rating signal, a missed or late tap doesn't just skip a notification — it delays getting paid

**Earnings:**
- \`/api/team-portal/earnings\` returns historical earnings data
- Calculated from completed bookings: hours worked x pay_rate
- Team members can view daily, weekly, and monthly summaries

**Availability:**
- Team members set their weekly availability via the portal
- \`/api/team-portal/availability\` — GET to view, PUT to update
- Used by the scheduling system to match team members to bookings

**Job Board:**
- \`/api/team-portal/jobs\` — View assigned and open jobs
- \`/api/team-portal/jobs/claim\` — Claim an unassigned open job
- Team members can see job details, client address, and special notes

**Bilingual UI:**
- Interface supports English and Spanish
- Language toggle available in the portal header
- All labels, buttons, and instructions are translated

**Mobile Manifest:**
- PWA manifest configured for "Add to Home Screen"
- Works offline for viewing cached job details
- Push notifications for new job assignments`,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    content: `The notification system handles alerts across multiple channels.

**Notification Types:**
\`booking_confirmed\`, \`booking_reminder\`, \`booking_cancelled\`, \`booking_completed\`, \`check_in\`, \`check_out\`, \`payment_received\`, \`review_request\`, \`review_received\`, \`new_client\`, \`new_booking\`, \`schedule_paused\`, \`schedule_resumed\`, \`campaign_sent\`, \`referral_converted\`, \`team_member_added\`, \`daily_summary\`, \`lifecycle_change\`, \`follow_up\`, \`expense_added\`, \`payroll_paid\`, \`sms_received\`, \`sms_opt_out\`, \`sms_opt_in\`, \`team_confirmed\`, \`team_confirm_request\`, \`team_no_confirm_alert\`, \`client_confirm_request\`, \`pending_reminder\`, \`unpaid_team\`, \`payment_due\`, \`daily_ops_recap\`, \`daily_digest\`, \`booking_received\`

**Channels:**
- \`in_app\` — Stored in \`notifications\` table, shown in dashboard/portal notification center
- \`sms\` — Sent via Telnyx using tenant's Telnyx API key and phone number
- \`email\` — Sent via Resend with HTML templates
- \`push\` — Web Push notifications via \`/api/push/subscribe\`

**Core Function — \`notify()\`:**
Located in \`src/lib/notify.ts\`. Accepts \`{ tenantId, type, title, message, ... }\` and:
1. Creates an in-app notification record
2. Optionally sends SMS/email based on notification preferences
3. Uses type-specific email templates from \`email-templates.ts\`

**Email Templates:**
Pre-built HTML templates in \`src/lib/email-templates.ts\`:
- \`bookingReminderEmail\`, \`bookingConfirmationEmail\`, \`bookingReceivedEmail\`
- \`followUpEmail\`, \`dailySummaryEmail\`, \`dailyOpsRecapEmail\`
- \`notificationDigestEmail\`, \`reviewRequestEmail\`, \`paymentReceiptEmail\`

**SMS Templates:**
Located in \`src/lib/sms-templates.ts\`. Pre-formatted messages for common notifications.

**Real-Time Polling:**
- Dashboard uses \`use-poll.ts\` hook to poll for new notifications
- \`/api/sidebar-counts\` provides badge counts for unread items
- Notifications marked as read via PUT to \`/api/notifications\`

**Team Notifications:**
- \`notify-team.ts\` — Send notifications to all team members for a booking
- \`notify-team-member.ts\` — Send to a specific team member
- Used for job assignments, schedule changes, payment confirmations`,
  },
  {
    id: 'video-system',
    title: 'Video System',
    content: `The video system provides documentation of work performed via walkthrough and final videos.

**Upload Flow:**
1. Team member records video on their phone via the team portal
2. Video is uploaded via \`/api/team-portal/video-upload\` as multipart form data
3. File is stored in Supabase Storage \`uploads\` bucket under \`{tenant_id}/videos/{booking_id}/\`
4. The booking record is updated with the video URL and upload timestamp
5. Two video types: \`walkthrough\` (before) and \`final\` (after)

**General File Uploads:**
- \`/api/uploads\` handles general file uploads (images, documents)
- Also uses Supabase Storage \`uploads\` bucket
- Team application resumes uploaded via \`/api/team-applications/upload\`

**Storage:**
- All files stored in the Supabase \`uploads\` storage bucket
- Organized by tenant ID for isolation
- Public URLs generated for viewing

**30-Day Auto-Cleanup Cron:**
- \`/api/cron/cleanup-videos\` runs daily
- Finds all bookings with video URLs where \`uploaded_at\` is older than 30 days
- Deletes the file from Supabase Storage
- Sets the video URL column to null on the booking
- **Dispute protection:** If \`booking.notes\` contains \`[DISPUTE]\`, videos are NOT deleted
- This allows admins to flag disputed bookings to preserve video evidence

**Admin Video Viewer:**
- Admins can view videos from the booking detail page
- Videos are served directly from Supabase Storage public URLs
- Useful for quality checks and dispute resolution`,
  },
  {
    id: 'time-billing',
    title: 'Time & Billing',
    content: `The time tracking and billing system connects team check-in/check-out to payroll and client invoicing.

**Check-In/Check-Out Flow:**
1. Team member checks in via team portal -> \`/api/team-portal/checkin\`
2. System records \`check_in_time\` and GPS coordinates
3. Booking status changes to \`in_progress\`
4. Team member checks out -> \`/api/team-portal/checkout\`
5. System records \`check_out_time\` and GPS coordinates
6. Hours worked calculated: \`(check_out - check_in) / 3600000\`
7. Booking status changes to \`completed\`

**Earnings Calculation:**
- \`hours_worked = (check_out_time - check_in_time) / 3600000\` (milliseconds to hours)
- \`earnings = hours_worked * pay_rate\` (team member's rate)
- Both values rounded to 2 decimal places
- Returned in the checkout API response

**Two Rate System:**
- \`hourly_rate\` — What the client pays (client billing rate)
- \`pay_rate\` — What the team member earns (team member pay rate)
- The difference is the business margin

**Booking Closeout:**
- \`/api/bookings/closeout\` handles end-of-day closeout
- Updates final hours, pay, and billing amounts
- Triggers payment processing if auto-billing is enabled

**Finance Module:**
- \`/api/finance/revenue\` — Revenue reporting by period
- \`/api/finance/expenses\` — Track business expenses
- \`/api/finance/payroll\` — Payroll summaries and payments
- Admin finance page at \`/admin/finance\` shows cross-tenant financials`,
  },
  {
    id: 'onboarding',
    title: 'Onboarding Guide',
    content: `**Corrected from a prior draft of this doc, which described a Starter/Growth/Pro plan-tier picker at creation — that contradicts the actual pricing model (flat per-seat, no tiers — see Getting Started) and doesn't match any field on the real \`admin/businesses\` route. Below is the real pipeline, verified against \`src/app/api/admin/businesses/**\`.**

**The real tenant lifecycle — five admin-only stages, each its own endpoint, each idempotent/safe to re-run:**

1. **Create** — \`POST /admin/businesses\` creates the \`tenants\` row.
2. **Provision** — \`POST /admin/businesses/[id]/provision\` seeds tenant defaults by industry (\`{ industry: 'cleaning'|'landscaping'|... , overrides? }\`).
3. **Profile** — \`GET/PATCH /admin/businesses/[id]/profile\` is the ONE canonical read/write surface the entire redesigned admin UI sits on. Every field routes to its correct real store via a \`PROFILE_FIELDS\` registry (a plain tenant column, a default entity, a \`selena_config\` merge, or a compliance-data merge) — there's no more hand-mapping fragments per surface. Field-level PATCH means the form live-saves; there's no draft/final split. Vendor secrets (Stripe/Resend/Telnyx/etc. keys) are encrypted at rest via \`encryptTenantSecrets\`.
4. **Verify** — \`POST /admin/businesses/[id]/verify-checklist\` runs LIVE verification (DNS, SSL, Resend domain, Telnyx number, Stripe account + webhook) and persists results into \`tenants.setup_progress\` so the checklist UI auto-ticks — this is the same check Jefe's integration-health sweep reuses on a schedule for every tenant afterward (see the Jefe section).
5. **Activate** — \`POST /admin/businesses/[id]/activate\` runs full go-live: idempotent, safe to hit repeatedly, returns per-step results so the UI can show live progress. If this run creates the owner's login, the owner PIN is returned EXACTLY ONCE in that response — it is not retrievable afterward through this endpoint.

**Supporting tools on the same tenant:**
- \`readiness\` (GET) — a report-only Site-Readiness audit (content word counts, on-page SEO, ops/brand basics) against the global new-tenant build standard. Never writes or flips status — purely what's left to do.
- \`selena-preview\` (GET) — returns the literal system prompt Selena will use for this tenant, so persona fields can be verified without running a live conversation.
- \`site-export\` (GET) — produces a downloadable static ZIP of the tenant's live public site (an explicit ownership promise to the customer: they can walk away with their site).
- \`users\` (GET/POST/DELETE on \`/admin/businesses/[id]/users\`) — platform-admin management of THAT tenant's members, distinct from \`/admin/users\` (which manages the caller's own tenant). Creating a member returns their PIN ONCE, same one-time-secret pattern as activation.
- \`invites\` (\`/api/admin/invites\`) — generates an onboarding invite; there is no dedicated \`/admin/invites\` admin PAGE for this today, only the API.

**Post-Onboarding Checklist:**
- Verify Google Business Profile is syncing reviews (check \`/api/cron/sync-google-reviews\`)
- Test Selena by sending an SMS to the tenant's Telnyx number
- Confirm booking notifications are sending (SMS + email)
- Check the client portal URL (\`/portal?t={tenant_id}\`)
- Verify team members can log in to team portal with their PINs
- Confirm the tenant is picked up by Jefe's integration-health sweep (runs every 6hr for every tenant automatically — no manual step needed once \`verify-checklist\` has passed once)
- Review \`/admin/tenant-health\` and \`/admin/monitoring\` for any issues`,
  },
  {
    id: 'environment-variables',
    title: 'Environment Variables',
    content: `All environment variables go in \`.env.local\` (local dev) and Vercel project settings (production).

**Supabase (Required):**
- \`NEXT_PUBLIC_SUPABASE_URL\` — Supabase project URL
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\` — Supabase anon/public key
- \`SUPABASE_SERVICE_ROLE_KEY\` — Supabase service role key (server-side only, full access)

**Clerk (Required):**
- \`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\` — Clerk publishable key
- \`CLERK_SECRET_KEY\` — Clerk secret key
- \`SUPER_ADMIN_CLERK_ID\` — Clerk user ID for the super admin account

**Admin Auth:**
- \`ADMIN_PIN\` — PIN code for admin dashboard access
- \`ADMIN_JWT_SECRET\` — Secret for signing admin JWT tokens

**Secret Encryption (Required):**
- \`SECRET_ENCRYPTION_KEY\` — hex key used by \`src/lib/secret-crypto.ts\` to encrypt/decrypt every per-tenant vendor key stored on \`tenants\` (Telnyx, Resend, Stripe, xAI, Deepgram, etc.). Encryption happens in application code, not at the database layer — rotating this key requires re-encrypting all stored secrets, not just changing an env var.

**Telnyx (SMS + Voice):**
- Per-tenant: \`telnyx_api_key\`, \`telnyx_phone\`, \`tenant_sms_from_number\` stored on the tenant record (encrypted)
- Per-tenant voice/softphone config (\`comhub-voice-config.ts\`) falls back to a shared platform Telnyx account if a tenant hasn't configured their own — platform-level fallback keys are required even though most tenants bring their own
- \`TELEGRAM_WEBHOOK_SECRET\` pattern also exists per-tenant (\`tenants_telegram_webhook_secret\`) for a Telegram integration path

**Resend (Email):**
- Per-tenant: \`resend_api_key\`, \`resend_domain\` stored on the tenant record (encrypted)
- Each tenant can have their own Resend API key and sending domain

**Stripe (Payments):**
- \`STRIPE_SECRET_KEY\` — Stripe secret key
- \`STRIPE_WEBHOOK_SECRET\` — Webhook signing secret
- \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\` — Client-side Stripe key
- Per-tenant: \`stripe_api_key\`, \`stripe_account_id\` (encrypted) — used by the integration-health sweep
- Stripe Connect: referrers and sales partners each have their own eligibility flag (\`referrer_stripe_ineligible\`, \`sales_partner_stripe_ineligible\`) for commission payout via Connect transfer

**Anthropic (AI — powers Selena, Voice AI, Jefe, and the dashboard AI assistant):**
- \`ANTHROPIC_API_KEY\` — platform-level API key, used as fallback
- Per-tenant: \`anthropic_api_key\` (optional, encrypted) — checked by the Jefe integration-health sweep when set

**Voice AI (xAI / Deepgram — see Voice AI section for which system uses which):**
- Per-tenant: \`xai_api_key\` (encrypted) — FullLoop's own prospect-qualification line AND the tenant customer-facing voice agent both resolve through \`xai-config.ts\`
- Per-tenant: \`tenant_xai_sip_creds\`, \`tenant_voice_did\` (the phone number), \`voice_agent_mcp_secret\` (MCP server auth), \`deepgram_api_key\` (speech-to-text)

**Cron:**
- \`CRON_SECRET\` — Bearer token for authenticating cron job requests (45 of 51 cron route files are wired into \`vercel.json\` — see API Reference > Cron Jobs table for the exact list, including the 8 that exist but are NOT scheduled)

**Google (Optional):**
- \`GOOGLE_CLIENT_ID\` — Google OAuth client ID
- \`GOOGLE_CLIENT_SECRET\` — Google OAuth client secret
- \`GOOGLE_REDIRECT_URI\` — OAuth callback URL

**Push Notifications (Optional):**
- \`NEXT_PUBLIC_VAPID_PUBLIC_KEY\` — VAPID public key
- \`VAPID_PRIVATE_KEY\` — VAPID private key

**Other:**
- \`NEXT_PUBLIC_APP_URL\` — Base URL of the application
- \`NEXT_PUBLIC_SITE_URL\` — Public-facing site URL`,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: `**Common Issues:**

**"Tenant not found" errors**
- Check that the user has a valid \`tenant_id\` in their Clerk user metadata
- Verify the tenant exists in the \`tenants\` table and has \`status = 'active'\`
- If using admin impersonation, ensure \`fl_impersonate\` cookie is set and \`admin_token\` is valid
- Check \`getTenantForRequest()\` in \`src/lib/tenant-query.ts\` for the full resolution logic

**Selena AI Errors**
- Check \`/admin/errors\` for \`selena_error\` notifications with stack traces
- "Empty response" — Claude returned no text. The fallback handler should generate one based on the next step. If recurring, check the system prompt and checklist state.
- "Recap loop" — Selena keeps recapping instead of creating the booking. The fix is in the \`recap\` state handler: if client says "yes", call \`create_booking\` immediately.
- "Conversation stuck" — Checklist may have invalid state. Check \`sms_conversations.booking_checklist\` in Supabase. Reset status to \`greeting\` to restart.
- "Tool call failed" — Check that the tool result was processed. Look for \`create_booking\` or \`save_info\` errors in the conversation log.
- Selena not responding to SMS — Verify the tenant's \`telnyx_api_key\` and \`telnyx_phone\` are set and the Telnyx webhook URL points to \`/api/webhooks/telnyx\`.

**Video Upload Issues**
- "File too large" — Supabase Storage has a 50MB default limit. Check Supabase dashboard storage settings.
- "Upload failed" — Verify the \`uploads\` bucket exists in Supabase Storage and has the correct policies.
- Videos not appearing — Check that the booking record was updated with the URL. Look at \`walkthrough_video_url\` or \`final_video_url\` columns.
- Videos disappearing — The \`cleanup-videos\` cron deletes videos after 30 days. Add \`[DISPUTE]\` to booking notes to prevent deletion.

**SMS Delivery Issues**
- Verify the tenant's Telnyx API key is valid and has SMS capabilities
- Check that the \`telnyx_phone\` number is provisioned and active
- Look at Telnyx dashboard for delivery errors
- Verify the webhook URL in Telnyx portal points to \`/api/webhooks/telnyx\`
- Check for opt-outs: if a client has opted out, SMS will fail silently
- International numbers may require additional Telnyx configuration

**Email Delivery Issues**
- Verify the tenant's Resend API key is valid
- Check Resend dashboard for bounces and complaints
- Webhook at \`/api/webhooks/resend\` logs delivery events
- Verify the sending domain is verified in Resend

**Team Portal Issues**
- "Invalid PIN" — Check the \`team_members\` table for the correct PIN
- GPS not working — Browser needs location permission. HTTPS required.
- Video recording not working — Browser needs camera/microphone permission. HTTPS required.
- JWT expired — Team portal tokens expire. Member needs to log in again.

**Google Business Profile not syncing**
- Ensure OAuth tokens haven't expired — re-authorize via \`/admin/google-profile\`
- Check that the Google My Business API is enabled in the Cloud Console
- Verify the \`google_tokens\` table has valid refresh tokens
- The \`sync-google-reviews\` cron runs every 6 hours — check its logs

**Booking Notifications not sending**
- Verify Telnyx and Resend credentials on the tenant record
- Check the \`notification_preferences\` for the tenant in settings
- Look at Vercel function logs for errors in the notification handlers
- Verify the \`notify()\` function is being called with the correct \`tenantId\`

**Admin Dashboard showing stale data**
- Most admin views fetch fresh data on page load
- Clear browser cache if you see outdated counts
- Check Supabase dashboard for any database connection issues
- The \`sidebar-counts\` endpoint is polled — check it's returning fresh data

**Deployment Issues**
- Ensure ALL environment variables are set in Vercel (see Environment Variables section)
- Check build logs for TypeScript errors — run \`npm run build\` locally first
- Verify cron jobs are configured in \`vercel.json\` with the correct schedule
- Check that the \`CRON_SECRET\` matches between Vercel env vars and cron config
- After deploying, verify \`/api/health\` returns 200
- Deploys are silently cancelled by Vercel unless the commit message contains \`[deploy]\` — a clean build with no errors that never shows up live usually means this, not an actual failure

**"A cron job isn't running"**
- First check whether it's actually wired: 45 of 51 \`/api/cron/*\` route files are in \`vercel.json\`; the other 8 (\`lifecycle\`, \`no-show-check\`, \`seo-autopilot\`, \`seo-competitors\`, \`seo-enrich\`, \`seo-improve\`, \`seo-propose\`, \`seo-verify-revert\`) exist as code but have no schedule — see API Reference > Cron Jobs
- If it IS wired, check the schedule is in UTC, not local time
- Verify \`CRON_SECRET\` Bearer token matches

**Cross-tenant data leak suspected**
- Do NOT assume RLS blocks it — only 5 of 13 RLS migrations are applied (see Architecture > RLS). The real boundary today is every query filtering by \`tenant_id\` in application code via \`getTenantForRequest()\`
- Grep the suspect route for a Supabase query missing \`.eq('tenant_id', ...)\` — this is the most common real cause, not a database policy gap
- Check \`rls-tenant-tables-vs-audit-scope-spec.test.ts\` for the current audited scope

**Voice AI behaving like the wrong agent**
- Confirm which of the three voice systems is actually in play before debugging (see Voice AI section) — FullLoop's own prospect line, a tenant's customer-facing agent, and ComHub's plain-telephony softphone are three different code paths that all happen to touch xAI/Telnyx
- Customer-facing voice bookings should flow through \`handleTool()\` in \`lib/selena/core.ts\` — if a voice booking didn't create a normal SMS/web-equivalent record, check \`customer-tools.ts\` is actually calling that shared handler and not a bypassed path

**Loop Connect message not translating**
- \`translateToEnEs\` is fail-open — a translation failure sends the raw body silently rather than blocking the message. Check for a missing/expired Anthropic key before assuming the translator is broken
- Confirm the channel type: only \`connect_channels\` types and the Support thread are translated — verify the message actually went through Connect and not a legacy path`,
  },
]

export default function AdminDocsPage() {
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']))

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => setExpandedSections(new Set(sections.map(s => s.id)))
  const collapseAll = () => setExpandedSections(new Set())

  const filtered = sections.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
  })

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let inTable = false
    let tableHeaders: string[] = []
    let tableRows: string[][] = []

    const processInline = (line: string): React.ReactNode => {
      const parts: React.ReactNode[] = []
      let remaining = line
      let key = 0

      while (remaining) {
        // Code
        const codeMatch = remaining.match(/`([^`]+)`/)
        if (codeMatch && codeMatch.index !== undefined) {
          if (codeMatch.index > 0) {
            parts.push(<span key={key++}>{processBold(remaining.slice(0, codeMatch.index))}</span>)
          }
          parts.push(
            <code key={key++} className="bg-gray-100 text-teal-700 px-1.5 py-0.5 rounded text-xs font-mono">
              {codeMatch[1]}
            </code>
          )
          remaining = remaining.slice(codeMatch.index + codeMatch[0].length)
          continue
        }
        parts.push(<span key={key++}>{processBold(remaining)}</span>)
        break
      }
      return parts
    }

    const processBold = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = []
      let remaining = text
      let key = 0
      while (remaining) {
        const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
        if (boldMatch && boldMatch.index !== undefined) {
          if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index))
          parts.push(<strong key={key++} className="font-semibold text-slate-900">{boldMatch[1]}</strong>)
          remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
          continue
        }
        parts.push(remaining)
        break
      }
      return parts
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Sub-heading (### )
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={i} className="text-sm font-semibold text-slate-900 mt-4 mb-2 pb-1 border-b border-gray-100">
            {trimmed.slice(4)}
          </h4>
        )
        continue
      }

      // Table detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').filter(c => c.trim()).map(c => c.trim())
        if (!inTable) {
          inTable = true
          tableHeaders = cells
          continue
        }
        if (cells.every(c => /^[-:]+$/.test(c))) continue
        tableRows.push(cells)
        continue
      }

      // Flush table
      if (inTable) {
        elements.push(
          <div key={`table-${i}`} className="border border-gray-200 rounded-lg overflow-hidden mb-3 overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  {tableHeaders.map((h, j) => (
                    <th key={j} className="px-3 py-2 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableRows.map((row, j) => (
                  <tr key={j} className="hover:bg-gray-50">
                    {row.map((cell, k) => (
                      <td key={k} className="px-3 py-2 text-gray-700">{processInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        inTable = false
        tableHeaders = []
        tableRows = []
      }

      if (!trimmed) {
        elements.push(<div key={i} className="h-2" />)
        continue
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/)
      if (numMatch) {
        elements.push(
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-teal-600 font-semibold text-sm min-w-[1.25rem]">{numMatch[1]}.</span>
            <span className="text-sm text-gray-700">{processInline(numMatch[2])}</span>
          </div>
        )
        continue
      }

      // Bullet list
      if (trimmed.startsWith('- ')) {
        elements.push(
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-teal-600 mt-1.5 text-[6px]">&#9679;</span>
            <span className="text-sm text-gray-700">{processInline(trimmed.slice(2))}</span>
          </div>
        )
        continue
      }

      // Regular paragraph
      elements.push(
        <p key={i} className="text-sm text-gray-700 mb-1">{processInline(trimmed)}</p>
      )
    }

    // Flush any remaining table
    if (inTable) {
      elements.push(
        <div key="table-end" className="border border-gray-200 rounded-lg overflow-hidden mb-3 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                {tableHeaders.map((h, j) => (
                  <th key={j} className="px-3 py-2 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map((row, j) => (
                <tr key={j} className="hover:bg-gray-50">
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2 text-gray-700">{processInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return elements
  }

  return (
    <main className="p-3 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Documentation</h1>
        <p className="text-sm text-gray-500 mt-1">Internal knowledge base and reference guides — {sections.length} sections</p>
      </div>

      {/* Search and controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search documentation..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none flex-1"
        />
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Table of contents */}
      <div className="mb-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Table of Contents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
          {sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setExpandedSections(prev => new Set([...prev, s.id]))
                document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="text-left text-sm text-teal-700 hover:text-teal-900 hover:underline px-2 py-1 rounded"
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No results found</h3>
          <p className="text-gray-400 text-sm">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(section => {
            const isExpanded = expandedSections.has(section.id)
            return (
              <div key={section.id} id={`section-${section.id}`} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                  <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    &#9660;
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    {renderMarkdown(section.content)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 bg-teal-50 border border-teal-100 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { label: 'Admin Overview', href: '/admin' },
            { label: 'All Businesses', href: '/admin/businesses' },
            { label: 'Territories', href: '/admin/territories' },
            { label: 'Tenant Chats', href: '/admin/tenant-chats' },
            { label: 'ComHub', href: '/admin/comhub' },
            { label: 'Bookings', href: '/admin/bookings' },
            { label: 'Clients', href: '/admin/clients' },
            { label: 'Team', href: '/admin/team' },
            { label: 'Finance', href: '/admin/finance' },
            { label: 'Sales', href: '/admin/sales' },
            { label: 'Prospects', href: '/admin/prospects' },
            { label: 'Google Profiles', href: '/admin/google-profile' },
            { label: 'Social Media', href: '/admin/social' },
            { label: 'Selena Conversation Tester', href: '/admin/ai' },
            { label: 'SMS Inbox', href: '/admin/sms' },
            { label: 'Email', href: '/admin/email' },
            { label: 'Leads', href: '/admin/leads' },
            { label: 'Referrals', href: '/admin/referrals' },
            { label: 'Marketing', href: '/admin/marketing' },
            { label: 'Notifications', href: '/admin/notifications' },
            { label: 'Analytics', href: '/admin/analytics' },
            { label: 'Monitoring', href: '/admin/monitoring' },
            { label: 'Tenant Health', href: '/admin/tenant-health' },
            { label: 'AI Usage', href: '/admin/ai-usage' },
            { label: 'Security', href: '/admin/security' },
            { label: 'SEO', href: '/admin/seo' },
            { label: 'Platform Settings', href: '/admin/settings' },
            { label: 'System Status', href: '/admin/status' },
            { label: 'Feedback', href: '/admin/feedback' },
            { label: 'Changelog', href: '/admin/changelog' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-teal-100 text-sm text-teal-700 hover:bg-teal-100 transition-colors font-medium"
            >
              <span className="text-teal-600">&#8594;</span>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
