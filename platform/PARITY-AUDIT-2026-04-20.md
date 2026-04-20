# nycmaid → fullloop parity audit (2026-04-20)

Read-only audit. Rules for reading this doc:
- "EQUIVALENT, renamed" = present under a different path, not a gap.
- "VERIFY" = I can't be sure from files alone; needs runtime/DB confirmation.
- Severity: CRITICAL = blocks daily ops / active live flow; HIGH = feature loss visible to Jeff or users; LOW = legacy/admin utility / one-shot tool.

## Summary
- **3 CRITICAL gaps** — stripe-onboard routes+page, cron `payment-reminder` semantic mismatch, `admin-contacts` lib (pervasive dependency)
- **14 HIGH gaps** — public `book/collect`, `client-analytics`, `cleaner-applications` (public apply), `geocode-backfill`, `cleanup-phones`, `cleanup-test-bookings`, `domain-notes`, `admin/reviews`, `admin/users` (owner tool), `admin/cleaner-availability`, `admin/travel-times`, `admin/payments/finalize-match`, `test/email-selena*`, `holidays.ts` / `selena-email.ts` libs
- **11 LOW gaps** — `migrate-sms`, `migrate-cleaner-notifications`, `test-emails`, `admin/selena/sms-status`, `docs/route.ts`, `cleaners/priority`, `cleaners/upload`, `admin/recurring-schedules` (reseed via new cron vs. legacy POST), assorted env vars, Selena length delta, marketing components

---

## 1. API routes missing in fullloop

Matching logic: I matched by path first, then by purpose. nycmaid `cleaners/*` → fullloop `team-members/*` / `team/*` / `team-portal/*` are renames (EQUIVALENT). nycmaid `stripe/webhook` → fullloop `webhooks/stripe` is a rename. nycmaid `webhook/telnyx|resend` → fullloop `webhooks/telnyx|resend` is a rename. nycmaid `auth/{login,logout,me}` → fullloop `admin-auth/*` + Clerk is a rename. nycmaid `client/*` → fullloop `portal/*` is a rename. nycmaid `admin/recurring-schedules` → fullloop `schedules/*` is a rename. nycmaid `admin/campaigns*` → fullloop `campaigns/*` is a rename. nycmaid `bookings/broadcast` → fullloop `bookings/broadcast` EXISTS (rewritten with permissions). nycmaid `admin/analytics` → fullloop `admin/analytics` + `dashboard` both exist.

| Severity | nycmaid path | Purpose | Notes |
|---|---|---|---|
| CRITICAL | `/api/cleaners/[id]/stripe-onboard` | Creates Stripe Connect onboarding link for a cleaner | fullloop has `/api/team-members/[id]/stripe-onboard` — VERIFY payload parity (needs senderName, redirect URL shape) |
| CRITICAL | `/api/cleaners/[id]/stripe-status` | Refreshes Stripe account status + SMSes admin on activation | MISSING in fullloop — called from `/stripe-onboard/complete` landing page |
| HIGH | `/api/client/book` | Public booking POST (rate-limit 3/10min, creates client+booking+notifies) | EQUIVALENT, renamed → fullloop has `/api/portal/bookings` but VERIFY rate limits and attribution chain |
| HIGH | `/api/client/collect` | Public lead-capture POST for the `/book/collect` page | MISSING — used by `book/collect` page driven by Selena's web-to-form funnel (src=domain, convo_id) |
| HIGH | `/api/client-analytics` | Admin dashboard: clients grouped by attribution / bookings | MISSING — fullloop has `clients/analytics` but VERIFY field parity (ref_code, referrer_id, bookings count) |
| HIGH | `/api/cleaner-applications` | Public POST for "apply to clean" form + admin emails | EQUIVALENT, renamed → fullloop has `/api/team-applications` (verified present) |
| HIGH | `/api/admin/cleaner-availability` | Given date/time/duration, returns cleaners free to take it | MISSING — used by booking UI. VERIFY fullloop has equivalent (grep finds none) |
| HIGH | `/api/admin/travel-times` | Batch computes route travel time per cleaner for calendar | MISSING — `admin/travel-time` (singular) exists in fullloop; LIST endpoint not ported |
| HIGH | `/api/admin/cleanup-phones` | Strips bidi/zero-width chars from client/cleaner phones | MISSING — one-shot fixer, but used after imports. Keep as utility |
| HIGH | `/api/admin/cleanup-test-bookings` | Deletes 212-555-*/917-555-* test bookings | MISSING — needed after shadow replay / test runs |
| HIGH | `/api/admin/geocode-backfill` | Batch-geocodes missing client/cleaner coords | MISSING — smart-schedule relies on coords |
| HIGH | `/api/admin/reviews` | GET all reviews for admin reviews page | MISSING — fullloop has `reviews/` and `reviews/[id]` but NO admin-protected list endpoint |
| HIGH | `/api/admin/users` | CRUD admin_users (owner-only) | MISSING — fullloop uses Clerk + tenant_members instead. VERIFY role-based owner UI exists |
| HIGH | `/api/admin/payments/finalize-match` | Internal-key-gated: accepts manual Zelle/Venmo match and runs processPayment | MISSING — `admin/payments/confirm-match` exists in fullloop but the finalize variant is separate. VERIFY if merged |
| HIGH | `/api/domain-notes` | GET/POST notes per attributed domain | MISSING |
| HIGH | `/api/test/email-selena` + `/cleanup` | Harness to inject fake inbound email to test Selena email path | MISSING — needed to verify `selena-email.ts` port |
| HIGH | `/api/admin/selena/sms-status` | Monitor endpoint: last N SMS sent, filterable by phone/type | MISSING — used by ElChapo monitor |
| LOW | `/api/cleaners/priority` | Bulk update cleaner priority ordering | MISSING |
| LOW | `/api/cleaners/upload` | Public + admin-gated cleaner photo upload | MISSING — fullloop has generic `uploads/` — VERIFY handles team_member avatar |
| LOW | `/api/docs/route.ts` | Returns static platform config blob for docs dashboard | MISSING in fullloop api layer; fullloop has `admin/docs` + `dashboard/docs` PAGES but no API |
| LOW | `/api/migrate-sms` | One-shot migration helper | Intentionally legacy |
| LOW | `/api/migrate-cleaner-notifications` | One-shot migration helper | Intentionally legacy |
| LOW | `/api/test-emails` | Admin dev tool to preview every email template | MISSING — useful when editing templates |
| LOW | `/api/send-booking-emails` | Legacy batch re-send | VERIFY, likely unused |

## 2. Lib modules missing

| Severity | nycmaid file | Purpose | Notes |
|---|---|---|---|
| CRITICAL | `src/lib/admin-contacts.ts` | `getAdminContacts()` / `emailAdmins()` / `smsAdmins()` — the canonical "notify every admin" helpers | Imported all over nycmaid (broadcast, stripe webhook, stripe-status, collect, book…). fullloop uses `notify()` instead — VERIFY every import path that would be ported is rewritten, otherwise port as-is |
| CRITICAL | `src/lib/payment-processor.ts` | `processPayment()` — canonical path for: mark paid → auto-pay cleaner via Stripe Connect → notify | fullloop has no payment-processor.ts. This is what Stripe webhook + email monitor both call. MUST port before webhook cutover |
| HIGH | `src/lib/notify-cleaner.ts` | `notifyCleaner()` + `formatDeliveryReport()` — push/sms/email tri-channel to ONE cleaner | fullloop has `notify-team-member.ts` — EQUIVALENT, renamed; VERIFY API surface matches |
| HIGH | `src/lib/holidays.ts` | US holiday detection (used by availability + buffers) | MISSING — fullloop's `availability.ts` hardcodes business hours, would drop holiday logic |
| HIGH | `src/lib/selena-email.ts` | Inbound-email → Selena brain → Resend reply (email channel for Selena) | MISSING — ports Selena to email. Live in nycmaid |
| HIGH | `src/lib/roles.ts` | Role/permission constants for `admin_users` | MISSING — fullloop uses `rbac.ts` instead (EQUIVALENT, renamed). VERIFY role names match |
| HIGH | `src/lib/payment-email-parser.ts` | Parses Zelle/Venmo/Cash App inbound emails | PORTED (fullloop has same file) — EQUIVALENT |
| HIGH | `src/lib/email-monitor.ts` | IMAP client for hi@thenycmaid.com | PORTED — EQUIVALENT |
| HIGH | `src/lib/smart-schedule.ts` | `scoreCleanersForBooking()` | PORTED — EQUIVALENT |
| HIGH | `src/lib/service-zones.ts` | 9 NYC zone polygons | PORTED — EQUIVALENT |
| HIGH | `src/lib/conversation-scorer.ts` | Rule + AI self-review scoring | PORTED — EQUIVALENT |
| MEDIUM | `src/lib/useServiceTypes.ts` | React hook | EQUIVALENT missing — VERIFY if used in ported UI |
| MEDIUM | `src/lib/__tests__/selena.test.ts` | Selena test suite | MISSING — fullloop has different tests; port worth considering |
| MEDIUM | `src/lib/selena.backup.ts` | Pre-rebuild backup | Intentionally legacy |

Size delta: nycmaid `selena.ts` = 2,449 lines. fullloop `selena.ts` + `selena-core.ts` + `selena-handlers.ts` = 922+574+721 = 2,217. Close. VERIFY intent router has same 17 intents and all booking-step deterministic responses are present (CLAUDE.md mandates this architecture).

## 3. Crons missing

| Severity | nycmaid cron | Schedule | fullloop equivalent | Notes |
|---|---|---|---|---|
| CRITICAL | `/api/cron/payment-reminder` | `*/5 * * * *` | PRESENT | schedule matches — VERIFY body references `team_members` not `cleaners` |
| CRITICAL | `/api/cron/email-monitor` | `* * * * *` | PRESENT | same schedule |
| HIGH | `/api/cron/reminders` | `0 8 * * *` | PRESENT at `0 * * * *` (hourly) | SCHEDULE MISMATCH — fullloop runs hourly, nycmaid once/day. VERIFY this was intentional |
| HIGH | `/api/cron/daily-summary` | `0 0 * * *` | PRESENT at `0 8 * * *` | SCHEDULE MISMATCH (midnight vs 8am) |
| HIGH | `/api/cron/backup` | `0 5 * * *` | PRESENT at `0 3 * * *` | minor TZ diff |
| HIGH | `/api/cron/late-check-in` | `0 9 * * *` | PRESENT at `*/5 * * * *` | fullloop is MORE aggressive (every 5min) — correct improvement, VERIFY idempotent |
| HIGH | `/api/cron/schedule-monitor` | `0 7 * * *` | PRESENT at `0 7,12,18 * * *` | better coverage on fullloop |
| LOW | `/api/cron/retention` | n/a | PRESENT in fullloop only | fullloop has extra; no gap |
| LOW | `/api/cron/confirmations`, `/lifecycle`, `/follow-up`, `/system-check`, `/auto-reply-reviews` | n/a | Fullloop-only | VERIFY nycmaid doesn't rely on any of these being absent |

Net: no cron paths are missing, but **SCHEDULES for `reminders` and `daily-summary` differ from prod nycmaid**. If nycmaid users expect a summary at midnight, switching to 8am changes behavior. Flag for Jeff's explicit approval before cutover.

## 4. Schema gaps

Base tables are ported (010, 011, 013 parity migrations did the heavy lifting). Remaining items:

| Severity | Item | Status |
|---|---|---|
| LOW | `cleaner_notifications` table | Missing in fullloop migrations — replaced by `team_notifications` (EQUIVALENT, renamed in 007). VERIFY migration script remapped |
| LOW | `travel_time_cache` table | MISSING — used by `admin/travel-times`. If that route isn't ported, this table isn't needed |
| LOW | `sms_logs` table | PRESENT (verified in 007) |
| LOW | `apology_credits` | Columns on clients (`apology_credit_pct/reason/at`) added in 011 — EQUIVALENT |
| MEDIUM | nycmaid `create-settings-table.sql` (singleton `settings` row) | fullloop uses per-tenant `tenant_settings` — EQUIVALENT, data shape differs. VERIFY migration script copies singleton nycmaid settings into tenant_settings row |
| MEDIUM | nycmaid `admin_users` | NO fullloop equivalent — Clerk + `tenant_members` used instead. Admin login flow fundamentally different. This is a deliberate architectural change, but VERIFY Jeff's existing nycmaid admin accounts have been provisioned in Clerk |
| MEDIUM | nycmaid `service_zones` column additions (on `cleaner_applications`) | VERIFY present in fullloop `team_applications` |

**Schema items that need LIVE DB comparison** (can't verify from files):
- Whether every column from `supabase/*.sql` root files was absorbed into 011/013
- Whether `tenant_id` was added to every ported table

## 5. Pages missing

### Admin (`(app)/admin/*` in nycmaid → `dashboard/*` in fullloop)

| Severity | nycmaid page | fullloop equiv | Notes |
|---|---|---|---|
| HIGH | `admin/users` | MISSING in `dashboard/` — only `admin/team` at platform level | nycmaid owners manage admin accounts on their own page. fullloop delegates to Clerk — VERIFY Jeff can still do this via Clerk dashboard |
| LOW | `admin/marketing` | EQUIVALENT, renamed → `dashboard/campaigns` |
| LOW | `admin/sales` | EQUIVALENT, renamed → `dashboard/leads` + deals tables |
| LOW | `admin/cleaners` | EQUIVALENT, renamed → `dashboard/team` |

### Public site pages

| Severity | nycmaid page | fullloop equiv | Notes |
|---|---|---|---|
| CRITICAL | `/stripe-onboard/complete` | MISSING in fullloop | Redirect target from Stripe Connect. If missing, cleaner onboarding dead-ends |
| CRITICAL | `/book/collect` | MISSING in fullloop | Selena's "finish your booking" funnel lands here. Abandon conversions depend on it |
| HIGH | `/book/new`, `/book/reschedule/[id]`, `/book/dashboard` | VERIFY — fullloop has `/portal/book` etc. Path change will break emailed links already in the wild |
| HIGH | `/team/[token]` (tokenized cleaner check-in) | EQUIVALENT → `/team/checkin/[bookingId]` — but TOKEN vs BOOKING_ID difference means emailed links break |
| HIGH | `/apply/operations-coordinator` | MISSING | Active hiring funnel URL |
| HIGH | `/(marketing)/*` full site | EQUIVALENT, moved to `/site/*` — but path change breaks SEO URLs + backlinks + Google Business Profile links |

### Client / portal

| Severity | nycmaid | fullloop equiv | Notes |
|---|---|---|---|
| OK | `/portal` | EQUIVALENT — present |

## 6. Components missing

Spot-check of top-level components that admin/dashboard pages import:

| Severity | nycmaid component | Status in fullloop |
|---|---|---|
| HIGH | `AddressAutocomplete` | present as `address-autocomplete.tsx` (EQUIVALENT, renamed) |
| HIGH | `AdminSidebar` | Replaced by `admin/AdminShell`/`dashboard/dashboard-shell.tsx` (EQUIVALENT) |
| HIGH | `AiAssistant` | EQUIVALENT, renamed → `ai-assistant.tsx` |
| HIGH | `CleanerJobsMap` | EQUIVALENT, renamed → `TeamJobsMap.tsx` |
| HIGH | `DashboardHeader` | Absorbed into dashboard-shell — EQUIVALENT |
| LOW | `marketing/*` (Breadcrumbs, HeroChat, ServiceGrid, VideoReviews, FAQSection, TrustBadges, JsonLd…) | DIFFERENT set in fullloop (`hero`, `stats-bar`, `navbar`, `footer`, `cta-section`, `faq-accordion`, `loop-visual`). nycmaid marketing components NOT in fullloop. If site is migrated to fullloop `/site/*` (it appears to be), fullloop built its own set — VERIFY all nycmaid marketing pages look right when rendered through fullloop shell |

## 7. Env vars referenced in nycmaid but not fullloop

Generated from `grep -r process.env.` on each `src/`:

| Var | Used by | Severity |
|---|---|---|
| `ADMIN_EMAIL` | admin-contacts, referrers, misc | HIGH — nycmaid's global fallback admin email. fullloop uses per-tenant admin_users |
| `ADMIN_FORWARD_PHONE` | Notify admin via SMS | HIGH — needs per-tenant equivalent |
| `ADMIN_PASSWORD` | Legacy admin login | LOW — replaced by Clerk |
| `EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASS` | IMAP for Zelle/Venmo monitor | CRITICAL — fullloop uses per-tenant `imap_*` cols (migration 012). VERIFY env→DB handoff is complete and the cron reads from DB |
| `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_SITE_URL` | Absolute URLs in emails/SMS | HIGH — fullloop uses per-tenant site URL resolution. VERIFY no ported code still reads env |
| `NEXT_PUBLIC_RADAR_API_KEY` / `RADAR_API_KEY` | AddressAutocomplete geocoding | HIGH — VERIFY present in fullloop Vercel env |
| `OWNER_BCC_EMAIL` | Outbound email BCC owner | LOW |
| `TELNYX_FROM_NUMBER` | SMS from number | CRITICAL — fullloop must have per-tenant `telnyx_from_number` in tenant_settings |
| `TZ` | Node TZ | LOW |
| `ELCHAPO_MONITOR_KEY` | Monitor endpoints | Present in fullloop env — OK |

## Recommended next moves

Ranked by risk to live nycmaid if cutover happens without closing the gap:

1. **Port `src/lib/admin-contacts.ts` + `src/lib/payment-processor.ts` to fullloop.** Every notify call assumes these exist. Without them, ported routes will throw at runtime the moment Stripe webhook or email-monitor fires. (CRITICAL)
2. **Port `/api/cleaners/[id]/stripe-status` + `/stripe-onboard/complete` page.** Stripe Connect redirect has nowhere to land in fullloop. Cleaner onboarding breaks silently. (CRITICAL)
3. **Port `/book/collect` page + `/api/client/collect` route.** Selena's lead-capture funnel sends abandoned-chat users here. Losing this = losing conversions daily. (CRITICAL)
4. **Fix cron schedule mismatches for `reminders` and `daily-summary`.** Either revert to nycmaid schedules or flag to Jeff that behavior changes on cutover. (HIGH — silent behavior change is the worst kind)
5. **Port `admin/cleaner-availability`, `admin/travel-times` (plural), `admin/geocode-backfill`, `admin/reviews` GET, `admin/cleanup-phones`, `admin/cleanup-test-bookings`, `domain-notes`.** These are the admin utility endpoints Jeff uses weekly. Missing = Jeff's daily ops workflow degrades. (HIGH)

Also recommended (non-blocking but should be tracked):

- Port `holidays.ts` into fullloop `availability.ts` — without it, availability ignores holidays and smart-schedule over-assigns on Jan 1 / July 4.
- Port `selena-email.ts` — Selena currently can't reply to email in fullloop.
- Env-var sweep: confirm `TELNYX_FROM_NUMBER`, `EMAIL_HOST/USER/PASS`, `RADAR_API_KEY` all resolve in fullloop (DB-backed or env).
- VERIFY Selena's 17 intents all present in fullloop `selena-core.ts` + `selena-handlers.ts`; 2,449 → 2,217 lines is close but intent router is the single highest-leverage piece.
- Live DB diff (pg_dump --schema-only on both) to catch any column nycmaid has that migrations 010-013 didn't already add.
