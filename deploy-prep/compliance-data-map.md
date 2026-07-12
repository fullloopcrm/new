# Compliance Data Map — PII / data inventory per table

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Docs only — no DDL run, no prod changes, no data read.**_

## What this is

A per-table inventory of what personal / sensitive data each tenant-scoped table holds, so
the P1/P2 GDPR-style **data-subject export** and **deletion (erasure)** work has a map of:
what to export, from where, keyed on which identifier, and what cascades when a record is
deleted. It is the data-subject counterpart to `deploy-prep/rls-coverage-audit.md` (which maps
DB-level isolation) and `deploy-prep/audit-log-coverage-matrix.md` (which maps write auditing).

## ⚠️ Method & limitation — read first

- **Derived from migration files** (`platform/migrations/*.sql`, `platform/src/lib/migrations/*.sql`,
  `platform/supabase/schema.sql`), **not a live DB read.** Column lists for the tables in the
  "verified columns" sections were read directly from their `CREATE TABLE`. Tables listed only by
  name (no column detail) are named in the 132-table matrix in `rls-coverage-audit.md` but their
  `CREATE TABLE` was **not** re-read here — treat their PII columns as *inferred from the table's
  purpose*, to be confirmed against live schema before building export/erasure queries.
- **Column drift is real.** At least one live code path queries columns that differ from the base
  migration (e.g. `cron/retention` reads `clients.active` / `clients.sms_consent`, while the base
  `clients` migration declares `status` / `sms_opt_in`). So the authoritative column set for any
  export/erasure query must come from a live `information_schema.columns` read, not this doc.
- **This is not legal advice.** It classifies data by sensitivity to scope engineering work; the
  actual retention/erasure obligations are a policy decision (see
  `deploy-prep/tenant-data-retention-map.md` and `platform/docs/compliance/security-policy.md`).

## PII sensitivity legend

| Class | Meaning | Examples here |
|---|---|---|
| **P0 — Direct identifier** | Identifies a natural person on its own | name, email, phone, home address |
| **P1 — Sensitive personal** | Financial, biometric-ish, signature, gov/tax-adjacent, geolocation | signature image, IP + user-agent at signing, bank/txn data, check-in GPS |
| **P2 — Behavioral / content** | Message bodies, notes, activity trails tied to a person | SMS bodies, client notes, viewing/consent timestamps |
| **P3 — Pseudonymous / operational** | Scoped to a person only via FK; low direct-identifier content | payout amounts, activity rows keyed by `*_id` |
| **REF** | Non-personal reference / config | chart of accounts, settings, territories |

**Tenant-scoping key:** unless noted, every table below carries `tenant_id` (the isolation key).
**Data-subject key** = the column(s) used to find one person's rows for export/erasure.

---

## 1. Customer (end-client) data — the primary data-subject

The cleaning company's customers. This is the bulk of GDPR export/erasure surface.

### `clients` — verified columns (highest-value customer record)

| Column | Class | Notes |
|---|---|---|
| `name`, `email`, `phone`, `address`, `unit` | **P0** | Direct identifiers. |
| `notes`, `special_instructions` | **P2** | Free-text, may contain personal detail (access codes, health, pets). |
| `source`, `referral_code`, `email_opt_in`, `sms_opt_in`, `status` | P3 | Marketing/consent state. |

- **Data-subject key:** `id` (client UUID); secondary match on `email` / `phone`.
- **Export root:** `clients.id` → everything in §1 fans out from here.

### Customer records keyed to a client (fan-out from `clients.id`)

| Table | Class | Data-subject key | PII held |
|---|---|---|---|
| `bookings` *(verified)* | **P1** | `client_id` | Service `address` via client; `check_in_lat`/`check_in_lng` (**GPS**), `notes`, `special_instructions`, `worker_token`, price/tip/payment fields. |
| `booking_notes`, `booking_cleaners`, `booking_team_members` | P2/P3 | `booking_id` | Notes and crew assignment per job. |
| `sms_conversations` *(verified)* | **P0/P2** | `phone`, `client_id`, `name` | Customer phone + name; conversation state. |
| `sms_conversation_messages` *(verified)* | **P2** | `conversation_id` | **Message bodies** (inbound/outbound). |
| `client_sms_messages`, `sms_logs`, `client_contacts`, `client_reviews`, `reviews`, `google_reviews`, `ratings` | P2 | `client_id` / FK | Message logs, review text, ratings tied to the customer. |
| `outreach_log` *(verified)* | **P2** | `client_id` | Marketing message text sent to the client. |
| `invoices` *(verified)* | **P0/P1** | `client_id`, `contact_email`, `contact_phone`, `service_address` | Contact snapshot + `line_items` (JSONB) + money. `public_token` = unauthenticated pay link. |
| `invoice_activity`, `quotes`, `quote_activity`, `payments`, `unmatched_payments`, `job_payments` | P1/P3 | `client_id` / `invoice_id` / FK | Financial records tied to the customer. |
| `documents` *(verified)*, `document_signers` *(verified)* | **P1** | `documents.tenant_id`, `document_signers.email`/`phone` | E-sign: signer `name`/`email`/`phone`, **`signature_png`** (biometric-ish), **`consent_ip`/`signed_ip` (INET)** + user-agent, storage paths to the signed PDF. Highest-sensitivity customer artifact. |
| `document_fields`, `document_activity` | P2/P3 | `document_id` | Field values + activity trail. |
| `client_properties` *(RLS deny-stub)*, `property_changes` *(RLS deny-stub)* | P1 | `client_id` | Property/address detail + change history. |
| `recurring_schedules`, `schedule_issues`, `routes`, `notifications` | P2/P3 | `client_id` / `recipient_id` | Scheduling + notification history (notification bodies quote client name/phone — see `cron/retention`). |
| `referrers`, `client_referral_stats`, `referral_commissions` | P3 | `client_id` | Referral linkage. |

> **Erasure note:** FK `ON DELETE` behavior is **mixed** and must be confirmed per table. From the
> migrations: `invoices.client_id` and `sms_conversations.client_id` are **`SET NULL`** (rows
> survive, de-linked — not erased); `bookings.client_id` is a **plain reference (no cascade)** — a
> hard-delete of a client would error or orphan bookings. Do **not** assume `CASCADE`. Build the
> erasure order child-first and decide hard-delete vs anonymize per table. A blind
> `DELETE FROM clients` will not cleanly erase and will likely error on the `bookings` FK.

---

## 2. Worker / staff data (tenant employees)

| Table | Class | Data-subject key | PII held |
|---|---|---|---|
| `team_members` *(verified)* | **P0/P1** | `id`, `email`, `phone` | `name`, `email`, `phone`, **`pin`** (portal login — credential), `hourly_rate`/`pay_rate`, `push_subscription` (JSONB). |
| `cleaners`, `crews` *(names only)* | **P0** | `id` | Worker identity/roster (columns not re-verified here). |
| `cleaner_payouts`, `team_member_payouts`, `payroll_payments` | **P1** | worker FK | Compensation amounts. |
| `hr_employee_profiles`, `hr_documents`, `hr_document_requirements`, `hr_document_reminders`, `hr_notes` | **P0/P1** | worker FK | HR records + uploaded documents (potentially gov-ID / tax). |
| `member_pin_reset_codes` *(name only)* | **P1** | worker FK | Credential-reset material — treat as secret. |
| `push_subscriptions` | P3 | member FK | Web-push endpoints. |

---

## 3. Applicant / lead data (prospective persons)

| Table | Class | Data-subject key | PII held (verified where noted) |
|---|---|---|---|
| `management_applications` *(verified)* | **P0/P1** | `email`, `phone` | `name`, `email`, `phone`, `location`, `resume_url`, `photo_url`, `video_url`, `references` (JSONB), free-text answers. |
| `team_applications` *(verified)* | **P0** | `email`, `phone` | `name`, `email`, `phone`, `address`, `experience`, `references`, `photo_url`. |
| `cleaner_applications` *(verified)* | **P0/P1** | `email`, `phone` | Same shape + `service_zones`, `has_car`, `max_travel_minutes`, `references` (JSONB). |
| `sales_applications`, `management_application_drafts` *(names only)* | **P0** | `email`/`phone` | Applicant identity; columns not re-verified. |
| `portal_leads`, `waitlist`, `prospects`, `lead_clicks` | P0/P3 | `email`/`phone` | Lead capture. |
| `leads` *(verified — NO `tenant_id`; platform-level)* | **P0** | `email` | `name`, `email`, `phone`, `business_name`, `message`. Platform sales lead, not tenant-scoped — export/erasure here is a **platform** obligation, handle separately. |

---

## 4. Financial / bookkeeping data

Mostly business-of-the-tenant data, but counterparties can be natural persons.

| Table | Class | PII / sensitivity |
|---|---|---|
| `bank_accounts` *(verified)* | **P1** | `institution`, `mask` (last 4), balances. Account-adjacent. |
| `bank_transactions` *(verified)* | **P1** | `description`, **`counterparty`** (can be a person's name), `amount_cents`, `check_number`, `external_id` (Plaid/OFX id), `memo`. |
| `bank_import_batches`, `bank_statements` | P1 | Imported statement data. |
| `journal_entries`, `journal_lines`, `chart_of_accounts`, `accounting_periods`, `entities`, `recurring_expenses`, `expenses`, `products`, `categorization_patterns` | REF/P3 | Ledger + config; personal only via counterparty text. |
| `cpa_access_tokens` *(verified)* | **P1** | `cpa_name`, `cpa_email`, **`token`** (bearer credential — external CPA access). Secret + third-party PII. |

---

## 5. Communications / messaging (COMHUB, Connect, Selena/Yinez)

High P2 content volume — message bodies tied to identifiable people.

| Table group | Class | PII held |
|---|---|---|
| `comhub_*` (`messages`, `contacts`, `threads`, `mentions`, `softphone_calls`, `missed_call_sms`, `active_calls`, `admin_phones`, …) | **P0/P2** | Contact identities, message bodies, call metadata, admin phone numbers. |
| `connect_channels`, `connect_messages`, `connect_read_cursors` | P2 | Internal chat message bodies. |
| `email_logs`, `sms_logs`, `campaign_recipients`, `campaigns`, `marketing_opt_out_log`, `blocked_referrers` | P0/P2 | Recipient addresses + message/campaign content + opt-out state. |
| `yinez_memory`, `yinez_skills`, `selena_memory`, `ai_chat_logs` | **P2** | AI assistant memory/logs — may contain quoted customer PII in free text. |

---

## 6. System / security / audit (personal-adjacent metadata)

| Table | Class | PII held |
|---|---|---|
| `security_events` *(verified)* | **P1** | `ip_address`, `user_agent`, `description`. |
| `audit_logs` *(verified)* | P1/P3 | `user_id`, `ip_address`, `details` (JSONB — may quote PII). |
| `audit_log`, `error_logs` *(RLS-gap tables)* | P1/P3 | Actor + error context; error payloads can leak PII. |
| `impersonation_events` *(RLS deny-stub)* | P1 | Admin-impersonation trail (who accessed which tenant). |
| `oauth_state_nonces`, `portal_auth_codes`, `verification_codes` | **P1** | Ephemeral auth secrets — treat as credentials, exclude from any export, purge on schedule. |
| `website_visits`, `travel_time_cache`, `system_state` | P3/REF | Behavioral/operational; `system_state` is global platform config (not tenant PII). |

---

## GDPR export / erasure — what this map implies

1. **Everything is `tenant_id`-scoped** (except platform tables `leads`, `partner_requests`,
   `platform_announcements`). A per-tenant export = the union of §1–§6 filtered by `tenant_id`.
2. **A data-subject export** (one customer / worker / applicant) starts from the **data-subject
   key** column above and follows FKs. The customer graph roots at `clients.id`; worker at
   `team_members.id`; applicant rows are standalone (match on `email`/`phone`).
3. **Erasure is not a single DELETE.** FK `ON DELETE` behavior is mixed (`CASCADE` / `SET NULL` /
   plain reference). Build the erasure order child-first, and decide per table between **hard
   delete** vs **anonymize-in-place** (financial/audit rows usually must be retained but
   de-identified — see the retention map). `bookings.client_id` is a plain reference (no cascade),
   so it must be handled explicitly.
4. **Exclude secrets from exports:** `team_members.pin`, `cpa_access_tokens.token`, all
   `*_auth_codes` / `*_nonces` / `verification_codes`, and tenant API keys in `tenants`
   (`stripe_api_key`, `telnyx_api_key`, `resend_api_key`).
5. **Highest-sensitivity artifacts** for both export completeness and erasure care:
   `document_signers` (signature image + IP/UA), `sms_conversation_messages` (bodies),
   `bank_transactions` (counterparties), HR documents, and the AI memory tables.

## Live verification SQL (run against prod to confirm columns before building queries — not run here)

```sql
-- Confirm the actual column set + types for any table before writing export/erasure SQL.
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = ANY (ARRAY['clients','bookings','document_signers','team_members',
                              'sms_conversations','sms_conversation_messages','invoices',
                              'bank_transactions','cpa_access_tokens'])
ORDER BY table_name, ordinal_position;

-- Confirm FK ON DELETE behavior (drives erasure order + hard-delete vs SET NULL vs anonymize).
SELECT tc.table_name AS child, kcu.column_name AS fk_column,
       ccu.table_name AS parent, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  AND ccu.table_name IN ('clients','team_members','documents','tenants')
ORDER BY parent, child;
```

## Cross-links

- `deploy-prep/rls-coverage-audit.md` — DB-level isolation state for the same tables.
- `deploy-prep/tenant-data-retention-map.md` — how long each data type is kept + what erasure means.
- `deploy-prep/audit-log-coverage-matrix.md` — write-audit coverage of the same domains.
- `platform/docs/compliance/security-policy.md` — the umbrella compliance artifact.
