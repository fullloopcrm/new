# Tenant Data Retention Map — retention window per data type

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Docs only — no DDL run, no prod changes, no data read.** Proposed windows are a policy draft for Jeff, not implemented behavior._

## What this is

A per-data-type retention map: how long each category of tenant data is kept today (**mostly:
forever**), and a **proposed** retention window to make the P1/P2 GDPR/erasure work enforceable.
It pairs with `deploy-prep/compliance-data-map.md` (what data exists / how sensitive) — this doc
adds the **time** axis: keep, anonymize, or delete, and after how long.

## ⚠️ The honest current-state finding (read first)

**Almost nothing is deleted. There is no general data-retention or erasure mechanism.** Verified
2026-07-12 against `platform/src/app/api/cron/*` and the migrations:

1. **The one real data-lifecycle deletion:** `cron/cleanup-videos/route.ts` deletes booking
   **walkthrough / final video files** from Supabase Storage **30 days after upload** — *unless* the
   booking's `notes` contains the literal string `[DISPUTE]` (then kept). It nulls the URL columns
   on `bookings`; it does **not** delete the booking row. That is the entire implemented retention
   surface.
2. **`cron/retention/route.ts` is NOT data retention.** Despite the name, it is a **marketing
   win-back**: it SMSes lapsed clients (last completed booking 30–90 days ago, no upcoming, ≤3
   texts). It deletes nothing. **Naming collision — do not mistake it for a purge job.**
3. **The rate-limit purge is commented out.** `014_security_hardening.sql` contains
   `-- DELETE FROM rate_limit_events WHERE happened_at < now() - interval '2 hours';` — commented,
   so not active.
4. **Ephemeral auth tables have `expires_at` but no confirmed purge cron:**
   `verification_codes`, `oauth_state_nonces`, `portal_auth_codes`, `member_pin_reset_codes`,
   `cpa_access_tokens`. They *expire logically* (checked at use) but rows appear to accumulate.
5. **Everything else — customer records, messages, invoices, ledger, applications, HR docs, AI
   memory, audit/security logs — is retained indefinitely.** No TTL, no archival, no anonymization.

So the current effective policy is **"retain everything forever, except job videos (30d)."** The
table below is the **proposed** target state; adopting any of it is a Jeff decision.

## Method & limitation

- Current-state column/behavior claims are read from code + migrations, **not a live DB read**.
- **Proposed windows are a draft, not a legal determination.** Real retention obligations depend on
  jurisdiction, the tenant↔platform data-controller/processor split, and tax/employment law
  (financial and payroll records typically have *statutory minimum* retention that **overrides**
  erasure — you cannot delete them on request; you anonymize the personal fields and keep the record).

## Retention disposition legend

| Disposition | Meaning |
|---|---|
| **DELETE** | Hard-delete the row/object after the window. |
| **ANONYMIZE** | Keep the row (referential/statutory need) but strip/replace P0/P1 fields. |
| **KEEP (statutory)** | Retain for a legal minimum; personal fields anonymized on erasure request, record kept. |
| **KEEP (active)** | Retain while the relationship is active; window starts at inactivity/close. |
| **PURGE (short)** | Ephemeral; delete on a short cycle (hours–days). |

---

## Proposed retention windows by data type

### Customer (end-client) data

| Data type | Tables | Current | Proposed window | Disposition |
|---|---|---|---|---|
| Client identity | `clients` | forever | Active + **24 mo** after last booking, then on erasure request | ANONYMIZE (keep for finance FK) |
| Bookings + job detail | `bookings`, `booking_notes`, `booking_cleaners` | forever (videos 30d) | **7 yr** (tax-linked via invoices) | KEEP (statutory), ANONYMIZE personal fields on erasure |
| Job videos | `bookings.*_video_url` (Storage) | **30 d (implemented)** | keep 30 d (align); **exempt if `[DISPUTE]`** | DELETE ✅ already |
| SMS conversations + bodies | `sms_conversations`, `sms_conversation_messages`, `client_sms_messages`, `sms_logs` | forever | **12–24 mo** rolling | DELETE (or ANONYMIZE phone) |
| Marketing outreach log | `outreach_log`, `campaign_recipients`, `email_logs` | forever | **12 mo** | DELETE |
| Reviews / ratings | `reviews`, `google_reviews`, `client_reviews`, `ratings` | forever | keep (business record); ANONYMIZE author on erasure | ANONYMIZE |
| E-sign documents | `documents`, `document_signers`, `document_fields`, `document_activity` | forever | **7 yr** (signed legal record) | KEEP (statutory) — signature/IP are the record; do not delete pre-window |

### Financial / bookkeeping data

| Data type | Tables | Current | Proposed window | Disposition |
|---|---|---|---|---|
| Invoices + activity | `invoices`, `invoice_activity`, `quotes`, `quote_activity` | forever | **7 yr** | KEEP (statutory), ANONYMIZE contact fields on erasure |
| Payments | `payments`, `job_payments`, `unmatched_payments` | forever | **7 yr** | KEEP (statutory) |
| Ledger + bank | `journal_entries`, `journal_lines`, `bank_accounts`, `bank_transactions`, `bank_statements`, `bank_import_batches` | forever | **7 yr** | KEEP (statutory); counterparty names anonymized only if not tax-relevant |
| CPA access tokens | `cpa_access_tokens` | forever | **PURGE** on `revoked_at`/`expires_at` + 30 d | DELETE |

### Worker / staff / HR data

| Data type | Tables | Current | Proposed window | Disposition |
|---|---|---|---|---|
| Worker identity | `team_members`, `cleaners`, `crews` | forever | Active + **statutory employment window** after offboarding | KEEP (statutory) then ANONYMIZE |
| Payroll / payouts | `payroll_payments`, `cleaner_payouts`, `team_member_payouts` | forever | **7 yr** (payroll statutory) | KEEP (statutory) |
| HR documents | `hr_documents`, `hr_employee_profiles`, `hr_notes`, `hr_document_*` | forever | per employment law; often **7 yr** post-termination | KEEP (statutory) |
| PINs / reset codes | `team_members.pin`, `member_pin_reset_codes` | forever | reset codes **PURGE** after use/expiry | DELETE (codes); rotate PIN on offboard |

### Applicant / lead data

| Data type | Tables | Current | Proposed window | Disposition |
|---|---|---|---|---|
| Applications (hired) | `*_applications` where converted | forever | fold into HR retention | KEEP (statutory) |
| Applications (not hired) | `management_applications`, `team_applications`, `cleaner_applications`, `sales_applications`, drafts | forever | **6–12 mo** then delete | DELETE (incl. `resume_url`/`photo_url`/`video_url` in Storage) |
| Leads / waitlist / prospects | `leads` (platform), `portal_leads`, `waitlist`, `prospects`, `lead_clicks` | forever | **12–24 mo** if uncontacted | DELETE |

### Communications (COMHUB / Connect / AI)

| Data type | Tables | Current | Proposed window | Disposition |
|---|---|---|---|---|
| COMHUB / Connect messages + calls | `comhub_*`, `connect_*` | forever | **12–24 mo** rolling | DELETE (or ANONYMIZE contact) |
| AI assistant memory/logs | `yinez_memory`, `selena_memory`, `ai_chat_logs` | forever | **6–12 mo** | DELETE — highest risk of stale quoted PII |

### System / security / audit / ephemeral

| Data type | Tables | Current | Proposed window | Disposition |
|---|---|---|---|---|
| Security events | `security_events` | forever | **12–24 mo** | DELETE |
| Audit trails | `audit_logs`, `audit_log`, `impersonation_events`, `tenant_write_events` (P9) | forever | **24 mo** min (longer for security value) | KEEP then DELETE — audit logs are a compliance asset; retain deliberately |
| Error logs | `error_logs` | forever | **90 d** | DELETE — can carry PII in payloads |
| Web analytics | `website_visits`, `lead_clicks`, `travel_time_cache` | forever | **90 d** (visits), cache: short | DELETE |
| Ephemeral auth | `verification_codes`, `oauth_state_nonces`, `portal_auth_codes` | forever (logical expiry only) | **PURGE** hourly/daily past `expires_at` | DELETE (short) |

---

## Interaction with erasure (why retention ≠ "delete on request")

1. **Statutory records win over erasure.** Financial, payroll, and signed legal documents generally
   **must** be retained for their statutory minimum even after a data-subject erasure request. The
   correct action there is **ANONYMIZE the personal fields in place** (name/email/phone/address →
   redacted/tombstone), keeping the record's integrity — not `DELETE`. The data map's
   hard-delete-vs-anonymize note per FK feeds this.
2. **Window start events differ.** "24 mo after last booking" needs a computed last-activity date;
   "7 yr" for invoices starts at issue date; ephemeral windows start at `expires_at`. Any
   implemented purge must compute the right anchor per table (the video cron already does:
   `*_uploaded_at < now() - 30d`).
3. **The `[DISPUTE]` exemption pattern is worth generalizing.** The video cron already suspends
   deletion when a job is disputed. A legal-hold flag should suspend retention deletion for any
   record under dispute/litigation before a general purge is enabled.

## Suggested implementation path (not part of this doc — for Jeff/leader)

- **Phase A (safe, no data loss):** add `expires_at`-driven **PURGE** crons for the ephemeral auth
  tables and a `90 d` error-log purge. These delete only expired/low-value rows.
- **Phase B:** a per-tenant, per-category retention config + a daily retention cron that
  ANONYMIZEs/DELETEs per the windows above, honoring a legal-hold flag. Model the loop on the
  existing `cron/cleanup-videos` (per-tenant scan, skip-on-flag, batch).
- **Phase C:** wire retention into the erasure endpoint so a data-subject request applies the
  ANONYMIZE-vs-DELETE disposition per table automatically.

Each phase is a cron/route change (app-level), **not** a prod DDL — but any destructive purge is a
gated action Jeff approves before it runs against prod data.

## Cross-links

- `deploy-prep/compliance-data-map.md` — what data each table holds + FK erasure behavior.
- `deploy-prep/credential-rotation-policy.md` — rotation cadence for the secrets called out here.
- `platform/docs/compliance/security-policy.md` — umbrella compliance artifact.
