# Schema drift register — column names in use vs. the authoritative source

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Register only — no schema changed, no DB read.**
Every "authoritative" claim below cites a migration `file:line`, or explicitly flags a field
whose authority lives **only in prod / nycmaid legacy** (no in-repo definition)._

## Why this file exists

Across the RLS/backfill/retention prep I kept hitting the same class of problem: **a column
referenced in application code that does not match — or does not exist in — the migration that
defines the table.** Two failure shapes:

1. **Name drift** — two call sites query the same table with different column names; only one is
   the migration-defined column. The other silently reads `undefined` (or errors, if the column
   truly doesn't exist in prod).
2. **Authority gap** — the table has **no** `CREATE TABLE` anywhere in the repo (only `ALTER …
   ADD tenant_id`); its base columns exist solely in the live/legacy DB, so every column is
   *inferred from query usage*, not verified.

This register fixes the authoritative name/source per contested field so downstream work
(RLS predicates, backfill, retention, GDPR export) stops re-guessing. It resolves nothing in the
DB; it records the truth as the migrations state it.

## Legend

| Disposition | Meaning |
|---|---|
| **CANONICAL** | Migration-defined; this is the name to use. |
| **PHANTOM** | Referenced in code but **not** defined by any migration on this table → suspect bug or out-of-band prod column. |
| **PROD-ONLY** | No in-repo `CREATE TABLE`; authority is the live/legacy DB. Column inferred from usage — **confirm against prod before relying on it.** |

## `clients` — two contested fields

| Field in use | Where used | Disposition | Authoritative source |
|---|---|---|---|
| `active` (boolean) | `cron/retention/route.ts:41`, site `_lib/smart-schedule.ts:59`, +many | **CANONICAL** | `platform/src/lib/migrations/009_nycmaid_parity_columns.sql:5` — `add column if not exists active boolean default true` |
| `status` (on `clients`) | — (belief only) | **PHANTOM** | `clients` has **no** `status` column. `status` is a real column on **other** tables (`tenants`, `bookings`, `sales_applications`). Client lifecycle on `clients` = `active` (boolean) + `outreach_status` (text). Do not `.eq('status', …)` on `clients`. |
| `outreach_status` (text) | client outreach paths | **CANONICAL** | `platform/src/lib/migrations/013_full_parity.sql:18` — `ADD COLUMN IF NOT EXISTS outreach_status TEXT` |
| `sms_consent` (boolean) | `cron/retention/route.ts:42`, +consent checks | **CANONICAL** | `platform/src/lib/migrations/007_missing_tables.sql:206` **and** `013_full_parity.sql:16` — `ADD COLUMN … sms_consent boolean DEFAULT true` |
| `sms_opt_in` (on `clients`) | `api/admin/send-apology-batch/route.ts:38,56` (`select('… sms_opt_in')`, `if (c.sms_opt_in === false)`) | **PHANTOM** | No migration adds `clients.sms_opt_in`. Authoritative consent column is **`sms_consent`**. As written, `send-apology-batch` selects a column that isn't migration-defined → `c.sms_opt_in` is `undefined`, the `=== false` opt-out skip never fires, and **opted-out clients would be texted.** Fix to `sms_consent` (invert sense: skip when `sms_consent === false`), or confirm the column exists out-of-band in prod first. |

> **Not a column — do not conflate.** `sms_opt_in` *also* appears as a notification **type
> string**, not a `clients` column: `platform/src/lib/notify.ts:42` (union member) and
> `api/webhooks/telnyx/route.ts:230` (`type: 'sms_opt_in'`). Those are correct as-is.

## `cleaner_payouts` — PROD-ONLY (no in-repo table definition)

No `CREATE TABLE cleaner_payouts` exists in `platform/migrations` or
`platform/src/lib/migrations`. The only in-repo reference is the tenant_id backfill list in
`platform/migrations/2026_05_09_tenant_id_core.sql:39`. **Base schema lives in prod / nycmaid
legacy.** Columns below are inferred from query usage, not verified:

| Field | Evidence (usage) | Disposition |
|---|---|---|
| `id` | `.eq('id', …)` | **PROD-ONLY** (confirm) |
| `tenant_id` | added by `2026_05_09_tenant_id_core.sql` | **CANONICAL** (the add), base table PROD-ONLY |
| `amount` | `select('amount, status, cleaner_id, cleaners(name)')` | **PROD-ONLY** (confirm) |
| `status` | `select('… status …')`, `.eq('status', …)` | **PROD-ONLY** (confirm; note this table *does* use `status`, unlike `clients`) |
| `cleaner_id` (FK → `cleaners`) | `.eq('cleaner_id', …)`, embed `cleaners(name)` | **PROD-ONLY** (confirm) |

**Action before RLS/backfill relies on this table:** dump the live schema
(`\d public.cleaner_payouts`) and promote confirmed columns to CANONICAL, or add a real
`CREATE TABLE` migration so the repo is the source of truth.

## `cleaners` — PROD-ONLY (no in-repo table definition)

Same shape: no `CREATE TABLE cleaners`. Only `ALTER … ADD COLUMN` migrations touch it
(`011_parity_with_nycmaid.sql`, `013_full_parity.sql`) plus the tenant_id backfill
(`2026_05_09_tenant_id_core.sql:39`). Base schema is prod/legacy.

| Field | Evidence | Disposition |
|---|---|---|
| `id`, `tenant_id` | tenant_id add + FK target of `cleaner_payouts.cleaner_id` | tenant_id **CANONICAL**; base PROD-ONLY |
| `name` | embed `cleaners(name)` in payout query | **PROD-ONLY** (confirm) |
| `sms_consent` (boolean) | `011_parity_with_nycmaid.sql:23` adds `sms_consent` to `team_members`; presence on `cleaners` is **inferred** | **PROD-ONLY** (confirm — the migration adds it to `team_members`, not verifiably `cleaners`) |

**Same action:** dump `\d public.cleaners`; promote or codify.

## `sales_applications` — CANONICAL anchor (contrast case)

Included as the counter-example: this table **does** have an authoritative in-repo definition, so
none of its columns are guesswork. Use it as the pattern the two PROD-ONLY tables above should
reach.

Authoritative: `platform/src/lib/migrations/2026_07_02_sales_applications.sql:5`. Full column
set (all CANONICAL): `id`, `tenant_id` (NOT NULL, FK `tenants` ON DELETE CASCADE), `name`,
`email`, `phone`, `location`, `lane`, `sales_background`, `target_segments` (text[]),
`warm_intros`, `bilingual`, `why`, `referral_source`, `linkedin_url`, `video_url` (NOT NULL),
`notes`, `status` (NOT NULL DEFAULT `'pending'`; values `pending|approved|rejected`),
`created_at`, `reviewed_at`.

## Summary of dispositions

| Table.field | Verdict |
|---|---|
| `clients.active` | CANONICAL — use it (009) |
| `clients.status` | PHANTOM — does not exist; use `active` / `outreach_status` |
| `clients.sms_consent` | CANONICAL — use it (007/013) |
| `clients.sms_opt_in` | PHANTOM as a column — real bug in `send-apology-batch`; use `sms_consent` |
| `cleaner_payouts.*` | PROD-ONLY — confirm live, no in-repo CREATE TABLE |
| `cleaners.*` | PROD-ONLY — confirm live, no in-repo CREATE TABLE |
| `sales_applications.*` | CANONICAL — authoritative anchor (2026_07_02) |

## Method & limitation

Authoritative claims are **migration-derived**, not read from the live DB. A migration that never
applied, or an out-of-band `ALTER` run directly in prod, would make a **PHANTOM** actually exist
in prod (or a **CANONICAL** actually absent). The two **PROD-ONLY** tables are the honest edge:
the repo genuinely does not define them, so only `\d <table>` against prod closes the gap.
Confirm each contested field against the live schema before any RLS predicate, backfill, or
retention job depends on it.
