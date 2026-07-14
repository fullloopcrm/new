# Rollback Notes — Per Migration / Deploy Wave

_Status: DEPLOY-PREP REFERENCE. Docs only — nothing here executes anything.
No DDL runs from this lane; every rollback script quoted below is copied
read-only from the migration file that already contains it._
_Owner: platform on-call / leader. Authored: 2026-07-12 (W4, branch `p1-w4`)._

## ⚠️ Source-of-truth caveat (read first)

Two files are meant to be the **canonical** rollback references and, as of
this writing, **neither exists on `p1-w4`**:

- `deploy-prep/deploy-runbook.md` (owner p1-w3) — per-phase Go/No-Go +
  rollback for the Part-0 A/B/C/D release.
- `deploy-prep/rollback-plan.md` (referenced by both
  `platform/docs/runbooks/incident-response.md` and this file's sibling docs)
  — canonical rollback-procedure home.

Until those land, the best available deploy-wave rollback source is the
**Rollback pointer** section of each incident card in
`platform/docs/runbooks/incident-response.md` (authored this session, same
branch). This file does **not** re-derive that content from scratch — it
cites it and adds the **migration-level** rollback detail that document
doesn't cover (per-file reversibility, backfill dependencies, destructive
scripts already embedded in migrations).

---

## Part 1 — Deploy-wave rollback (Phase A/B/C/D)

The Part-0 release ships in four watched phases. Full detail, detection
signals, and escalation live in `incident-response.md`; this is the rollback
column only, reproduced for a single-file reference:

| Phase | What it ships | Reversal |
|---|---|---|
| **A** | Low-risk, non-behavioral: migrations, RLS enable commit | Revert the commit; data migrations are additive — **see Part 2 below for which specific migrations in this phase are NOT purely additive** (tenant_id backfill, NOT NULL columns) |
| **B** | Resolver flip — `tenant_domains` becomes source of truth + `TENANT_DIVERGENCE` assert-guard | Revert the resolver deploy — fallback prefers `tenants.domain`, so revert restores prior behavior |
| **C** | Auth-behavior: `owner_phone` gating, OTP/PIN lockout, full Telnyx voice verify | Revert the Phase C deploy; `owner_phone` backfill data stays (backfill is additive, safe to leave in place) |
| **D** | Webhook idempotency: Telegram secret + re-register, journal dedup | Fix registration/secret first (not a rollback); revert the deploy only if re-registration doesn't restore delivery |

**Mechanical rollback tool, all phases:** Vercel instant rollback (promote
last known-good deployment) is faster than a git revert and is the documented
first move for a platform-wide 5xx — see
`dependency-ledger.md` §6 and `incident-response.md` card #1.

**Phase B has the sharpest edge:** the `TENANT_DIVERGENCE` guard
(`platform/src/lib/migrations/057_unfreeze_tenants_domain.sql` — **not present
on `p1-w4`**, lives on `p1-w2` per `ee8943a`) fails closed (throws rather than
serves) when `tenant_domains` and `tenants.domain` disagree for a host. That
is correct behavior, not a bug to route around — see `incident-response.md`
card #6 before touching a diverging host.

---

## Part 2 — Migration-level reversibility

Two migration trees exist in this repo and neither has an automated
down-migration / rollback runner (`grep` for a migration-runner script during
this pass found none — see `dependency-ledger.md` §8-style caveat: absence of
a tool is stated, not assumed away):

- `platform/migrations/*.sql` — date-named, ~38 files
- `platform/src/lib/migrations/*.sql` — sequence-numbered (004–062) plus a
  handful of date-named files, ~76 files total

**Rollback model for both trees, by default:** additive SQL (`create table if
not exists`, `add column`) is safe to leave in place after a code revert —
unused columns/tables don't break anything, so "rollback" for the vast
majority of these migrations means **revert the app code, leave the schema
alone**. The exceptions below are where that default breaks down.

### 2a. Migrations with genuinely destructive/irreversible characteristics

| Migration | Risk | Rollback status |
|---|---|---|
| `migrations/2026_05_09_tenant_id_core.sql` | Backfills `tenant_id` onto ~50 tables, **then a commented-out rollback script at the bottom does `ALTER TABLE ... DROP COLUMN tenant_id CASCADE`** across every one of those tables | **Has a pre-written rollback script already in the file** (lines ~149-173) — read it before running it, it's a CASCADE drop across ~50 tables, which will also drop any FK/index/view depending on that column. This is the single highest-blast-radius rollback script in the repo. Verify nothing downstream (views, RLS policies added in later migrations) depends on `tenant_id` before executing — later migrations (e.g. `046_rls_deny_on_new_tables.sql`) build RLS policies that likely reference tenant-scoped columns on some of these same tables; check for a dependency conflict before running the CASCADE drop, don't assume it's clean just because it's file-provided |
| `src/lib/migrations/022_domain_notes_unique.sql` | `RENAME COLUMN note TO notes` (idempotent guard on both directions) + `ALTER COLUMN notes DROP NOT NULL` | Rename is idempotent-guarded (checks column state before acting) so **re-running is safe**, but there is **no reverse-rename script** — reverting the app code without reverting the column name will break any code path still expecting `note`. Confirm no code on the target branch still reads `note` before treating this as revert-safe |
| Any migration matching the **NOT NULL** list below | Column made `NOT NULL` (either via `ADD COLUMN ... NOT NULL` with a default, or `ALTER COLUMN ... SET NOT NULL` after a backfill) | Reverting the **app code** that populates the column does not undo the constraint — new inserts from reverted code that don't set the column will start failing at the DB layer with a constraint violation, which surfaces as a 500, not a clean rollback. **Before reverting app code that touches these tables, confirm the reverted code path still supplies a value for the NOT NULL column**, or the constraint itself needs a companion migration to relax it |

**Migrations with a NOT NULL addition/tightening** (grepped this session,
`ADD COLUMN ... NOT NULL` or `ALTER COLUMN ... SET NOT NULL`):

- `migrations/2026_05_09_tenant_id_core.sql`
- `migrations/2026_05_19_ratings_team_bookings.sql`
- `migrations/2026_07_03_catalog.sql`, `2026_07_03_catalog_v2.sql`, `2026_07_03_catalog_sku_fields.sql`
- `migrations/2026_07_03_quote_deposit.sql`
- `migrations/2026_07_03_sales_pipeline_unify.sql`
- `migrations/2026_07_08_tenant_notification_preferences.sql`
- `src/lib/migrations/029_pipeline.sql`, `030_finance.sql`, `036_cpa_retry.sql`, `037_leads_qualification.sql`, `044_legacy_seo_gate.sql`, `050_nycmaid_parity_2026_04_29.sql`
- `src/lib/migrations/2026_07_02_job_payment_triggers.sql`, `2026_07_05_seo_autopilot.sql`

Each of these needs the same check before its owning deploy wave is reverted:
does the pre-revert app code still populate that column on every write path
it touches? Not individually verified in this pass — flagged as a checklist,
not resolved.

### 2b. RLS migration — reversible but changes fail-mode, not just data

`src/lib/migrations/046_rls_deny_on_new_tables.sql` enables RLS with
deny-all policies on `impersonation_events`, `portal_auth_codes`,
`verification_codes`, `tenant_domains`. Per the migration's own comment,
**service-role callers (which is nearly all of this app) bypass RLS, so this
is currently a no-op for every real request path.** Rollback (disabling RLS
or dropping the policies) is mechanically trivial and low-risk **today**
specifically because nothing depends on it yet — re-verify this note if any
future route migrates to a user-scoped JWT, at which point disabling this
migration would newly matter (would start allowing broader reads, not just
be a no-op revert).

### 2c. Trigger drops (`DROP TRIGGER IF EXISTS ... ; CREATE TRIGGER ...`)

The majority of `DROP` statements found in both migration trees (~35
instances) are `DROP TRIGGER IF EXISTS` immediately followed by
`CREATE TRIGGER` — this is the standard idempotent "replace trigger" pattern,
not a destructive drop. `IF EXISTS` means these are safe to re-run and don't
need a rollback script — the trigger is simply redefined, not removed
without replacement. Flagged here only so a future reader doesn't mistake the
DROP-count in this repo for destructive-migration-count; nearly all of it is
this pattern.

### 2d. Migration ordering hazard (not a rollback issue, but adjacent)

`src/lib/migrations/` has **two files sharing sequence number 050**
(`050_nycmaid_parity_2026_04_29.sql` and `050_tenant_stripe_pay_link.sql`).
If migrations are applied by filename sort rather than a tracked-applied-set,
confirm both actually ran — a naming collision like this is exactly the kind
of thing that causes "I thought migration 050 ran, but only one of the two
files with that number did." Not verified from this lane whether the
migration runner dedupes by full filename or by leading number; flagged as a
question, not resolved.

---

## Part 3 — What "rollback" means for the two migration trees generally

There is **no automated down-migration mechanism** in this codebase — no
`.down.sql` files, no migration-runner rollback command found in
`package.json` scripts (`platform/package.json` has no `migrate:down` or
equivalent). Practically, "rollback a migration" here means one of:

1. **Do nothing** — the migration was additive and the reverted app code
   simply doesn't reference the new column/table. This covers the large
   majority of the ~114 migration files across both trees.
2. **Hand-write and run a reverse migration** — for the destructive/NOT-NULL
   cases in Part 2, someone writes and runs the inverse SQL. `tenant_id_core`
   is the one case where that inverse script already exists in-file.
3. **Vercel instant rollback for the app layer** (Part 1) — this reverts code
   instantly but **never touches the database**; any migration that already
   ran stays applied regardless of app-layer rollback. This is the most
   common blind spot: reverting the deploy does not revert the schema.

---

## What I verified vs. did not

- **Verified (static, this working tree, this session):** every migration
  filename and grep result cited above (`DROP`, `NOT NULL`, `RENAME` patterns
  across both migration directories); the exact rollback script embedded in
  `2026_05_09_tenant_id_core.sql`; the RLS-is-currently-a-no-op comment in
  `046_rls_deny_on_new_tables.sql`; the duplicate-050 filename collision;
  absence of a `migrate:down`-style script in `platform/package.json`; the
  Phase A/B/C/D rollback table as it exists in `incident-response.md` this
  session.
- **Did NOT verify:** whether the NOT-NULL columns listed in §2a actually
  have a code path that would break on revert (flagged as a checklist per
  migration, not resolved one-by-one); whether the migration runner applies
  files by tracked-migration-id or by directory listing (relevant to the
  duplicate-050 hazard); whether `057_unfreeze_tenants_domain.sql` and its
  Phase B guard behave as described here once merged onto `p1-w4` (that file
  does not exist on this branch — description is carried over from
  `incident-response.md`'s citation, not independently re-derived); and
  whether `deploy-runbook.md` / `rollback-plan.md` have landed on any branch
  since this was written — check for those files directly before trusting
  this document over them.
