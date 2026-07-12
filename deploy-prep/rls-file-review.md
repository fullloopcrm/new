# RLS Migration File Review — `2026_07_11_rls_tenant_tables.sql`

**Author:** W1 (schema + backfill lane)
**Date:** 2026-07-12
**Scope:** `src/lib/migrations/2026_07_11_rls_tenant_tables.sql` (132-ish-table RLS migration)
and its companion `2026_07_11_rls_tenant_tables_verify.sql`. Doc-only review — no DB command
run, no file edited.

**Question asked:** does every tenant-scoped table get a `tenant_id` policy, and is deny-all
correctly kept on `verification_codes` / `portal_auth_codes` / `impersonation_events`?

**Short answer:** Yes to both — the migration is internally consistent and safe to apply as
written. I found one stale-count / incomplete-enumeration issue in the file's own header
comments (cosmetic, does not affect the executed DDL) and confirmed the deny-all trio is
untouched by design.

---

## 1. Deny-all trio — VERIFIED correct

`verification_codes`, `portal_auth_codes`, `impersonation_events` all carry `tenant_id` (they
are present in `scripts/audit-tenant-scope.mjs`'s `TENANT_TABLES`), but are **absent** from
the migration's `tenant_tables` array (the actual `DO $$` loop input) — confirmed by diff:

```
comm -23 <(sorted audit TENANT_TABLES) <(sorted migration array) →
  impersonation_events
  portal_auth_codes
  verification_codes
```

The migration's DO block never references these three table names at all (no DROP POLICY,
no ALTER TABLE) — it only explicitly drops a policy on `tenant_domains` (its own deny-all
retirement, sanctioned by 046's comment). So the deny-all trio's `USING(false)` policy is
left completely untouched, exactly as the file's "EXCLUDED — DELIBERATELY KEPT DENY-ALL"
section promises.

The companion `_verify.sql` (Part A) independently re-derives "every table with a `tenant_id`
column" from `information_schema` at verify-time — it does **not** hardcode a table count, so
even if the tenant_id-table universe grows before this runs, the verify script still catches
any table (deny-all trio excepted) that's RLS-on without a `tenant_isolation` policy, or RLS-
off entirely. This is the right design: correctness doesn't depend on the header comment's
table count being accurate.

## 2. Every tenant-scoped table gets a policy — VERIFIED, with one accounting caveat

I extracted three lists and diffed them:
- **`audit_list`** — `scripts/audit-tenant-scope.mjs`'s `TENANT_TABLES` Set (135 entries today).
- **`array_list`** — the migration's actual `tenant_tables text[]` array in the `DO $$` block (135 entries, no duplicates).
- **`header_list`** — the human-readable table list in the file's own top-of-file comment (132 entries).

```
audit_list  − array_list  = { impersonation_events, portal_auth_codes, verification_codes }
array_list  − audit_list  = { resale_assets, tenant_health, year_end_runs }
array_list  − header_list = { cleaner_broadcasts, cleaner_broadcast_recipients, google_posts }
```

Both diffs are **expected and already documented** in the file:
- The 3 deny-all tables are correctly excluded (§1).
- `resale_assets` / `tenant_health` / `year_end_runs` already got `tenant_isolation` (USING-only)
  from `2026_07_11_enable_rls_gap_tables.sql`; this migration re-emits them to add the
  `WITH CHECK` clause — the file's own NOTE says exactly this.

**Caveat (cosmetic, not a correctness bug):** the file's header claims "TABLES GETTING
`tenant_isolation` (135)" but the visible bulleted list under that heading only enumerates
132 names — `cleaner_broadcasts`, `cleaner_broadcast_recipients`, `google_posts` are missing
from that specific list (they're covered separately, further down, in the "NOTE
cleaner_broadcasts / … / google_posts" paragraph, and they ARE present in the actual
`tenant_tables` array that the DO block executes). Anyone skimming just the top summary block
would undercount by 3. No DDL impact — the executed array is correct — but worth a follow-up
doc tidy so the "(135)" heading and its own list agree.

**Second, smaller drift:** the file's provenance comment says
`scripts/audit-tenant-scope.mjs → TENANT_TABLES … 132 tables`, but that Set currently has 135
entries (confirmed via `node -e` parse of the file, not a text-count guess) — it already
includes the 3 migration-008 tables (`cleaner_broadcasts`, `cleaner_broadcast_recipients`,
`google_posts`) per the "DONE (companion change)" note earlier in the same file, which was
in fact already applied. So "132" describes `TENANT_TABLES`'s state *before* that companion
change landed, not its current state. The migration's final math (129 + 3 + 3 = 135) still
lands on the right total array length (verified: 135, no dupes) — this is a stale intermediate
number in the narrative, not a wrong final list.

**Net:** no table that should get `tenant_isolation` is missing from the executed array, and
no deny-all table is wrongly included. The two issues above are header-comment drift, not
DDL correctness bugs — flagging for a documentation touch-up, not blocking apply.

## 3. Idempotency / safety checks — VERIFIED

- `ENABLE ROW LEVEL SECURITY` is a no-op if already on; every `CREATE POLICY` is preceded by
  `DROP POLICY IF EXISTS` — safe to re-run.
- Each table is guarded by `to_regclass()` (table must exist) **and** an
  `information_schema.columns` check (table must actually carry `tenant_id`) — a stale or
  wrong name in the array is skipped with `RAISE NOTICE`, never an error. Confirmed both
  guards are evaluated per-table inside the `FOREACH` loop before any `ALTER`/`CREATE`.
- `tenant_domains`'s deny-all drop is scoped behind its own `to_regclass` check, independent
  of the main loop.

## 4. What I did not check (out of scope for a file review)

- Did not run this against a live/staging DB (leader applies after Jeff approves, per
  standing rules).
- Did not independently re-derive "every table with `tenant_id` in the live schema" from a
  full `pg_dump`/schema export — `supabase/schema.sql` in this repo is a partial 12-table
  stub, not a full dump, so it's not usable as a third independent source. `audit-tenant-scope.mjs`'s
  `TENANT_TABLES` is the closest thing to ground truth available in this worktree, and per
  its own comment is manually maintained ("auto-derived" in the comment, but not regenerated
  by tooling) — if it has drifted from the live DB schema, this migration would inherit that
  drift. The dynamic verify script (Part A) is the actual backstop for that risk, since it
  queries `information_schema` directly rather than trusting any hardcoded list.

## Recommendation

Safe to apply as-is. Optional follow-up (not blocking): fold the 3 migration-008 table names
into the header's visible "(135)" list, and update the "132 tables" provenance line to
reflect the current 135-entry `TENANT_TABLES`, so the narrative and the executed array read
consistently at a glance.
