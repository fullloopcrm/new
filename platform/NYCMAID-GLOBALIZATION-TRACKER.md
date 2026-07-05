# NYC Maid → Global (all tenants) — Feature Tracker

Goal: everything NYC Maid has, rebuilt the **global** way (shared `/dashboard` +
`/admin` + `/api`, tenant differs by DATA only), so every tenant gets it at once.

Rule: **one step at a time. Do not start the next until the current is global + verified.**

Status key: ✅ global & verified · 🟡 partial/half-ported · ⬜ nycmaid-only (not started)

---

## Step 1 — Activity Log / Audit History ✅
- [x] Global `audit_logs` (tenant-scoped) + `audit()` helper
- [x] Per-tenant viewer `/dashboard/activity`
- [x] Cross-tenant admin viewer `/admin/activity` (all tenants roll-up)
- [x] Coverage: clients, bookings, schedules, campaigns, services, settings, referrals, expenses, reviews, team, portal (27 call sites)
- Committed FL `278f119`. Not pushed yet.
- (nycmaid standalone also got its own audit_logs + viewer — commit made, needs `create-audit-logs.sql` run.)

---

## The Agent (Yinez / Selena)
- ⬜ Multi-channel agent (web, SMS, admin chat, Telegram)
- ⬜ Intent router + deterministic booking flow
- ⬜ Memory (per-client facts + global lessons)
- ⬜ Skills (authored procedures auto-loaded)
- ⬜ Conversation quality scoring + self-review
- ⬜ Dispute handling (GPS/billing evidence)
- ⬜ Name-extraction + cleaner-vs-client guardrails

## Booking & Scheduling
- 🟡 Admin bookings + calendar
- 🟡 Recurring schedules
- 🟡 Smart-schedule cleaner matching (zones, proximity, clustering, travel buffer)
- ⬜ Canonical cleaner-availability model (days + hours honored)
- ⬜ Find-cleaner, map view, holidays, waitlist, service-types

## Client Portal
- 🟡 Self-book (book/new), dashboard, reschedule, collect, PIN login
- ⬜ Multi-address (client_properties), client-analytics

## Cleaners / Team
- 🟡 Cleaner CRUD
- ⬜ Region pay floor, cleaner-pay logic
- 🟡 Team portal (dashboard, messages, token access)
- ⬜ Check-in/GPS, bilingual cleaner SMS, applications intake

## Payments & Billing
- 🟡 Stripe automation chain (link → webhook → mark paid → auto-pay cleaner → tip split)
- ⬜ Billing-hours grace (client 10min / cleaner 15min)
- ⬜ Payment reminders + followup

## Finance / Accounting
- 🟡 Books/ledger, accounts, audit, close + period lock
- ⬜ CPA access, entities, receipts, reconcile, recurring expenses, reports, transactions, import

## Sales / CRM Pipeline
- 🟡 Leads, pipeline/deals, quotes, invoices
- ⬜ Sales documents, sales routes, attribution, outreach, referrers, marketing, social, websites

## Reviews & Reputation
- 🟡 Reviews
- ⬜ Google reviews sync, auto-reply, rating prompts, feedback

## Comms
- 🟡 ComHub, notifications, email + templates, SMS templates
- ⬜ Push, unsubscribe

## Platform / Ops
- 🟡 Analytics, monitoring, status, errors, security, settings, announcements, changelog
- ⬜ Users/roles depth, docs

## Automation — Crons (24 in nycmaid)
- 🟡 generate-recurring, schedule-monitor, reminders, payment-reminder, sync-google-reviews
- ⬜ daily-summary, confirmation-reminder, late-check-in, post-job-followup, rating-prompt, payment-followup-daily, outreach, retention, sales-follow-ups, health checks, backup, comms-monitor

---

Note: 🟡/⬜ marks are a first pass from memory + surface scan, NOT yet verified file-by-file
against FL. Each step starts by confirming what actually exists in FL before building.
