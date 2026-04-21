# NYCMAID → FULLLOOP CUTOVER CHECKLIST

Authored 2026-04-21 after code review. Every box is a concrete action. Check it when done AND verified. "Done" means observable proof (SQL, screenshot, curl), not "I did it."

Sister docs (already in repo): `ENV-VARS-FOR-CUTOVER.md`, `PARITY-AUDIT-2026-04-20.md`, `ROADMAP-TO-COMPETITIVE.md`, `AUDIT.md`. Memory: `fullloop_nycmaid_cutover_plan.md`, `fullloop_remaining_parity_work.md`.

**Tenant id:** `24d94cd6-9fc0-4882-b544-fa25a4542e9e` (slug `the-nyc-maid`)
**Prod DB ref:** `cetnrttgtoajzjacfbhe.supabase.co`

---

## Phase 0 — Pre-flight: lock code + schema

- [ ] Commit all review fixes in the current working tree (audit + period-lock + RPC migrations, all runtime hardening).
- [ ] Push to `fullloopcrm/new` main.
- [ ] Confirm `vercel --prod` deploys green.
- [ ] `npx tsc --noEmit` exit 0. (already done in review — re-run after commit)
- [ ] Apply `src/lib/migrations/038_audit_trigger_fix.sql` to prod.
  - Proof: `SELECT tgname FROM pg_trigger WHERE tgname='trg_audit' AND tgrelid='tenants'::regclass;` returns a row.
- [ ] Apply `src/lib/migrations/039_atomic_ledger_and_hardening.sql` to prod.
  - Proof: `SELECT proname FROM pg_proc WHERE proname='post_journal_entry';` returns a row.
  - Proof: `SELECT entity_id FROM bookings WHERE tenant_id='24d94cd6-9fc0-4882-b544-fa25a4542e9e' LIMIT 1;` returns a non-null UUID.
- [ ] Snapshot the DB before any cutover writes: `pg_dump --data-only -t tenants -t bookings -t clients -t payments -t journal_entries -t journal_lines -f ~/fullloop-snap-$(date +%F).sql`
- [ ] Test the audit trigger does NOT throw on a tenants UPDATE: `UPDATE tenants SET updated_at=NOW() WHERE id='24d94cd6-9fc0-4882-b544-fa25a4542e9e';` succeeds and inserts into `audit_log`.
- [ ] Smoke-test `post_journal_entry` RPC: a manual entry posts entry+lines in one shot, balanced, visible in `journal_entries` and `journal_lines`.

---

## Phase 1 — Env vars on fullloop Vercel

Reference: `ENV-VARS-FOR-CUTOVER.md`. Every Required var below must exist in **Production** scope.

**Platform-level (Required):**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_WEBHOOK_SECRET`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `STRIPE_SECRET_KEY` (platform key — also per-tenant in DB)
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `TELNYX_API_KEY`
- [ ] `TELNYX_PUBLIC_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_WEBHOOK_SECRET`
- [ ] `CRON_SECRET`
- [ ] `INTERNAL_API_KEY`
- [ ] `ADMIN_TOKEN_SECRET`
- [ ] `ADMIN_PIN`
- [ ] `PORTAL_SECRET`
- [ ] `TEAM_PORTAL_SECRET`
- [ ] `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

**Verification:**
- [ ] `vercel env ls production` lists every Required var.
- [ ] None of the webhook-verify flags are set to `off`.
- [ ] Redeploy after env changes.

---

## Phase 2 — Nycmaid tenant row is complete

Run this on the prod DB; every column below must be non-null for the nycmaid row:

```sql
SELECT id, name, slug, domain, phone, email, industry,
       telnyx_api_key IS NOT NULL AS has_telnyx_key,
       telnyx_phone,
       resend_api_key IS NOT NULL AS has_resend_key,
       email_from,
       stripe_api_key IS NOT NULL AS has_stripe_key,
       imap_host, imap_user, imap_pass IS NOT NULL AS has_imap_pass,
       zelle_email,
       primary_color,
       selena_config IS NOT NULL AS has_selena_config,
       status
FROM tenants WHERE id='24d94cd6-9fc0-4882-b544-fa25a4542e9e';
```

- [ ] All vendor secrets (`telnyx_api_key`, `resend_api_key`, `stripe_api_key`, `imap_pass`) are stored AES-256-GCM encrypted (check the value starts with `v1:`). If any is legacy plaintext, re-save through the admin wizard so the PUT encrypts it.
- [ ] `domain` = `thenycmaid.com`.
- [ ] `industry` = `cleaning`.
- [ ] `selena_config` has: `pricing_tiers`, `service_areas`, `business_hours`, intents, tool-allow list.
- [ ] `status` = `active`, `billing_status` = `active`.
- [ ] At least one row in `tenant_members` with `role='owner'` and Clerk user id populated.
- [ ] Default entity exists: `SELECT id FROM entities WHERE tenant_id='24d94cd6-9fc0-4882-b544-fa25a4542e9e' AND is_default;` returns exactly one.

---

## Phase 3 — Remaining parity work (frontend + APIs)

From `fullloop_remaining_parity_work.md`. These are required to avoid broken pages/flows.

**/site/** refactor (Pri 1 — blocks DNS flip):**
- [ ] Refactor the 22 remaining hardcoded `/site/**` pages to read from `getTenantFromHeaders()`. (Homepage already does.)
- [ ] For each refactored page: render against nycmaid tenant host header and confirm no `undefined` strings.
- [ ] SEO neighborhood pages (`[slug]`, `[slug]/[service]`): gate on `tenant.selena_config.service_areas` OR scope to nycmaid host only.
- [ ] `src/components/site/*` + `src/lib/seo/*` — same refactor for shared components.

**Backend routes (Pri 1):**
- [ ] `schedule_issues` table created + `/api/dashboard/schedule-issues` route + banner renders in `src/app/dashboard/page.tsx`.
- [ ] `/api/finance/pending`, `/api/finance/cleaner-income`, `/api/finance/mark-paid` confirmed live.

**Pri 2:**
- [ ] `/api/finance/statements` ported.
- [ ] `/api/finance/summary` ported.
- [ ] `/api/leads/block` + `clients.dns_status` column — DNS list enforcement lives per the never-contact rule.
- [ ] `/api/leads/verify` ported.
- [ ] `/api/clients/analytics` ported.

**Pri 3:**
- [ ] `/api/team-members/priority` ported.
- [ ] `/api/team-members/upload` + `team-member-docs` storage bucket created.
- [ ] `/api/bookings/batch` ported.
- [ ] Dashboard map filters (cleaner/status/today-week-month) ported to `dashboard-map.tsx`.

---

## Phase 4 — Smoke tests against fullloop (BEFORE touching external webhooks)

Everything below runs against fullloop's prod URL with nycmaid host header.

- [ ] `curl -H "Host: thenycmaid.com" https://app.fullloopcrm.com/site/ -I` → 200, HTML.
- [ ] Admin login works with nycmaid owner Clerk account.
- [ ] Dashboard shows nycmaid's real data: client count, booking count, revenue widget.
- [ ] Calendar renders with team_member colors.
- [ ] At least one admin task visible (create a test one).
- [ ] Selena web chat (`/site/chat-with-selena`) takes a "book a clean this weekend" message, extracts info, responds with slot.
- [ ] Finance → P&L page loads, numbers non-zero, entity filter works.
- [ ] A test booking created via admin appears on the calendar and in finance pending.
- [ ] Create a `document` → upload a PDF → add a signer → send → receive the invite (email or SMS) → sign via the public link → final PDF has the signature stamped and certificate page.
- [ ] Create a test invoice → open public link → Stripe checkout page loads (using nycmaid's Stripe key, not platform key).

---

## Phase 5 — External credentials/infra

- [ ] **Telnyx number port**: confirm `(212) 202-8400` is active on Telnyx. (3-7 day process — check `/lookup` in Telnyx portal.)
- [ ] **Stripe key**: nycmaid's live Stripe API key stored encrypted on tenant row (not platform key). Verify `tenants.stripe_api_key` starts with `v1:` and decrypts to `sk_live_...`.
- [ ] **Resend domain**: `thenycmaid.com` (or subdomain) DKIM + SPF + DMARC verified in Resend. Check `tenants.email_from` matches.
- [ ] **IMAP**: `hi@thenycmaid.com` creds stored on tenant row. Test `/api/cron/email-monitor` with Bearer auth — no errors, polls without lock.
- [ ] **Anthropic key**: tenant's own encrypted Anthropic key (for Selena + ask bar), or falling back to platform env. Verify Selena chat does not 401.

---

## Phase 6 — DNS + domain attach

**DNS preparation (do FIRST, 24h before flip):**
- [ ] Lower TTL on `thenycmaid.com` A/CNAME records to 60 seconds at registrar.
- [ ] Same for `thenewyorkcitymaid.com`.
- [ ] Confirm TTL change propagated: `dig thenycmaid.com +short` returns current record with low TTL.

**Attach to fullloop Vercel:**
- [ ] Vercel project → Settings → Domains → add `thenycmaid.com`.
- [ ] Add `www.thenycmaid.com` as redirect or primary.
- [ ] Add `thenewyorkcitymaid.com`.
- [ ] SSL certs provisioned (green checkmark in Vercel).

**Do NOT flip DNS yet** — wait until Phase 7–8 webhooks are cut over so the new domain's first traffic lands on a system that can handle it.

---

## Phase 7 — External webhook cutover (the risky part)

Order matters. Test in sandbox before flipping live.

- [ ] **Stripe (live)**: Dashboard → Developers → Webhooks → edit existing endpoint. New URL: `https://app.fullloopcrm.com/api/webhooks/stripe`.
  - Events required: `checkout.session.completed`, `payment_intent.payment_failed`, `account.updated`.
  - Copy the NEW signing secret to Vercel `STRIPE_WEBHOOK_SECRET` and redeploy.
  - Test: Stripe → Send test webhook → fullloop `/api/webhooks/stripe` returns 200.
- [ ] **Telnyx**: Messaging Profile → Inbound Webhook URL = `https://app.fullloopcrm.com/api/webhooks/telnyx`.
  - Test: from personal phone, SMS `(212) 202-8400` with "hi" → should land in fullloop `sms_conversations`, Selena replies.
- [ ] **Resend**: Webhook URL = `https://app.fullloopcrm.com/api/webhooks/resend`.
  - Copy signing secret → Vercel `RESEND_WEBHOOK_SECRET`.
  - Test: bounce-test email → webhook logged.
- [ ] **Clerk**: Dashboard → Webhooks → endpoint = `https://app.fullloopcrm.com/api/webhooks/clerk`.
  - Copy signing secret → Vercel `CLERK_WEBHOOK_SECRET`.
  - Test: create a user → fullloop logs the event.
- [ ] Each webhook has a verified test event within the last 10 minutes. Do not proceed if any is untested.

---

## Phase 8 — Flip DNS + turn off nycmaid crons

Sequence precisely:

1. [ ] Confirm Phase 7 all webhooks = green.
2. [ ] Update DNS at registrar: `thenycmaid.com` A/CNAME → Vercel's IP/CNAME. Same for `thenewyorkcitymaid.com`.
3. [ ] Wait for propagation: `dig thenycmaid.com +short` shows Vercel's value from 3 different resolvers (1.1.1.1, 8.8.8.8, 9.9.9.9).
4. [ ] Open `https://thenycmaid.com` in browser → served from fullloop with nycmaid tenant config.
5. [ ] Disable nycmaid's crons: edit `/Users/jefftucker/Desktop/nycmaid/vercel.json`, remove all entries in the `crons` array, commit, `git push`.
6. [ ] Confirm nycmaid Vercel deployment completes and old crons no longer fire (watch Vercel logs for 10 min).
7. [ ] Confirm fullloop crons ARE firing: `email-monitor`, `payment-reminder`, `late-check-in`, `schedule-monitor`, `system-check`, `recurring-expenses`. Inspect last-run times in Vercel dashboard.

---

## Phase 9 — End-to-end verification (48 hours live)

Run each scenario against the live cutover environment. Log the outcome next to the checkbox.

**SMS:**
- [ ] Inbound SMS from unknown number → Selena engages, qualifies, collects info, creates booking row.
- [ ] Inbound SMS from existing client → Selena recognizes (via selena_memory), references last booking.
- [ ] DNS client (if any test one exists) → Selena hard-blocks per rule; no reply sent.
- [ ] Outbound SMS from admin → delivered.

**Email:**
- [ ] Zelle/Venmo notification email to `hi@thenycmaid.com` → email monitor picks up within 2 min → `payments` row inserted → booking payment_status flips to paid.
- [ ] Quote/invoice public link email arrives, link works, no broken tenant-name fields.

**Payments:**
- [ ] Stripe checkout from public invoice link → webhook fires → `payments` row + booking marked paid.
- [ ] Tip detection works (paying > expected).
- [ ] Partial detection works (paying < 95% expected creates admin task).
- [ ] Connect transfer to team_member with `stripe_account_id` succeeds.

**Bookings:**
- [ ] New booking via public /site chat → appears on admin calendar.
- [ ] Recurring booking auto-regenerates for the next cycle.
- [ ] Dashboard revenue widget matches hand-math against `payments` sum.

**Documents:**
- [ ] Send contract to a real signer email → signer clicks link → consents → signs → final PDF downloads with signature + cert page.
- [ ] Integrity hash matches (no mid-transit tamper).

**Finance:**
- [ ] P&L entity filter returns correct numbers.
- [ ] Period lock: try backdating a test journal entry into a locked month → error thrown.
- [ ] CPA token: create a read-only token → download year-end zip → trial balance + general ledger CSVs non-empty and balanced.

---

## Phase 10 — Operational hardening (first 30 days)

- [ ] Daily: check `admin_tasks` queue for payment_failed / payout_failed / partial_payment.
- [ ] Daily: check `sms_conversations` with `scorer` flag = bad → review Selena behavior.
- [ ] Weekly: reconcile `payments` sum vs Stripe dashboard sum for the week.
- [ ] Weekly: reconcile Zelle/Venmo `unmatched_payments` count (should trend toward zero).
- [ ] Weekly: `audit_log` — spot-check for unexpected writes.
- [ ] End of first full calendar month: run monthly close via admin UI. Lock the period. Confirm no write errors afterward.
- [ ] After 30 clean days: pause nycmaid's old Vercel project (not delete — keep for rollback).
- [ ] After 60 clean days: delete nycmaid Vercel project. Downgrade old nycmaid Supabase to free tier (cold backup).

---

## Rollback procedures

**Webhook flip breaks something (Phase 7):**
- [ ] Re-point the broken webhook back to nycmaid's old URL in the provider dashboard.
- [ ] Old nycmaid Vercel is still running → resumes handling.
- [ ] Diagnose, fix, retry — don't proceed past Phase 7 until green.

**DNS flip serves broken pages (Phase 8):**
- [ ] Remove domain from fullloop Vercel project.
- [ ] Revert DNS record at registrar to old nycmaid Vercel.
- [ ] TTL is 60s so propagation <5 min.

**Data corruption post-cutover:**
- [ ] Stop the bleed: disable fullloop crons (`vercel.json` remove crons, redeploy).
- [ ] Identify the write path causing corruption in Vercel logs.
- [ ] Restore from `~/fullloop-snap-<date>.sql` if needed (Phase 0 snapshot).
- [ ] Re-run migration scripts after fix.

**Stripe webhook replay duplicates:**
- [ ] Verified fixed this session (CAS on prospects for signup branch; session-id idempotency on payment branch). If a duplicate still occurs, log the `stripe_session_id` and `payment_intent_id` — file a follow-up.

---

## Known gaps as of checklist authoring

These are acknowledged and don't block cutover, but must be tracked:

1. **Booking inserts don't set `entity_id`** — migration 039 added the column and backfilled, but new booking-create paths (web chat, admin, batch) don't populate it. Until fixed, new bookings default to null (consolidated view only).
2. **Admin notification on new `/qualify` lead** — not built. Super-admin must poll `/admin/prospects`.
3. **Welcome email + Clerk invite on paid tenant** — not built. Super-admin must manually send Clerk invite after webhook creates the tenant.
4. **Tenant-side onboarding checklist widget** — not built.
5. **Sprint 5 (payroll tax / 1099 e-filing)** — deferred (paid services).
6. **Vendor-secret key rotation path** — no automated re-encryption on env-var change.
7. **Integration tests** — near-zero. No automated coverage of cutover scenarios.

---

## Sign-off

- Cutover lead: ____________________
- Date cutover started: ____________________
- Date Phase 9 passed: ____________________
- Date rollback window closed (30 days): ____________________
