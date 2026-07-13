# Schema bootstrap sources — reconciliation note (FOR-JEFF-REVIEW, docs only)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** read-only investigation. No DB commands run, no files outside `deploy-prep/` touched.

**Follows up on:** `rpc-security-definer-review.md` §4c item 2, which flagged "two parallel,
unreconciled migrations trees" as an open process question this worker couldn't resolve without
digging further. This note digs further.

---

## Finding: there are three schema sources, not two, and nothing in the repo applies all three

1. **`platform/supabase/schema.sql`** (308 lines, last touched 2026-03-11, commit `fcdf21e8`) — a
   one-time foundation bootstrap. Plain `CREATE TABLE` statements (no `IF NOT EXISTS`), meaning it is
   meant to run exactly once against a genuinely empty database. Defines 12 base tables: `tenants`,
   `tenant_members`, `service_types`, `clients`, `team_members`, `bookings`, `recurring_schedules`,
   `notifications`, `reviews`, `campaigns`, `referrals`, `domains`.
2. **`platform/src/lib/migrations/*.sql`** — the numbered sequence (`004_...` through `050_...` and
   beyond), 74 commits, most recently touched 2026-07-12. Referenced by name in
   `platform/NYCMAID-CUTOVER-CHECKLIST.md` ("Apply `src/lib/migrations/038_audit_trigger_fix.sql` to
   prod") — this is the only place in the repo that documents a migration as something a human actually
   ran against prod.
3. **`platform/migrations/*.sql`** — date-prefixed feature bundles (`2026_05_19_comhub.sql`,
   `2026_07_07_territory_system.sql`, etc.), 22 commits, most recently touched 2026-07-10 (older/slower
   cadence than tree 2, but not dead — it received a commit 2 days before this note).

**None of the three is referenced by any migration runner, deploy script, `package.json` script, or
Supabase CLI config** (`grep`'d for `psql`/`supabase db push`/migration-path strings across all
`.sh`/`.ts`/`.js`/`.json` in the repo — zero hits outside the two markdown files above). `platform/supabase/`
also contains a `.temp/cli-latest` file, meaning the Supabase CLI has been linked to a real project at
some point, but no `config.toml` and no committed migration-apply workflow.

## This is not just an inventory gap — there is a real cross-tree dependency

`grep -n "team_members" platform/migrations/2026_05_19_comhub.sql` shows `comhub_get_or_create_contact_by_phone`
(`comhub.sql:272`) does `SELECT id INTO v_team_member_id FROM team_members WHERE ...` — it reads a table
that **only exists in source (1)**, `platform/supabase/schema.sql:115`. Neither migrations tree (2 or 3)
ever creates `team_members` itself; both trees only add tables/columns that reference it
(`platform/src/lib/migrations/050_nycmaid_parity_2026_04_29.sql` and
`platform/migrations/2026_05_19_ratings_team_bookings.sql` both create `booking_team_members` with a
`REFERENCES team_members(id)` foreign key — near-duplicate definitions of the same junction table in
both trees, `public.`-qualified in one and not in the other, both guarded with
`CREATE TABLE IF NOT EXISTS` so re-running either is safe, but the duplication itself is evidence nobody
has fully reconciled the two trees against each other).

**Practical meaning:** reconstructing this schema from zero requires, in order: (1) `schema.sql` first
(defines `tenants`, `team_members`, `clients`, `bookings`, and 8 others that dozens of later migrations
in both trees assume exist), then (2) and (3) in some correct relative order that is not written down
anywhere. Running only tree 2, or only tree 3, or either tree without `schema.sql` first, produces a
database missing tables that live code depends on.

## Why this matters now, not just academically

- **`dr-drill-plan.md`** (this worker's own prior doc) proposes a PITR restore drill and a schema-diff
  check, but never mentions `schema.sql` or the two-tree split — it implicitly assumes "the migrations"
  is one linear thing. Flagging as an addendum to that doc (see companion change in this commit) rather
  than duplicating it here.
- **`successor-package-*` docs** cite `platform/supabase/schema.sql` as "the live schema" for sourcing
  sensitive-field inventories — it is stale (12 tables; the live app has 100+) and should not be treated
  as authoritative without this caveat attached.
- **A fresh environment (new Supabase project, disaster recovery, or a successor standing up their own
  copy) has no single command or doc to run** to get from empty to current schema. This worker cannot
  determine from the repo alone whether prod's actual DDL history matches any of the three sources
  exactly, or has drifted further via dashboard-applied changes (the same caveat
  `rpc-security-definer-review.md` already raised for the 2 undefined RPC functions).

## Recommendation (not applied — Jeff/leader decision)

1. Confirm with Jeff/whoever has Supabase dashboard access: is `platform/src/lib/migrations/` (tree 2)
   the one actually kept in sync with prod DDL history going forward? If yes, recommend `platform/migrations/`
   (tree 3) either gets folded into tree 2 as numbered files, or is explicitly marked "historical, already
   applied, do not add to" in a README so the split stops looking like active duplication.
2. Either commit a real `platform/supabase/schema.sql` refresh (a true `pg_dump --schema-only` of current
   prod, superseding the 2026-03-11 12-table stub) or delete it and note in the successor package that no
   from-scratch bootstrap script exists yet — a stale "foundation schema" that undersells the real table
   count is worse than admitting the gap.
3. Once (1) and (2) are settled, this is the input `dr-drill-plan.md`'s restore drill needs before it can
   actually attempt a from-zero reconstruction step, not just a PITR point-in-time restore of an existing
   project.

**Nothing wired, no migration run, no file outside `deploy-prep/` touched by this commit except the
addendum noted in `dr-drill-plan.md`.**
