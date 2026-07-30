# DEPLOY RUNBOOK — Phased release order + rollback quick-reference

> Companion to `docs/runbooks/migration-runbook.md` (THE PROCEDURE, step 6):
> "Every migration MUST have a stated rollback before it is applied. The
> authoritative per-change rollback table is in `deploy-prep/deploy-runbook.md`
> → ROLLBACK QUICK-REFERENCE. Do not invent a second one; add new rows here."
>
> This file did not exist yet as of 2026-07-30 — several already-authored
> migrations point to it (`docs/runbooks/migration-runbook.md`'s "GO / NO-GO,
> ROLLBACK" section, and its "ORDERED PART-0 MIGRATION LIST" for 057–062)
> without it having been created. This first version seeds the table with the
> two migrations verified in the 2026-07-30 tenant-profile/activation-automation
> session (`20260730004424_tenant_profile_gaps.sql`,
> `20260730032023_activation_automation_extras.sql`) — the only two rollback
> plans actually re-verified against a live Postgres this session.
>
> **Not yet backfilled**: the Part-0 migrations referenced in
> `docs/runbooks/migration-runbook.md`'s ordered list (057_unfreeze, 058, 059,
> 060, 061, 062) and the historical RLS-gap-closure / dedup-constraint
> migrations found during the 2026-07-30 unapplied-migrations audit (see that
> audit for the full list). Add their rows here when each is next touched —
> don't re-derive them from scratch; the rollback SQL is already written in
> each migration file's own trailing `-- ROLLBACK:` comment block.

---

## GO / NO-GO

No phase in this table has been given a Jeff go as of this writing. Every row
below is **GATED** — authored/verified as a file only. Applying any of it
(`supabase db push` or equivalent) requires Jeff's explicit, per-migration
approval, per `docs/runbooks/migration-runbook.md`.

---

## ROLLBACK QUICK-REFERENCE

| Migration | What it does | Rollback SQL | Reversible? |
|---|---|---|---|
| `supabase/migrations/20260730004424_tenant_profile_gaps.sql` | Adds 12 nullable/optional columns to `tenants` (contract/lifecycle, account ownership, secondary contact, payout-method label, onboarding-link version); creates `tenant_locations` and `tenant_notes` tables (RLS enabled, no policies); seeds one primary `tenant_locations` row per existing tenant from its current address/zip/phone. | `DROP TABLE IF EXISTS tenant_notes;`<br>`DROP TABLE IF EXISTS tenant_locations;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS onboarding_link_version;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS payout_method;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS secondary_contact_phone;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS secondary_contact_email;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS secondary_contact_name;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS acquisition_channel;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS account_owner;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS cancellation_reason;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS cancelled_at;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS trial_ends_at;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS contract_term_months;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS contract_signed_at;` | Yes — verified 2026-07-30 against a local Postgres seeded with a stand-in tenant set (including a "NYC Maid" row). Full rollback ran clean and returned the schema to its pre-migration state. All drops are additive-only reversals; no data outside the 2 new tables/12 new columns is touched. |
| `supabase/migrations/20260730032023_activation_automation_extras.sql` | Adds 3 nullable columns to `tenants`: `activated_at`, `activation_health_snapshot` (jsonb), `onboarding_nudge_sent_at`. No new tables, no backfill, no constraints. | `ALTER TABLE tenants DROP COLUMN IF EXISTS onboarding_nudge_sent_at;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS activation_health_snapshot;`<br>`ALTER TABLE tenants DROP COLUMN IF EXISTS activated_at;` | Yes — verified 2026-07-30 the same way. Ran clean, no dependent objects. |

---

## Notes

- Both migrations above are idempotent (double-applied against a throwaway
  Postgres container with no errors, all statements became no-ops on the
  second run) and additive-only — no existing row in any tenant's data,
  including NYC Maid, is modified or deleted by either one.
- Neither migration has been applied to prod as of 2026-07-30. Migration 1
  (`tenant_profile_gaps`) shipped to `main` via PR #64 (merged); migration 2
  (`activation_automation_extras`) is part of open PR #65.
