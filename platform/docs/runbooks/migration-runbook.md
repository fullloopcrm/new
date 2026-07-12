# SAFE SCHEMA-MIGRATION RUNBOOK

**Reusable procedure for applying a DDL / data migration to the FullLoop prod
Postgres (Supabase project `cetnrttgtoajzjacfbhe`) via the Management API.**

> **Docs only.** This file is written by an autonomous worker (file-only lane).
> It does not apply anything. Applying a migration is a **prod DB write** — a
> GATED action (see below). The DDL is authored + reviewed as a FILE here; the
> **LEADER runs it on prod only after Jeff's explicit, per-migration go.**
>
> Companion docs (do not duplicate — cross-reference):
> - Phased release order + rollback table: `deploy-prep/deploy-runbook.md`
> - Read-only PRE/POST probe pack for 060/061/062: `deploy-prep/migration-verify.sql`
> - Drift gate (read-only, same Mgmt-API shape): `platform/scripts/reconcile-tenant-config.mjs`
> - Rationale for the DB changes: ADR `0004-tenantdb-adoption.md`, `0005-rls-defense-in-depth.md`

## GATED ACTIONS (Jeff-approval required, each time, individually)
1. **Any prod DB write** — apply a migration, run a backfill, create/drop an index, GRANT/REVOKE.
2. `git push` to `main`.
3. Deploy to prod.

Everything else here — authoring the DDL file, peer review, running the
**read-only** PRE/POST/dup probes — is non-gated.

---

## THE PROCEDURE (per migration, in order)

### 1. Author the migration as a file
- One migration = one file. Numbered files live in `platform/src/lib/migrations/NNN_*.sql`
  (e.g. `062_add_tenant_id_inbound_emails.sql`); dated data migrations in
  `platform/migrations/YYYY_MM_DD_*.sql`.
- **Make it idempotent** wherever possible: `ADD COLUMN IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, `CREATE ... IF NOT EXISTS`. A re-run must be a
  no-op, never an error.
- No destructive step (`DROP`, `TRUNCATE`, un-guarded `UPDATE`/`DELETE`) without
  an explicit, reviewed reason and a stated rollback.

### 2. Peer review
- A second worker/human reads the DDL against the live code it must match
  (e.g. 061's dedup key must equal `ledger.ts journalEntryExists()`:
  `(tenant_id, source, source_id)`).
- Author (in `migration-verify.sql` or alongside the file) the **PRE** gate and
  the **POST** assertion so "did it land correctly?" is a query, not an opinion.

### 3. For an INDEX migration — run the DUP-PROBE FIRST (mandatory)
- `CREATE UNIQUE INDEX` fails the **whole** statement if the table already holds
  a colliding group. Run the dup-probe SELECT and confirm **ZERO rows** before
  applying. See `migration-verify.sql` → `061.PRE` (the reference dup-probe).
- If the probe returns any row: **HARD STOP.** Merge/delete the offending rows
  first; do not apply the index.
- `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY` **cannot run inside a
  transaction block or a multi-statement body.** Send it as its **own single
  statement** in its own Mgmt-API call (see the caveat under the curl shape).

### 4. Apply via the Supabase Management API (LEADER, after Jeff's go)
- Run the migration's **PRE** gate first. A PRE block that RAISEs EXCEPTION is a
  HARD STOP.
- Apply the DDL as **one migration per call.** Do not batch unrelated migrations.

### 5. Post-apply verify query
- Run the migration's **POST** assertion immediately. It must emit its
  `... POST OK` NOTICE with no EXCEPTION. If it RAISEs, the migration did not
  land as intended — stop and remediate (or roll back) before proceeding.
- For a backfill, re-run the POST informational count (e.g. 062's
  `unscoped_inbound_emails_remaining` → expect 0 after backfill).

### 6. Rollback pointer
- Every migration MUST have a stated rollback before it is applied. The
  authoritative per-change rollback table is in
  `deploy-prep/deploy-runbook.md` → **ROLLBACK QUICK-REFERENCE**. Do not
  invent a second one; add new rows there.

---

## THE MANAGEMENT API CALL SHAPE (exact)

The `database/query` endpoint executes SQL against prod (the SQL-editor backend):
multi-statement scripts and `DO` blocks are accepted — this is how
`migration-verify.sql` is meant to run. **On success it returns a JSON array**
of result rows; on error a JSON object with a `message` (this is exactly what
`reconcile-tenant-config.mjs` asserts with `Array.isArray(d)`).

```bash
# Token: env var first (CI secret), else ~/.env.local. NEVER echo/commit it.
# Project ref is fixed: cetnrttgtoajzjacfbhe
REF=cetnrttgtoajzjacfbhe
: "${SUPABASE_ACCESS_TOKEN_FULLLOOP:?set the token in the env, do not paste it inline}"

# Apply a migration file (jq -Rs reads the whole .sql into a JSON-escaped string):
jq -Rs '{query: .}' platform/src/lib/migrations/062_add_tenant_id_inbound_emails.sql \
  | curl -sS -X POST \
      "https://api.supabase.com/v1/projects/${REF}/database/query" \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN_FULLLOOP}" \
      -H "Content-Type: application/json" \
      --data @-

# Run a read-only probe inline (e.g. the 061 dup-probe or a POST block):
jq -Rs '{query: .}' <<'SQL' | curl -sS -X POST \
      "https://api.supabase.com/v1/projects/${REF}/database/query" \
      -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN_FULLLOOP}" \
      -H "Content-Type: application/json" \
      --data @-
SELECT 1;
SQL
```

**Notes / gotchas (real, not cargo-culted):**
- **`curl`, not python** — the python User-Agent is WAF-blocked on this endpoint
  (see `platform/JEFE-TRACKING-SCOPE.md`). Use `curl` or the Node `fetch` in the
  reconcile script.
- **Never echo the token.** Read it from `$SUPABASE_ACCESS_TOKEN_FULLLOOP` or
  `~/.env.local`; it is a Supabase Management-API PAT — full project control.
- **One migration per call.** Keep PRE / apply / POST as separate calls so a
  failure is unambiguous about which step broke.
- **Transaction wrapping is not guaranteed either way** — treat a multi-statement
  body as possibly-transactional. Anything that forbids running in a transaction
  (`CREATE/DROP INDEX CONCURRENTLY`, `ALTER TYPE ... ADD VALUE`) MUST be its own
  single-statement call. If unsure whether a concurrent build succeeded, verify
  with the POST assertion — do not assume exit-0 == landed.
- **Success check:** parse the response as JSON and confirm it is an **array**.
  A non-array response is an error; surface its `message`, do not proceed.

---

## ORDERED PART-0 MIGRATION LIST

The Part-0 (WAVE-2 isolation/auth) release, in DB-apply order. **File-status
column verified in this `p1-w3` worktree at authoring time** — only `062` is
authored here as a file; the rest are gated-prep or live on other worker
branches (`deploy-prep/deploy-runbook.md` → ARTIFACT LOCATIONS has the branch
map). Do not treat "listed here" as "file exists here."

| # | Migration | Kind | Index? dup-probe | Verify block | Rollback | File status (this worktree) |
|---|-----------|------|------------------|--------------|----------|-----------------------------|
| 0 | 055 add + 056 enforce + 057 freeze (`tenant_domains`); payout uniq idx `uq_payouts_tenant_booking`; RLS enable (15 tables) | mixed | payout idx already clean (0 rows) | — (verified live) | see deploy-runbook table | **ALREADY APPLIED — do not re-run.** RLS-enable file (`2026_07_11_enable_rls_gap_tables.sql`) on `p1-w2`, needs committing |
| 1 | **060** RPC lockdown — REVOKE EXECUTE on `post_journal_entry`, `cpa_token_bump_usage` from anon/authenticated/PUBLIC; keep service_role | GRANT/REVOKE | n/a | `060.PRE` gate + `060.POST` | re-`GRANT EXECUTE` to prior grantees (keep service_role) | **GATED-PREP — DDL not yet authored.** Probes exist in `migration-verify.sql` |
| 2 | **061** journal dedup unique index — partial `UNIQUE (tenant_id, source, source_id) WHERE source_id IS NOT NULL` | INDEX | **YES — 061 dup-probe MUST return 0 rows first** | `061.PRE` (dup-probe) + `061.POST` | `DROP INDEX CONCURRENTLY IF EXISTS <name>` (standalone call) | **GATED-PREP — DDL not yet authored.** Probes exist |
| 3 | **062** `inbound_emails.tenant_id` — nullable `uuid` FK→`tenants(id)` + leading index; then documented backfill | ADD COLUMN (idempotent) + backfill | n/a | `062.PRE` + `062.POST` + re-check unscoped count == 0 | leave column (nullable idempotent add) — no rollback needed | **FILE EXISTS:** `platform/src/lib/migrations/062_add_tenant_id_inbound_emails.sql` |
| 4 | Commit `2026_07_11_enable_rls_gap_tables.sql` (already RUN on prod) | file catch-up | n/a | reconcile/CI green | per-table `... DISABLE ROW LEVEL SECURITY` (defense-in-depth only; app is service-role) | **ABSENT here** — lives on `p1-w2`; **no new prod write**, file catch-up only |
| 5 | **058** `fix_nycmaid_routing` — correct `tenant_domains` routing_mode before the resolver flip | UPDATE (data) | n/a | pre-flip divergence probe clean | re-apply prior row values | **ABSENT here** — on `p1-w2` (Phase B prereq) |
| 6 | **059** `backfill_vercel_project` — populate `tenant_domains.vercel_project` | UPDATE (data) | n/a | reconcile: 0 `vercel_project=NULL` WARN | leave backfilled data (harmless) | **ABSENT here** — on `p1-w2` (Phase B prereq) |
| 7 | **owner_phone backfill** (`2026_07_11_owner_phone_backfill.sql`) — **Phase C prereq; 19 tenants have NULL `owner_phone`.** Deploying owner_phone gating before this **locks those owners out** | UPDATE (data) | n/a | confirm 0 NULL `owner_phone` for gated tenants | data safe to leave in place | **ABSENT here** — on `p1-w2` |
| 8 | **057_unfreeze** (`057_unfreeze_tenants_domain.sql`) — lift the `tenants.domain` write-freeze | ALTER (drop trigger) | n/a | writes to `tenants.domain` no longer RAISE | re-apply the freeze trigger | **ABSENT here** — on `p1-w2`. **POST-B ONLY:** run after Phase B is clean 24–48h, out of the A→D critical path |

**Ordering constraints that must NOT be reordered** (from the deploy-runbook Q3 rationale):
- 060 → 061 → 062 land together in **Phase A** (non-behavioral).
- 058/059 must be applied **before** the Phase B resolver flip — a wrong
  `routing_mode`/`vercel_project` row becomes a live mis-route the instant
  `tenant_domains` becomes authoritative.
- owner_phone backfill (#7) must be applied **before** the Phase C auth-behavior
  deploy, or the 19 NULL-`owner_phone` tenants' owners are locked out.
- 057_unfreeze (#8) is deliberately **after** the Phase B watch window — not part
  of the initial staged release.

---

## GO / NO-GO, ROLLBACK

Go/No-Go per phase and the full per-change rollback table live in
`deploy-prep/deploy-runbook.md` (Phases A–D + ROLLBACK QUICK-REFERENCE). This
runbook is the *how to apply one migration safely*; that file is the *what order
and when* for the Part-0 release. Keep them consistent — if a migration's
rollback changes, update the deploy-runbook table, not a copy here.
