# RLS Coverage Audit — tenant-scoped tables

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Docs only — no DDL run, no prod changes.**_

## What this is

A per-table map of Row-Level Security (RLS) coverage for every table that carries a
`tenant_id` column. For each table: is RLS enabled, does a tenant-scoped policy exist,
and is there any gap. Every tenant table with **no RLS at all** is flagged.

## ⚠️ Method & limitation — read first

This audit is **derived from the migration files**, not from a live database read:

- Sources: `platform/migrations/*.sql` (38 files) and `platform/src/lib/migrations/*.sql`
  (74 files). "RLS enabled" = an `ALTER TABLE … ENABLE ROW LEVEL SECURITY` statement
  exists in a migration (including the SEO/DO-loop helpers). "Policy" = a `CREATE POLICY`
  exists, classified by its `USING` clause.
- **This is not authoritative for live prod.** A migration that enables RLS may not have
  been applied; a table may have been dropped/renamed; and prod could carry RLS state set
  by ad-hoc SQL that never landed in a migration file. The prior tenant-isolation plan
  (`platform/docs/tenant-isolation-rls-plan.md`) and `SECURITY-AUDIT-VERIFIED-2026-06-29.md`
  both explicitly flag that **live RLS state per table needs a `pg_policies` / `pg_class`
  read to confirm.** The verification SQL to do that is at the bottom of this doc.
- Cross-check that the method is sound: this audit independently reports `sms_conversations`
  as **RLS off**, which matches the prod-verified finding in the tenant-isolation plan.

## The finding that dwarfs everything below

Per the two prior verified docs, **tenant isolation today is 100% application-level.**
Every DB call uses the `service_role` client (`supabaseAdmin`, ~377–541 route files), and
**`service_role` bypasses RLS entirely.** So the enabled/deny-all/no-RLS distinctions in
this audit have **near-zero runtime effect right now** — they matter only as a
defense-in-depth backstop for any future request-scoped (JWT) client path.

That means: the 58 "no RLS" tables below are **not active data leaks**. They are gaps in a
backstop that isn't load-bearing yet. The real isolation guarantee is each query remembering
`.eq('tenant_id', …)` — audited separately (IDOR sweep in `SECURITY-AUDIT-VERIFIED-2026-06-29.md`
came back clean). This audit is the raw material for building the DB-level backstop
described in `tenant-isolation-rls-plan.md`, nothing more.

## Summary (132 tenant_id tables)

| Class | Count | Meaning |
|---|---:|---|
| **GAP — no RLS** | **58** | tenant table, RLS never enabled in migrations → **flagged** |
| RLS on, NO policy | 60 | RLS enabled but 0 policies → default-deny for non-service clients, but no positive tenant rule; **still no tenant isolation** |
| RLS on, deny-all stub | 11 | RLS + `USING (false)` blanket-deny stub (046 + SEO signal tables) — defense-in-depth, not tenant-scoped |
| RLS on, public-read | 2 | `territories`, `territory_claims` — `USING (true)`; shared marketplace reference data, tenant-scoping intentionally absent |
| **ENFORCEABLE (tenant policy)** | **1** | `onboarding_tasks` only — `SELECT`-only policy keyed on `tenant_id` from JWT claims |

**Key takeaways:**
1. **Exactly one** table in the entire codebase has a genuinely tenant-scoped RLS policy:
   `onboarding_tasks` (and it is `SELECT`-only — no `WITH CHECK`, so writes are unguarded
   at the DB layer even there).
2. **58 tenant tables have no RLS enabled at all**, including the highest-PII tables:
   `clients`, `bookings`, `sms_conversations`, `sms_conversation_messages`, `invoices`,
   `quotes`, `journal_entries`, `bank_accounts`, `bank_transactions`, `documents` /
   `document_signers` (e-sign), `settings`, `tenant_settings`.
3. The 11 deny-all stubs and 60 "RLS on, no policy" tables provide **no tenant isolation**
   — a positive `tenant_id = …` policy would have to be added per the plan's Stage 1.

## The gap list — 58 tenant tables with NO RLS (flagged)

These carry `tenant_id` but have no `ENABLE ROW LEVEL SECURITY` in any migration. Grouped
by domain; **bold = high-sensitivity PII / financial.**

- **Core client/ops:** **`clients`**, **`bookings`**, `booking_cleaners`, `booking_notes`,
  `cleaners`, `cleaner_payouts`, `crews`, `recurring_schedules`, `schedule_issues`,
  `routes`, `notifications`, `settings`, `tenant_settings`, `tenant_invites`,
  `member_pin_reset_codes`, `oauth_state_nonces`
- **Messaging (PII):** **`sms_conversations`**, **`sms_conversation_messages`**,
  `outreach_log`, `yinez_memory`, `yinez_skills`, `team_notifications`
- **Finance / bookkeeping (sensitive):** **`invoices`**, `invoice_activity`, **`quotes`**,
  `quote_activity`, `quote_templates`, `journal_entries`, `journal_lines`,
  `chart_of_accounts`, `accounting_periods`, `entities`, **`bank_accounts`**,
  **`bank_transactions`**, `bank_import_batches`, `categorization_patterns`,
  `recurring_expenses`, `products`, `cpa_access_tokens`
- **Jobs / projects:** `jobs`, `job_events`, `job_payments`, `projects`
- **Documents / e-sign (sensitive):** **`documents`**, `document_signers`, `document_fields`,
  `document_activity`
- **Sales / applications:** `management_applications`, `management_application_drafts`,
  `sales_applications`, `team_applications`, `referrers`, `client_referral_stats`,
  `campaigns`, `reviews`, `google_reviews`
- **Logs:** `audit_log`, `error_logs`

_(Full per-table detail for all 132 tables in the matrix below.)_

## Full coverage matrix (all 132 tenant_id tables)

| Table | RLS enabled | Policy | Classification |
|---|---|---|---|
| `accounting_periods` | **no** | — | GAP — no RLS |
| `admin_tasks` | yes | — | RLS on, NO policy |
| `ai_chat_logs` | yes | — | RLS on, NO policy |
| `audit_log` | **no** | — | GAP — no RLS |
| `audit_logs` | yes | — | RLS on, NO policy |
| `bank_accounts` | **no** | — | GAP — no RLS |
| `bank_import_batches` | **no** | — | GAP — no RLS |
| `bank_statements` | yes | — | RLS on, NO policy |
| `bank_transactions` | **no** | — | GAP — no RLS |
| `blocked_referrers` | yes | — | RLS on, NO policy |
| `booking_cleaners` | **no** | — | GAP — no RLS |
| `booking_notes` | **no** | — | GAP — no RLS |
| `booking_team_members` | yes | — | RLS on, NO policy |
| `bookings` | **no** | — | GAP — no RLS |
| `campaign_recipients` | yes | — | RLS on, NO policy |
| `campaigns` | **no** | — | GAP — no RLS |
| `categorization_patterns` | **no** | — | GAP — no RLS |
| `chart_of_accounts` | **no** | — | GAP — no RLS |
| `cleaner_applications` | yes | — | RLS on, NO policy |
| `cleaner_broadcast_recipients` | yes | — | RLS on, NO policy |
| `cleaner_broadcasts` | yes | — | RLS on, NO policy |
| `cleaner_payouts` | **no** | — | GAP — no RLS |
| `cleaners` | **no** | — | GAP — no RLS |
| `client_contacts` | yes | — | RLS on, NO policy |
| `client_properties` | yes | deny-all | RLS on, deny-all stub |
| `client_referral_stats` | **no** | — | GAP — no RLS |
| `client_reviews` | yes | — | RLS on, NO policy |
| `client_sms_messages` | yes | — | RLS on, NO policy |
| `clients` | **no** | — | GAP — no RLS |
| `comhub_active_calls` | yes | — | RLS on, NO policy |
| `comhub_admin_phones` | yes | — | RLS on, NO policy |
| `comhub_admin_presence` | yes | — | RLS on, NO policy |
| `comhub_admin_voice_settings` | yes | — | RLS on, NO policy |
| `comhub_channel_members` | yes | — | RLS on, NO policy |
| `comhub_contacts` | yes | — | RLS on, NO policy |
| `comhub_mentions` | yes | — | RLS on, NO policy |
| `comhub_messages` | yes | — | RLS on, NO policy |
| `comhub_missed_call_sms` | yes | — | RLS on, NO policy |
| `comhub_softphone_calls` | yes | — | RLS on, NO policy |
| `comhub_templates` | yes | — | RLS on, NO policy |
| `comhub_threads` | yes | — | RLS on, NO policy |
| `connect_channels` | yes | — | RLS on, NO policy |
| `connect_messages` | yes | — | RLS on, NO policy |
| `connect_read_cursors` | yes | — | RLS on, NO policy |
| `cpa_access_tokens` | **no** | — | GAP — no RLS |
| `crews` | **no** | — | GAP — no RLS |
| `deal_activities` | yes | — | RLS on, NO policy |
| `deals` | yes | — | RLS on, NO policy |
| `document_activity` | **no** | — | GAP — no RLS |
| `document_fields` | **no** | — | GAP — no RLS |
| `document_signers` | **no** | — | GAP — no RLS |
| `documents` | **no** | — | GAP — no RLS |
| `domain_notes` | yes | — | RLS on, NO policy |
| `email_logs` | yes | — | RLS on, NO policy |
| `entities` | **no** | — | GAP — no RLS |
| `error_logs` | **no** | — | GAP — no RLS |
| `expenses` | yes | — | RLS on, NO policy |
| `google_posts` | yes | — | RLS on, NO policy |
| `google_reviews` | **no** | — | GAP — no RLS |
| `hr_document_reminders` | yes | — | RLS on, NO policy |
| `hr_document_requirements` | yes | — | RLS on, NO policy |
| `hr_documents` | yes | — | RLS on, NO policy |
| `hr_employee_profiles` | yes | — | RLS on, NO policy |
| `hr_notes` | yes | — | RLS on, NO policy |
| `impersonation_events` | yes | deny-all | RLS on, deny-all stub |
| `import_batches` | yes | — | RLS on, NO policy |
| `import_rows` | yes | — | RLS on, NO policy |
| `invoice_activity` | **no** | — | GAP — no RLS |
| `invoices` | **no** | — | GAP — no RLS |
| `job_events` | **no** | — | GAP — no RLS |
| `job_payments` | **no** | — | GAP — no RLS |
| `jobs` | **no** | — | GAP — no RLS |
| `journal_entries` | **no** | — | GAP — no RLS |
| `journal_lines` | **no** | — | GAP — no RLS |
| `lead_clicks` | yes | — | RLS on, NO policy |
| `management_application_drafts` | **no** | — | GAP — no RLS |
| `management_applications` | **no** | — | GAP — no RLS |
| `marketing_opt_out_log` | yes | — | RLS on, NO policy |
| `member_pin_reset_codes` | **no** | — | GAP — no RLS |
| `notifications` | **no** | — | GAP — no RLS |
| `oauth_state_nonces` | **no** | — | GAP — no RLS |
| `onboarding_tasks` | yes | tenant-scoped | **ENFORCEABLE (tenant policy)** |
| `outreach_log` | **no** | — | GAP — no RLS |
| `payments` | yes | — | RLS on, NO policy |
| `payroll_payments` | yes | — | RLS on, NO policy |
| `platform_announcement_reads` | yes | — | RLS on, NO policy |
| `portal_auth_codes` | yes | deny-all | RLS on, deny-all stub |
| `portal_leads` | yes | — | RLS on, NO policy |
| `products` | **no** | — | GAP — no RLS |
| `projects` | **no** | — | GAP — no RLS |
| `property_changes` | yes | deny-all | RLS on, deny-all stub |
| `prospects` | yes | — | RLS on, NO policy |
| `push_subscriptions` | yes | — | RLS on, NO policy |
| `quote_activity` | **no** | — | GAP — no RLS |
| `quote_templates` | **no** | — | GAP — no RLS |
| `quotes` | **no** | — | GAP — no RLS |
| `ratings` | yes | — | RLS on, NO policy |
| `recurring_expenses` | **no** | — | GAP — no RLS |
| `recurring_schedules` | **no** | — | GAP — no RLS |
| `referral_commissions` | yes | — | RLS on, NO policy |
| `referrers` | **no** | — | GAP — no RLS |
| `reviews` | **no** | — | GAP — no RLS |
| `routes` | **no** | — | GAP — no RLS |
| `sales_applications` | **no** | — | GAP — no RLS |
| `schedule_issues` | **no** | — | GAP — no RLS |
| `security_events` | yes | — | RLS on, NO policy |
| `selena_memory` | yes | — | RLS on, NO policy |
| `seo_changes` | yes | deny-all | RLS on, deny-all stub |
| `seo_competitors` | yes | deny-all | RLS on, deny-all stub |
| `seo_issues` | yes | deny-all | RLS on, deny-all stub |
| `seo_properties` | yes | deny-all | RLS on, deny-all stub |
| `seo_serp` | yes | deny-all | RLS on, deny-all stub |
| `settings` | **no** | — | GAP — no RLS |
| `sms_conversation_messages` | **no** | — | GAP — no RLS |
| `sms_conversations` | **no** | — | GAP — no RLS |
| `sms_logs` | yes | — | RLS on, NO policy |
| `system_state` | yes | — | RLS on, NO policy |
| `team_applications` | **no** | — | GAP — no RLS |
| `team_member_payouts` | yes | — | RLS on, NO policy |
| `team_notifications` | **no** | — | GAP — no RLS |
| `tenant_domains` | yes | deny-all | RLS on, deny-all stub |
| `tenant_invites` | **no** | — | GAP — no RLS |
| `tenant_settings` | **no** | — | GAP — no RLS |
| `territories` | yes | public-read | RLS on, public-read |
| `territory_claims` | yes | public-read | RLS on, public-read |
| `travel_time_cache` | yes | — | RLS on, NO policy |
| `unmatched_payments` | yes | — | RLS on, NO policy |
| `verification_codes` | yes | deny-all | RLS on, deny-all stub |
| `waitlist` | yes | — | RLS on, NO policy |
| `website_visits` | yes | — | RLS on, NO policy |
| `yinez_memory` | **no** | — | GAP — no RLS |
| `yinez_skills` | **no** | — | GAP — no RLS |

## The one enforceable policy — `onboarding_tasks`

`platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql`:

```sql
CREATE POLICY onboarding_tasks_tenant_read ON onboarding_tasks
  FOR SELECT
  USING (
    tenant_id::text = COALESCE(current_setting('request.jwt.claims', TRUE)::jsonb->>'tenant_id', '')
  );
```

Note: `SELECT` only. No `INSERT`/`UPDATE`/`DELETE` policy and no `WITH CHECK`, so writes are
not constrained by RLS even here. This is the closest thing in the codebase to the target
policy shape in `tenant-isolation-rls-plan.md`, but it reads JWT claims via
`current_setting('request.jwt.claims')` rather than the plan's `auth.jwt()->>'tenant_id'`.

## Non-tenant tables that also have RLS (context, not gaps)

RLS-enabled tables that do **not** carry a `tenant_id` column — correctly excluded from the
tenant matrix; listed so the audit is exhaustive:

| Table | Policy | Why it's not a tenant gap |
|---|---|---|
| `partner_requests` | — (RLS on) | platform sales lead; has `converted_tenant_id` (link to the tenant it became), not `tenant_id` |
| `platform_announcements` | — (RLS on) | platform-wide broadcasts, cross-tenant by design |
| `counties`, `service_categories` | public-read | shared marketplace reference data |
| `seo_metrics`, `seo_sitemaps`, `seo_url_status`, `seo_vitals` | deny-all | child tables of `seo_properties` (scoped via parent `property_id`), no direct `tenant_id` |
| `user_preferences` | — (RLS on) | scoped **indirectly** via `tenant_member_id → tenant_members(id)`, not a direct `tenant_id` |

**Note on `travel_time_cache` / `system_state` / `verification_codes`:** the
`2026_05_09_tenant_id_core.sql` header calls these "EXCLUDED as global," but that note only
means the core **backfill pass** skipped them. Their own `CREATE TABLE` definitions each
include a `tenant_id` column, so they are genuinely tenant-scoped and appear in the matrix
above (all three: RLS on).

## Reconciliation with prior RLS work

- **The "15 gap tables" referenced in the leader order was not found as an explicit list.**
  I searched `platform/**/*.md` for a document naming 15 gap tables and did not locate one.
  The closest prior artifacts are: `046_rls_deny_on_new_tables.sql` (4 deny-stub tables:
  `impersonation_events`, `portal_auth_codes`, `verification_codes`, `tenant_domains`);
  `SECURITY-AUDIT-VERIFIED-2026-06-29.md` (H-B: "deny-stubs on ~4 tables; the other ~40
  unconfirmed"); and `tenant-isolation-rls-plan.md` (notes `sms_conversations` RLS off, and
  0 policies on a 7-table prod sample). If a "15 gap tables" note exists elsewhere (e.g., in
  the main repo outside this worktree, or in chat/channel history), this audit supersedes it
  with the full migration-derived set of **58** no-RLS tenant tables.
- This audit is consistent with the prior verified state: RLS is broadly "on but toothless"
  (enabled with no tenant-scoped policy), and `service_role` bypasses all of it.

## Live verification SQL (run against prod to confirm — not run here)

```sql
-- 1. Every table with a tenant_id column, its RLS flag, and policy count.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       COUNT(p.polname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND a.attnum > 0
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relrowsecurity, c.relname;

-- 2. The gap set: tenant tables with RLS OFF.
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND a.attnum > 0
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = FALSE
ORDER BY c.relname;

-- 3. Policy definitions, to confirm which are tenant-scoped vs deny-all/public.
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Compare the live output against the matrix above; any difference is a case where a migration
did not apply, a table was dropped/renamed, or prod carries out-of-band RLS state.

## Suggested next step (not part of this audit — for Jeff/leader)

This is the input to Stage 1 of `tenant-isolation-rls-plan.md`: one migration adding, per
tenant table, `ENABLE ROW LEVEL SECURITY` + a positive
`USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid) WITH CHECK (…)` policy. Because
`service_role` bypasses RLS, that migration is provably inert at deploy time and can be
staged before any call-site migration. Prioritize the bolded high-PII gap tables first.
